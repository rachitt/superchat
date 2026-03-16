import "dotenv/config";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { appRouter, type AppRouter } from "./trpc/routers/index.js";
import { createContext } from "./trpc/context.js";
import { db, closeDb } from "./db/index.js";
import { auth } from "./lib/auth.js";
import { pubRedis, subRedis, closeRedis } from "./lib/redis.js";
import { setupSocketHandlers } from "./socket/index.js";
import { closeAllQueues } from "./workers/queue.js";
import logger from "./lib/logger.js";
import { AppError } from "./lib/errors.js";
import { getHealthStatus } from "./services/health.js";
import {
  httpRequestsTotal,
  httpRequestDuration,
  getMetrics,
} from "./lib/metrics.js";
import { apiGeneralLimiter } from "./lib/rate-limit.js";
import { setNotificationIO } from "./services/notifications.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_SECRET;

function parseOrigins(raw: string): string | string[] {
  const origins = raw.split(",").map((o) => o.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      ...(process.env.NODE_ENV === "development" && {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
    },
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
  });

  // ── Request tracing ──
  fastify.addHook("onRequest", async (request) => {
    request.headers["x-request-id"] = request.id;
  });

  // ── HTTP metrics ──
  fastify.addHook("onResponse", async (request, reply) => {
    const duration = reply.elapsedTime / 1000; // ms → seconds
    const path = request.routeOptions?.url || "unmatched";
    const labels = {
      method: request.method,
      path,
      status_code: String(reply.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe({ method: request.method, path }, duration);
  });

  // ── Security headers ──
  fastify.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "0");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    if (process.env.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  });

  // ── CORS ──
  const allowedOrigins = parseOrigins(FRONTEND_URL);
  await fastify.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // ── Better Auth ──
  fastify.all("/api/auth/*", async (req, reply) => {
    const url = new URL(req.url, `http://${req.hostname}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const body = req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined;
    const request = new Request(url, {
      method: req.method,
      headers,
      body,
    });
    const response = await auth.handler(request);
    response.headers.forEach((value, key) => {
      if (key === "set-cookie") return; // handled separately
      reply.header(key, value);
    });
    // Set-Cookie can have multiple values
    const cookies = response.headers.getSetCookie();
    for (const cookie of cookies) {
      reply.header("set-cookie", cookie);
    }
    reply.status(response.status).send(response.body);
  });

  // ── Per-IP rate limiting ──
  fastify.addHook("onRequest", async (req, reply) => {
    const ip = req.ip;
    const result = await apiGeneralLimiter.check(ip);
    if (result.limited) {
      return reply
        .status(429)
        .header("Retry-After", String(result.retryAfter ?? 60))
        .send({ error: "Too many requests", retryAfter: result.retryAfter });
    }
  });

  // ── tRPC ──
  await fastify.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: createContext(db, auth),
      onError: ({ path, error }) => {
        fastify.log.error({ path, cause: error.cause ?? undefined }, `tRPC error: ${error.message}`);
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  // ── Socket.IO ──
  const ioOptions: Record<string, unknown> = {
    cors: { origin: allowedOrigins, credentials: true },
  };

  // Only use Redis adapter if Redis is available
  try {
    await pubRedis.ping();
    ioOptions.adapter = createAdapter(pubRedis, subRedis);
    fastify.log.info("Socket.IO using Redis adapter");
  } catch {
    fastify.log.info("Socket.IO using in-memory adapter (Redis unavailable)");
  }

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    fastify.server,
    ioOptions as any
  );

  setupSocketHandlers(io, auth);
  setNotificationIO(io);

  // ── Error handler for non-tRPC routes ──
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      fastify.log.warn({ code: error.code, details: error.details }, error.message);
      reply.status(error.statusCode).send({ error: error.message, code: error.code });
    } else {
      fastify.log.error({ err: error }, "Unhandled request error");
      reply.status(500).send({ error: "Internal server error", code: "INTERNAL_ERROR" });
    }
  });

  // ── Health check (simple, for load balancers) ──
  fastify.get("/health", async () => ({ status: "ok" }));

  // ── Health check (detailed, optionally protected) ──
  fastify.get("/health/detailed", async (request, reply) => {
    if (HEALTH_CHECK_SECRET) {
      const secret = (request.query as Record<string, string>).secret;
      if (secret !== HEALTH_CHECK_SECRET) {
        reply.status(403).send({ error: "Forbidden" });
        return;
      }
    }
    const health = await getHealthStatus();
    const statusCode = health.status === "unhealthy" ? 503 : 200;
    reply.status(statusCode).send(health);
  });

  // ── Prometheus metrics ──
  fastify.get("/metrics", async (_request, reply) => {
    reply.header("Content-Type", "text/plain; version=0.0.4");
    return getMetrics();
  });

  // ── Graceful shutdown ──
  let isShuttingDown = false;
  async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info("Graceful shutdown initiated...");
    await fastify.close();
    io.close();
    await closeAllQueues();
    await closeRedis();
    await closeDb();
    logger.info("Shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // ── Start ──
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`Server running on port ${PORT}`);
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});

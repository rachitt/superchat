import "dotenv/config";
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

const PORT = parseInt(process.env.PORT || "4000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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
  });

  // ── CORS ──
  await fastify.register(cors, {
    origin: FRONTEND_URL,
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
    cors: { origin: FRONTEND_URL, credentials: true },
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

  // ── Health check ──
  fastify.get("/health", async () => ({ status: "ok" }));

  // ── Graceful shutdown ──
  async function shutdown() {
    fastify.log.info("Graceful shutdown initiated...");
    await fastify.close();
    io.close();
    await closeAllQueues();
    await closeRedis();
    await closeDb();
    fastify.log.info("Shutdown complete");
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

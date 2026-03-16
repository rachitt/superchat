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
import { db } from "./db/index.js";
import { auth } from "./lib/auth.js";
import { pubRedis, subRedis } from "./lib/redis.js";
import { setupSocketHandlers } from "./socket/index.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function main() {
  const fastify = Fastify({ logger: true });

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
        console.error(`tRPC error on ${path}:`, error.message, error.cause ?? "");
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
    console.log("Socket.IO using Redis adapter");
  } catch {
    console.log("Socket.IO using in-memory adapter (Redis unavailable)");
  }

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    fastify.server,
    ioOptions as any
  );

  setupSocketHandlers(io, auth);

  // ── Health check ──
  fastify.get("/health", async () => ({ status: "ok" }));

  // ── Start ──
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Server running on port ${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

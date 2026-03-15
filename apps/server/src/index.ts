import "dotenv/config";
import Fastify from "fastify";
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
import { pubRedis, subRedis } from "./lib/redis.js";
import { setupSocketHandlers } from "./socket/index.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function main() {
  const fastify = Fastify({ logger: true });

  // ── tRPC ──
  await fastify.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: createContext(db),
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  // ── Socket.IO ──
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    fastify.server,
    {
      cors: { origin: FRONTEND_URL, credentials: true },
      adapter: createAdapter(pubRedis, subRedis),
    }
  );

  setupSocketHandlers(io);

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

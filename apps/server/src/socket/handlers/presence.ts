import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { redis } from "../../lib/redis.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const TYPING_TTL = 5; // seconds

export function registerPresenceHandlers(io: IOServer, socket: IOSocket) {
  const userId = socket.data.userId as string;

  socket.on("typing:start", async ({ channelId }) => {
    await redis.setex(`typing:${channelId}:${userId}`, TYPING_TTL, "1");
    socket.to(`channel:${channelId}`).emit("typing:update", {
      channelId,
      userId,
      username: socket.data.username as string,
      isTyping: true,
    });
  });

  socket.on("typing:stop", async ({ channelId }) => {
    await redis.del(`typing:${channelId}:${userId}`);
    socket.to(`channel:${channelId}`).emit("typing:update", {
      channelId,
      userId,
      username: socket.data.username as string,
      isTyping: false,
    });
  });

  socket.on("channel:join", ({ channelId }) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on("channel:leave", ({ channelId }) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on("presence:update", async ({ status }) => {
    await redis.hset(`presence:${userId}`, "status", status);
    // Broadcast to all workspaces the user is in
    socket.broadcast.emit("presence:changed", { userId, status });
  });

  socket.on("disconnect", async () => {
    await redis.hset(`presence:${userId}`, "status", "offline");
    socket.broadcast.emit("presence:changed", { userId, status: "offline" });
  });
}

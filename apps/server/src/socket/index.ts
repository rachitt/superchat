import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { registerMessageHandlers } from "./handlers/message.js";
import { registerPresenceHandlers } from "./handlers/presence.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: IOServer) {
  io.use(async (socket, next) => {
    // TODO: Validate Better Auth session from handshake
    const userId = socket.handshake.auth.userId as string | undefined;
    if (!userId) {
      return next(new Error("Authentication required"));
    }
    socket.data.userId = userId;
    socket.data.username = socket.handshake.auth.username;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
  });
}

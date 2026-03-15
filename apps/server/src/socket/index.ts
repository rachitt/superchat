import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import type { auth as Auth } from "../lib/auth.js";
import { registerMessageHandlers } from "./handlers/message.js";
import { registerPresenceHandlers } from "./handlers/presence.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: IOServer, auth: typeof Auth) {
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("Authentication required"));
      }

      const headers = new Headers();
      headers.set("cookie", cookieHeader);
      const session = await auth.api.getSession({ headers });

      if (!session?.user) {
        return next(new Error("Authentication required"));
      }

      socket.data.userId = session.user.id;
      socket.data.username = session.user.name;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
  });
}

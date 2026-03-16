import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import type { auth as Auth } from "../lib/auth.js";
import { registerMessageHandlers } from "./handlers/message.js";
import { registerPresenceHandlers } from "./handlers/presence.js";
import { registerAiHandlers } from "./handlers/ai.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: IOServer, auth: typeof Auth) {
  io.use(async (socket, next) => {
    try {
      // Try cookie-based auth first
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const headers = new Headers();
        headers.set("cookie", cookieHeader);
        const session = await auth.api.getSession({ headers });
        if (session?.user) {
          socket.data.userId = session.user.id;
          socket.data.username = session.user.name;
          return next();
        }
      }

      // Fall back to token-based auth from handshake
      const token = socket.handshake.auth.token as string | undefined;
      if (token) {
        const headers = new Headers();
        headers.set("cookie", `better-auth.session_token=${token}`);
        const session = await auth.api.getSession({ headers });
        if (session?.user) {
          socket.data.userId = session.user.id;
          socket.data.username = session.user.name;
          return next();
        }
      }

      next(new Error("Authentication required"));
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerAiHandlers(io, socket);
  });
}

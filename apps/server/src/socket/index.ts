import { randomUUID } from "node:crypto";
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import type { auth as Auth } from "../lib/auth.js";
import { createChildLogger } from "../lib/logger.js";
import { websocketConnectionsActive, websocketEventsTotal } from "../lib/metrics.js";
import { registerMessageHandlers } from "./handlers/message.js";
import { registerPresenceHandlers } from "./handlers/presence.js";
import { registerAiHandlers } from "./handlers/ai.js";
import { registerGameHandlers } from "./handlers/game.js";
import { registerLivingHandlers } from "./handlers/living.js";
import { socketMessageLimiter } from "../lib/rate-limit.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

const log = createChildLogger({ module: "socket" });

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
          log.info({ user: session.user.name }, "Authenticated via cookie");
          return next();
        }
      }

      // Fall back to token-based auth from handshake
      const token = socket.handshake.auth.token as string | undefined;
      if (token) {
        // Try multiple cookie names that Better Auth might use
        for (const cookieName of ["better-auth.session_token", "better-auth.session_token.0"]) {
          const headers = new Headers();
          headers.set("cookie", `${cookieName}=${token}`);
          const session = await auth.api.getSession({ headers });
          if (session?.user) {
            socket.data.userId = session.user.id;
            socket.data.username = session.user.name;
            log.info({ user: session.user.name }, "Authenticated via token");
            return next();
          }
        }
      }

      log.info({ hasCookie: !!cookieHeader, hasToken: !!token }, "Auth failed");
      next(new Error("Authentication required"));
    } catch (err) {
      log.error({ err }, "Auth error");
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const connectionId = randomUUID();
    socket.data.connectionId = connectionId;

    const connLog = log.child({ connectionId, userId });
    connLog.info({ username: socket.data.username }, "Connected");
    socket.join(`user:${userId}`);

    websocketConnectionsActive.inc();

    // Track events
    socket.onAny((eventName: string, ...args: unknown[]) => {
      connLog.info({ event: eventName }, "Socket event received");
      websocketEventsTotal.inc({ event_name: eventName });
    });

    // Per-socket rate limiting on message:send
    socket.use(async ([event], next) => {
      if (event === "message:send") {
        const result = await socketMessageLimiter.check(userId);
        if (result.limited) {
          next(new Error("Rate limit exceeded. Please slow down."));
          return;
        }
      }
      next();
    });

    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerAiHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerLivingHandlers(io, socket);

    socket.on("disconnect", () => {
      websocketConnectionsActive.dec();
      connLog.info("Disconnected");
    });
  });
}

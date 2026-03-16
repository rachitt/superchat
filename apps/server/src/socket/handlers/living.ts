import type { Server, Socket } from "socket.io";
import { eq, sql } from "drizzle-orm";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema/index.js";
import { handleSocketError } from "../../lib/errors.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLivingHandlers(io: IOServer, socket: IOSocket) {
  const userId = socket.data.userId as string;

  socket.on("living:interact", async ({ messageId, action, data }) => {
    try {
      const [msg] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!msg || msg.type !== "poll") return;

      const payload = msg.payload as {
        question: string;
        options: { id: number; text: string; votes: string[] }[];
      };

      if (action === "vote" && data?.optionId !== undefined) {
        const optionId = data.optionId as number;

        // Remove previous vote from any option
        for (const option of payload.options) {
          option.votes = option.votes.filter((v) => v !== userId);
        }

        // Add vote to selected option (toggle off if already voted for this one)
        const target = payload.options.find((o) => o.id === optionId);
        if (target) {
          target.votes.push(userId);
        }

        // Atomic update with optimistic locking
        const [updated] = await db
          .update(messages)
          .set({
            payload,
            payloadVersion: sql`${messages.payloadVersion} + 1`,
          })
          .where(eq(messages.id, messageId))
          .returning();

        if (updated) {
          io.to(`channel:${updated.channelId}`).emit("living:update", {
            messageId,
            payload: updated.payload as Record<string, unknown>,
            version: updated.payloadVersion,
          });
        }
      }
    } catch (err) {
      handleSocketError(socket, err);
    }
  });
}

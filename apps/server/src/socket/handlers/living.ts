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

      if (!msg) return;

      const payload = msg.payload as Record<string, unknown>;

      // ── Poll interactions ──
      if (msg.type === "poll" && action === "vote" && data?.optionId !== undefined) {
        const pollPayload = payload as {
          question: string;
          options: { id: number; text: string; votes: string[] }[];
        };
        const optionId = data.optionId as number;

        for (const option of pollPayload.options) {
          option.votes = option.votes.filter((v) => v !== userId);
        }

        const target = pollPayload.options.find((o) => o.id === optionId);
        if (target) {
          target.votes.push(userId);
        }

        await broadcastPayloadUpdate(io, messageId, pollPayload);
        return;
      }

      // ── Live score interactions ──
      if (msg.type === "live_score") {
        const scorePayload = payload as {
          title: string;
          teams: { name: string; score: number; color?: string }[];
          status: "live" | "finished";
          lastUpdate?: string;
        };

        if (action === "update_score" && data?.teamIndex !== undefined && data?.score !== undefined) {
          const teamIndex = data.teamIndex as number;
          const score = data.score as number;
          if (teamIndex >= 0 && teamIndex < scorePayload.teams.length) {
            scorePayload.teams[teamIndex].score = score;
            scorePayload.lastUpdate = new Date().toISOString();
            await broadcastPayloadUpdate(io, messageId, scorePayload);
          }
          return;
        }

        if (action === "increment_score" && data?.teamIndex !== undefined) {
          const teamIndex = data.teamIndex as number;
          const amount = (data.amount as number) || 1;
          if (teamIndex >= 0 && teamIndex < scorePayload.teams.length) {
            scorePayload.teams[teamIndex].score += amount;
            scorePayload.lastUpdate = new Date().toISOString();
            await broadcastPayloadUpdate(io, messageId, scorePayload);
          }
          return;
        }

        if (action === "finish") {
          scorePayload.status = "finished";
          scorePayload.lastUpdate = new Date().toISOString();
          await broadcastPayloadUpdate(io, messageId, scorePayload);
          return;
        }
      }

      // ── Whiteboard interactions ──
      if (msg.type === "whiteboard" && action === "draw") {
        const shapes = (data?.shapes ?? {}) as Record<string, unknown>;
        const updatedPayload = { ...payload, shapes };

        // Broadcast immediately for real-time collaboration (excludes sender)
        socket.to(`channel:${msg.channelId}`).emit("living:update", {
          messageId,
          payload: updatedPayload,
          version: msg.payloadVersion + 1,
        });

        // Persist to DB only when explicitly requested (debounced on client)
        if (data?.persist) {
          await db
            .update(messages)
            .set({
              payload: updatedPayload,
              payloadVersion: sql`${messages.payloadVersion} + 1`,
            })
            .where(eq(messages.id, messageId));
        }
        return;
      }

      // ── Dynamic card interactions ──
      if (msg.type === "dynamic_card" && action === "update_field" && data?.fields) {
        const cardPayload = payload as {
          title: string;
          description?: string;
          imageUrl?: string;
          linkUrl?: string;
          linkLabel?: string;
          color?: string;
          fields?: { label: string; value: string }[];
        };
        cardPayload.fields = data.fields as { label: string; value: string }[];
        await broadcastPayloadUpdate(io, messageId, cardPayload);
        return;
      }
    } catch (err) {
      handleSocketError(socket, err);
    }
  });
}

async function broadcastPayloadUpdate(
  io: IOServer,
  messageId: string,
  payload: Record<string, unknown>
) {
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

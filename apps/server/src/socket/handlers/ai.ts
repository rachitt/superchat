import type { Server, Socket } from "socket.io";
import { eq } from "drizzle-orm";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { AI_BOT_NAME } from "@superchat/shared";
import { streamAiChat } from "../../services/ai.js";
import { db } from "../../db/index.js";
import { messages, user as users } from "../../db/schema/index.js";
import { checkAiRateLimit } from "../../lib/rate-limit.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Track active AI streams so they can be cancelled */
const activeStreams = new Map<string, AbortController>();

export function registerAiHandlers(io: IOServer, socket: IOSocket) {
  const userId = socket.data.userId as string;

  socket.on("ai:chat", async ({ channelId, message, parentId }) => {
    // Rate limit check
    const rateLimit = await checkAiRateLimit(userId);
    if (rateLimit.limited) {
      socket.emit("ai:stream:error", {
        channelId,
        error: rateLimit.message,
      });
      return;
    }

    // Get user info for context
    const [author] = await db
      .select({ name: users.name, username: users.username })
      .from(users)
      .where(eq(users.id, userId));

    const userName = author?.name ?? author?.username ?? "User";

    // Create a placeholder bot message in the database
    const [botMessage] = await db
      .insert(messages)
      .values({
        channelId,
        authorId: userId, // attributed to the asking user but type=system marks it as bot
        type: "system",
        content: "", // will be updated when streaming completes
        parentId: parentId ?? null,
      })
      .returning();

    const messageId = botMessage.id;

    // Broadcast bot message start to channel
    io.to(`channel:${channelId}`).emit("message:new", {
      id: messageId,
      channelId,
      authorId: userId,
      type: "system",
      content: "",
      parentId: parentId ?? null,
      createdAt: botMessage.createdAt.toISOString(),
    });

    // Set up cancellation
    const abortController = new AbortController();
    activeStreams.set(messageId, abortController);

    // Timeout to prevent hung streams
    const STREAM_TIMEOUT_MS = 30_000;
    const timeout = setTimeout(() => abortController.abort(), STREAM_TIMEOUT_MS);

    try {
      const result = await streamAiChat({ channelId, userMessage: message, userName });

      let fullContent = "";

      for await (const chunk of result.textStream) {
        if (abortController.signal.aborted) break;

        fullContent += chunk;
        io.to(`channel:${channelId}`).emit("ai:stream", {
          channelId,
          messageId,
          chunk,
        });
      }

      clearTimeout(timeout);

      if (abortController.signal.aborted) {
        const timeoutMsg = "AI response timed out after 30 seconds.";
        await db
          .update(messages)
          .set({ content: fullContent ? `${fullContent}\n\n(${timeoutMsg})` : timeoutMsg })
          .where(eq(messages.id, messageId));

        io.to(`channel:${channelId}`).emit("ai:stream:error", {
          channelId,
          messageId,
          error: timeoutMsg,
        });
        return;
      }

      // Update the message in the database with the full content
      await db
        .update(messages)
        .set({ content: fullContent || "(No response generated)" })
        .where(eq(messages.id, messageId));

      io.to(`channel:${channelId}`).emit("ai:stream:done", {
        channelId,
        messageId,
        content: fullContent,
      });
    } catch (err) {
      clearTimeout(timeout);
      const errorMessage = err instanceof Error ? err.message : "AI generation failed";

      await db
        .update(messages)
        .set({ content: `Error: ${errorMessage}` })
        .where(eq(messages.id, messageId));

      io.to(`channel:${channelId}`).emit("ai:stream:error", {
        channelId,
        messageId,
        error: errorMessage,
      });
    } finally {
      activeStreams.delete(messageId);
    }
  });

  socket.on("ai:stop", ({ messageId }) => {
    const controller = activeStreams.get(messageId);
    if (controller) {
      controller.abort();
      activeStreams.delete(messageId);
    }
  });
}

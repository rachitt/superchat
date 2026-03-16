import type { Server, Socket } from "socket.io";
import { eq, and, desc, isNull } from "drizzle-orm";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { AI_BOT_NAME } from "@superchat/shared";
import { streamAiChat } from "../../services/ai.js";
import { db } from "../../db/index.js";
import { messages, user as users } from "../../db/schema/index.js";
import { channels } from "../../db/schema/channels.js";
import { checkAiRateLimit } from "../../lib/rate-limit.js";
import { buildAiTools } from "../../services/ai-tools.js";
import { getQueue } from "../../workers/queue.js";

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

    // Look up workspaceId from the channel
    const [channel] = await db
      .select({ workspaceId: channels.workspaceId })
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    const workspaceId = channel?.workspaceId;

    // Build AI tools with context
    const aiTools = buildAiTools({ channelId, userId, io });

    // Determine thread parentId:
    // If the caller already specified a parentId (continuing a thread), use it.
    // Otherwise, find the user's message that triggered this AI chat to auto-thread.
    // Retry briefly since message:send and ai:chat are emitted back-to-back and
    // Socket.IO doesn't await async handlers — the message may not be in the DB yet.
    let threadParentId = parentId ?? null;
    if (!threadParentId) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const [userMsg] = await db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.channelId, channelId),
              eq(messages.authorId, userId),
              eq(messages.type, "text"),
              isNull(messages.deletedAt)
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);
        if (userMsg) {
          threadParentId = userMsg.id;
          break;
        }
        // Wait briefly for the message:send handler to finish inserting
        if (attempt < 2) await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Create a placeholder bot message in the database
    const [botMessage] = await db
      .insert(messages)
      .values({
        channelId,
        authorId: userId, // attributed to the asking user but type=system marks it as bot
        type: "system",
        content: "", // will be updated when streaming completes
        parentId: threadParentId,
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
      parentId: threadParentId,
      createdAt: botMessage.createdAt.toISOString(),
    });

    // Set up cancellation
    const abortController = new AbortController();
    activeStreams.set(messageId, abortController);

    // Timeout to prevent hung streams
    const STREAM_TIMEOUT_MS = 30_000;
    const timeout = setTimeout(() => abortController.abort(), STREAM_TIMEOUT_MS);

    try {
      const result = await streamAiChat({
        channelId,
        userMessage: message,
        userName,
        userId,
        workspaceId,
        tools: aiTools,
      });

      let fullContent = "";

      for await (const chunk of result.fullStream) {
        if (abortController.signal.aborted) break;

        if (chunk.type === "text-delta") {
          fullContent += chunk.textDelta;
          io.to(`channel:${channelId}`).emit("ai:stream", {
            channelId,
            messageId,
            chunk: chunk.textDelta,
            parentId: threadParentId,
          });
        } else if (chunk.type === "tool-result") {
          io.to(`channel:${channelId}`).emit("ai:tool_call", {
            channelId,
            messageId,
            toolName: chunk.toolName,
            args: chunk.args as Record<string, unknown>,
            result: chunk.result,
          });
        }
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
        parentId: threadParentId,
      });

      // Enqueue memory extraction in the background
      if (workspaceId && fullContent) {
        const conversationText = `User (${userName}): ${message}\nAssistant: ${fullContent}`;
        getQueue("ai-memory").add("extract", {
          conversationText,
          userId,
          workspaceId,
        });
      }
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

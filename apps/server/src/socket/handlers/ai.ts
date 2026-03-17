import type { Server, Socket } from "socket.io";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { AI_BOT_NAME } from "@superchat/shared";
import { streamAiChat } from "../../services/ai.js";
import { db } from "../../db/index.js";
import { messages, user as users } from "../../db/schema/index.js";
import { channels } from "../../db/schema/channels.js";
import { checkAiRateLimit } from "../../lib/rate-limit.js";
import { AppError, ErrorCode } from "../../lib/errors.js";
import { createChildLogger } from "../../lib/logger.js";
import { aiRequestsTotal, aiRequestDuration } from "../../lib/metrics.js";
import { buildAiTools } from "../../services/ai-tools.js";
import { getQueue } from "../../workers/queue.js";

const log = createChildLogger({ module: "ai" });

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Track active AI streams so they can be cancelled */
const activeStreams = new Map<string, AbortController>();

export function registerAiHandlers(io: IOServer, socket: IOSocket) {
  const userId = socket.data.userId as string;

  socket.on("ai:chat", async ({ channelId, message, parentId }) => {
    log.info({ channelId, userId, message: message?.slice(0, 50) }, "ai:chat received");
    try {
    // Rate limit check
    log.info("checking rate limit");
    const rateLimit = await checkAiRateLimit(userId);
    log.info({ limited: rateLimit.limited }, "rate limit checked");
    if (rateLimit.limited) {
      log.warn({ userId, channelId }, "AI rate limit exceeded");
      socket.emit("ai:stream:error", {
        channelId,
        error: rateLimit.message,
      });
      return;
    }

    const aiStart = Date.now();

    // Get user info for context
    log.info("fetching author");
    const [author] = await db
      .select({ name: users.name, username: users.username })
      .from(users)
      .where(eq(users.id, userId));
    log.info({ userName: author?.name }, "author fetched");

    const userName = author?.name ?? author?.username ?? "User";

    // Look up workspaceId from the channel
    log.info("fetching channel");
    const [channel] = await db
      .select({ workspaceId: channels.workspaceId })
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);
    log.info({ workspaceId: channel?.workspaceId }, "channel fetched");

    const workspaceId = channel?.workspaceId;

    // Build AI tools with context
    const aiTools = buildAiTools({ channelId, userId, io });
    log.info("tools built");

    // Use provided parentId or null (no auto-threading for now)
    const threadParentId = parentId ?? null;

    // Create a placeholder bot message in the database
    // Use DB now() + interval to guarantee ordering after the user's message
    log.info("inserting bot message");
    const [botMessage] = await db
      .insert(messages)
      .values({
        channelId,
        authorId: userId,
        type: "system",
        content: "",
        parentId: threadParentId,
        createdAt: sql`now() + interval '2 seconds'`,
      })
      .returning({
        id: messages.id,
        channelId: messages.channelId,
        authorId: messages.authorId,
        type: messages.type,
        content: messages.content,
        parentId: messages.parentId,
        createdAt: messages.createdAt,
      });
    log.info({ messageId: botMessage.id }, "bot message inserted");

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
    const STREAM_TIMEOUT_MS = 120_000; // 2 min for thinking models
    const timeout = setTimeout(() => abortController.abort(), STREAM_TIMEOUT_MS);

    try {
      log.info("calling streamAiChat");
      const result = await streamAiChat({
        channelId,
        userMessage: message,
        userName,
        userId,
        workspaceId,
        tools: aiTools,
      });
      log.info("streamAiChat returned, iterating stream");

      let fullContent = "";
      const executedTools = new Set<string>();
      const toolResults = new Map<string, unknown>();

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
        } else if (chunk.type === "tool-call") {
          log.info({ toolName: chunk.toolName, args: chunk.args }, "AI tool call");
        } else if (chunk.type === "tool-result") {
          // Deduplicate by tool name (prevents double createPoll/startGame across steps)
          if (!executedTools.has(chunk.toolName)) {
            executedTools.add(chunk.toolName);
            toolResults.set(chunk.toolName, chunk.result);
            log.info({ toolName: chunk.toolName, result: chunk.result }, "AI tool result");
            io.to(`channel:${channelId}`).emit("ai:tool_call", {
              channelId,
              messageId,
              toolName: chunk.toolName,
              args: chunk.args as Record<string, unknown>,
              result: chunk.result,
            });
          } else {
            log.info({ toolName: chunk.toolName }, "Skipping duplicate tool call");
          }
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

        aiRequestsTotal.inc({ status: "timeout" });
        aiRequestDuration.observe({}, (Date.now() - aiStart) / 1000);
        return;
      }

      // Update the message in the database with the full content
      // If tools were called but no text generated, create a summary
      let finalContent = fullContent;
      if (!finalContent && executedTools.size > 0) {
        const parts: string[] = [];
        for (const toolName of executedTools) {
          const result = toolResults.get(toolName) as Record<string, unknown> | undefined;
          switch (toolName) {
            case "createPoll":
              parts.push("Here's your poll!");
              break;
            case "startGame": {
              const gameType = (result?.gameType as string) ?? "game";
              parts.push(`Started a ${gameType} game — check the game panel! 🎮`);
              break;
            }
            case "getCurrentTime": {
              const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
              parts.push(`It's currently ${now}.`);
              break;
            }
            case "searchMessages": {
              const count = (result as any)?.count ?? 0;
              parts.push(count > 0 ? `Found ${count} message${count !== 1 ? "s" : ""}.` : "No messages found.");
              break;
            }
            case "pinMessage":
              parts.push((result as any)?.pinned ? "Message pinned!" : "Message unpinned.");
              break;
            case "generateImage":
              parts.push((result as any)?.success ? "Here's your generated image!" : `Image generation failed: ${(result as any)?.error}`);
              break;
            default:
              parts.push(`Done.`);
          }
        }
        finalContent = parts.join(" ");
      }
      await db
        .update(messages)
        .set({ content: finalContent || "(No response generated)" })
        .where(eq(messages.id, messageId));

      io.to(`channel:${channelId}`).emit("ai:stream:done", {
        channelId,
        messageId,
        content: finalContent || fullContent,
        parentId: threadParentId,
      });

      aiRequestsTotal.inc({ status: "success" });
      aiRequestDuration.observe({}, (Date.now() - aiStart) / 1000);

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
      log.error({ err, channelId, messageId }, "AI stream failed");
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

      aiRequestsTotal.inc({ status: "error" });
      aiRequestDuration.observe({}, (Date.now() - aiStart) / 1000);
    } finally {
      activeStreams.delete(messageId);
    }
    } catch (outerErr) {
      log.error({ err: outerErr, channelId }, "ai:chat handler crashed");
      socket.emit("ai:stream:error", { channelId, error: "AI handler crashed unexpectedly" });
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

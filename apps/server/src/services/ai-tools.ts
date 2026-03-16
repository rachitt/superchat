import { tool } from "ai";
import { z } from "zod";
import { eq, and, desc, isNull, like, sql } from "drizzle-orm";
import type { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@superchat/shared";
import { db } from "../db/index.js";
import { messages } from "../db/schema/messages.js";
import { user as users } from "../db/schema/auth.js";
import { games } from "../db/schema/games.js";
import { channels } from "../db/schema/channels.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

interface ToolContext {
  channelId: string;
  userId: string;
  io: IOServer;
}

/**
 * Build Vercel AI SDK tool definitions that SuperBot can invoke.
 */
export function buildAiTools(ctx: ToolContext) {
  // Guard against duplicate tool execution across multi-step calls
  const executed = new Set<string>();
  function once<T>(name: string, fn: () => Promise<T>): Promise<T | { skipped: true }> {
    if (executed.has(name)) return Promise.resolve({ skipped: true });
    executed.add(name);
    return fn();
  }

  const createPoll = tool({
    description: "Create a poll in the current channel for users to vote on",
    inputSchema: z.object({
      question: z.string().describe("The poll question"),
      options: z
        .array(z.string())
        .min(2)
        .max(10)
        .describe("Poll answer options"),
    }),
    execute: async ({ question, options }: { question: string; options: string[] }) => {
      return once("createPoll", async () => {
      const payload = {
        question,
        options: options.map((text: string, i: number) => ({ id: i, text, votes: [] as string[] })),
      };

      const [msg] = await db
        .insert(messages)
        .values({
          channelId: ctx.channelId,
          authorId: ctx.userId,
          type: "poll",
          content: question,
          payload,
          createdAt: sql`now() + interval '3 seconds'`,
        })
        .returning();

      ctx.io.to(`channel:${ctx.channelId}`).emit("message:new", {
        id: msg.id,
        channelId: msg.channelId,
        authorId: msg.authorId,
        type: msg.type as any,
        content: msg.content,
        payload: msg.payload as Record<string, unknown>,
        payloadVersion: msg.payloadVersion,
        parentId: msg.parentId,
        createdAt: msg.createdAt.toISOString(),
      });

      return { success: true, messageId: msg.id, question };
      });
    },
  });

  const startGame = tool({
    description: "Start a new game in the current channel (trivia, wordle, tic_tac_toe, or cards)",
    inputSchema: z.object({
      gameType: z
        .enum(["trivia", "wordle", "tic_tac_toe", "cards"])
        .describe("Type of game to start"),
    }),
    execute: async ({ gameType }: { gameType: "trivia" | "wordle" | "tic_tac_toe" | "cards" }) => {
      return once("startGame", async () => {
      const [channel] = await db
        .select({ workspaceId: channels.workspaceId })
        .from(channels)
        .where(eq(channels.id, ctx.channelId))
        .limit(1);

      if (!channel) return { success: false as const, error: "Channel not found" };

      // Cancel any existing waiting games in this channel
      await db
        .update(games)
        .set({ status: "finished" })
        .where(and(eq(games.channelId, ctx.channelId), eq(games.status, "waiting")));

      const [game] = await db
        .insert(games)
        .values({
          workspaceId: channel.workspaceId,
          channelId: ctx.channelId,
          gameType,
          status: "waiting",
          config: {},
          state: {},
          createdBy: ctx.userId,
        })
        .returning();

      ctx.io.to(`channel:${ctx.channelId}`).emit("game:created", {
        game: {
          id: game.id,
          workspaceId: game.workspaceId,
          channelId: game.channelId,
          gameType: game.gameType as any,
          status: game.status as any,
          config: game.config as any,
          state: game.state as any,
          createdBy: game.createdBy,
          startedAt: game.startedAt?.toISOString() ?? null,
          finishedAt: game.finishedAt?.toISOString() ?? null,
          createdAt: game.createdAt.toISOString(),
        },
        players: [],
      });

      return { success: true, gameId: game.id, gameType };
      });
    },
  });

  const searchMessages = tool({
    description: "Search messages in the current channel by keyword",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      limit: z.number().min(1).max(20).default(10).describe("Max results"),
    }),
    execute: async ({ query, limit }: { query: string; limit: number }) => {
      const results = await db
        .select({
          id: messages.id,
          content: messages.content,
          authorName: users.name,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.authorId))
        .where(
          and(
            eq(messages.channelId, ctx.channelId),
            isNull(messages.deletedAt),
            like(messages.content, `%${query}%`)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      return {
        count: results.length,
        messages: results.map((r) => ({
          id: r.id,
          content: r.content,
          author: r.authorName,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    },
  });

  const pinMessage = tool({
    description: "Pin or unpin a message by its ID",
    inputSchema: z.object({
      messageId: z.string().uuid().describe("ID of the message to pin/unpin"),
      pin: z.boolean().default(true).describe("true to pin, false to unpin"),
    }),
    execute: async ({ messageId, pin }: { messageId: string; pin: boolean }) => {
      const [updated] = await db
        .update(messages)
        .set({ isPinned: pin })
        .where(and(eq(messages.id, messageId), eq(messages.channelId, ctx.channelId)))
        .returning();

      if (!updated) return { success: false as const, error: "Message not found in this channel" };

      return { success: true, messageId, pinned: pin };
    },
  });

  const getCurrentTime = tool({
    description: "Get the current date and time",
    inputSchema: z.object({}),
    execute: async () => {
      return { currentTime: new Date().toISOString() };
    },
  });

  return { createPoll, startGame, searchMessages, pinMessage, getCurrentTime };
}

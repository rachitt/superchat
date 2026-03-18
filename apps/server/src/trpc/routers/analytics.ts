import { z } from "zod";
import { sql, eq, and, count, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc.js";
import { messages } from "../../db/schema/messages.js";
import { channels } from "../../db/schema/channels.js";
import { games } from "../../db/schema/games.js";

export const analyticsRouter = router({
  messagesPerDay: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          date: sql<string>`date_trunc('day', ${messages.createdAt})::date`.as("date"),
          count: count().as("count"),
        })
        .from(messages)
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(
          and(
            eq(channels.workspaceId, input.workspaceId),
            sql`${messages.createdAt} > now() - interval '30 days'`,
          ),
        )
        .groupBy(sql`date_trunc('day', ${messages.createdAt})::date`)
        .orderBy(sql`date_trunc('day', ${messages.createdAt})::date`);

      return rows.map((r) => ({ date: String(r.date), count: Number(r.count) }));
    }),

  activeUsers: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          date: sql<string>`date_trunc('day', ${messages.createdAt})::date`.as("date"),
          count: sql<number>`count(distinct ${messages.authorId})`.as("count"),
        })
        .from(messages)
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(
          and(
            eq(channels.workspaceId, input.workspaceId),
            sql`${messages.createdAt} > now() - interval '30 days'`,
          ),
        )
        .groupBy(sql`date_trunc('day', ${messages.createdAt})::date`)
        .orderBy(sql`date_trunc('day', ${messages.createdAt})::date`);

      return rows.map((r) => ({ date: String(r.date), count: Number(r.count) }));
    }),

  topChannels: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          channelId: channels.id,
          channelName: channels.name,
          count: count().as("count"),
        })
        .from(messages)
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(
          and(
            eq(channels.workspaceId, input.workspaceId),
            sql`${messages.createdAt} > now() - interval '30 days'`,
          ),
        )
        .groupBy(channels.id, channels.name)
        .orderBy(desc(count()))
        .limit(10);

      return rows.map((r) => ({
        channelId: r.channelId,
        name: r.channelName,
        count: Number(r.count),
      }));
    }),

  aiStats: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ count: count().as("count") })
        .from(messages)
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(
          and(
            eq(channels.workspaceId, input.workspaceId),
            eq(messages.type, "system"),
            sql`${messages.createdAt} > now() - interval '30 days'`,
          ),
        );

      return { totalAiMessages: Number(result?.count ?? 0) };
    }),

  gameStats: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          status: games.status,
          count: count().as("count"),
        })
        .from(games)
        .where(eq(games.workspaceId, input.workspaceId))
        .groupBy(games.status);

      const stats: Record<string, number> = {};
      for (const r of rows) {
        stats[r.status] = Number(r.count);
      }

      return {
        total: Object.values(stats).reduce((a, b) => a + b, 0),
        completed: stats["finished"] ?? 0,
        active: stats["active"] ?? 0,
        waiting: stats["waiting"] ?? 0,
      };
    }),
});

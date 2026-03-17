import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { bookmarks, messages, user as users } from "../../db/schema/index.js";
import { channels } from "../../db/schema/channels.js";

export const bookmarkRouter = router({
  toggle: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, ctx.userId),
            eq(bookmarks.messageId, input.messageId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .delete(bookmarks)
          .where(
            and(
              eq(bookmarks.userId, ctx.userId),
              eq(bookmarks.messageId, input.messageId)
            )
          );
        return { bookmarked: false };
      }

      await ctx.db.insert(bookmarks).values({
        userId: ctx.userId,
        messageId: input.messageId,
      });
      return { bookmarked: true };
    }),

  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().datetime().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(bookmarks.userId, ctx.userId)];

      const result = await ctx.db
        .select({
          bookmark: bookmarks,
          message: messages,
          author: {
            id: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
          },
          channel: {
            id: channels.id,
            name: channels.name,
          },
        })
        .from(bookmarks)
        .innerJoin(messages, eq(messages.id, bookmarks.messageId))
        .innerJoin(users, eq(users.id, messages.authorId))
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(and(...conditions))
        .orderBy(desc(bookmarks.createdAt))
        .limit(input.limit + 1);

      const hasMore = result.length > input.limit;
      const items = hasMore ? result.slice(0, -1) : result;
      const nextCursor = hasMore
        ? items[items.length - 1].bookmark.createdAt.toISOString()
        : undefined;

      return { items, nextCursor };
    }),

  update: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        note: z.string().max(500).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(bookmarks)
        .set({ note: input.note })
        .where(
          and(
            eq(bookmarks.userId, ctx.userId),
            eq(bookmarks.messageId, input.messageId)
          )
        );
      return { success: true };
    }),

  isBookmarked: protectedProcedure
    .input(z.object({ messageIds: z.array(z.string().uuid()) }))
    .query(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return {};
      const results = await ctx.db
        .select({ messageId: bookmarks.messageId })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, ctx.userId),
          )
        );
      const set = new Set(results.map((r) => r.messageId));
      const map: Record<string, boolean> = {};
      for (const id of input.messageIds) {
        map[id] = set.has(id);
      }
      return map;
    }),
});

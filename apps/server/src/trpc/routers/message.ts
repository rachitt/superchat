import { z } from "zod";
import { eq, desc, lt, and, isNull, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { messages, user as users, reactions, attachments } from "../../db/schema/index.js";
import { MESSAGES_PER_PAGE } from "@superchat/shared";
import { getIO } from "../../socket/index.js";

export const messageRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        cursor: z.string().datetime().optional(),
        limit: z.number().min(1).max(100).default(MESSAGES_PER_PAGE),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(messages.channelId, input.channelId),
        isNull(messages.deletedAt),
      ];

      if (input.cursor) {
        conditions.push(lt(messages.createdAt, new Date(input.cursor)));
      }

      const result = await ctx.db
        .select({
          message: messages,
          author: {
            id: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
          },
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.authorId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit + 1);

      const hasMore = result.length > input.limit;
      const items = hasMore ? result.slice(0, -1) : result;
      const nextCursor = hasMore
        ? items[items.length - 1].message.createdAt.toISOString()
        : undefined;

      return { items: items.reverse(), nextCursor };
    }),

  getThread: protectedProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          message: messages,
          author: {
            id: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
          },
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.authorId))
        .where(and(eq(messages.parentId, input.parentId), isNull(messages.deletedAt)))
        .orderBy(messages.createdAt);
    }),

  pin: protectedProcedure
    .input(z.object({ messageId: z.string().uuid(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(messages)
        .set({ isPinned: input.pinned })
        .where(eq(messages.id, input.messageId))
        .returning();

      if (updated) {
        try {
          const io = getIO();
          io.to(`channel:${updated.channelId}`).emit("message:pinned", {
            messageId: updated.id,
            channelId: updated.channelId,
            pinned: input.pinned,
          });
        } catch {
          // Socket not available in some contexts
        }
      }

      return { success: true };
    }),

  getPinned: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          message: messages,
          author: {
            id: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
          },
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.authorId))
        .where(
          and(
            eq(messages.channelId, input.channelId),
            eq(messages.isPinned, true),
            isNull(messages.deletedAt)
          )
        )
        .orderBy(desc(messages.createdAt));
    }),

  react: protectedProcedure
    .input(z.object({ messageId: z.string().uuid(), emoji: z.string().max(20) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.messageId, input.messageId),
            eq(reactions.userId, ctx.userId),
            eq(reactions.emoji, input.emoji)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .delete(reactions)
          .where(
            and(
              eq(reactions.messageId, input.messageId),
              eq(reactions.userId, ctx.userId),
              eq(reactions.emoji, input.emoji)
            )
          );
        return { action: "removed" as const };
      }

      await ctx.db.insert(reactions).values({
        messageId: input.messageId,
        userId: ctx.userId,
        emoji: input.emoji,
      });
      return { action: "added" as const };
    }),

  getReactions: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(reactions)
        .where(eq(reactions.messageId, input.messageId));
    }),
});

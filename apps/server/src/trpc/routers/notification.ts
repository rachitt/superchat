import { z } from "zod";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { notifications } from "../../db/schema/index.js";
import {
  getUnreadCount,
  markAsRead,
  markAllRead,
} from "../../services/notifications.js";

export const notificationRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.userId, ctx.userId)];

      if (input.cursor) {
        const [cursorNotif] = await ctx.db
          .select({ createdAt: notifications.createdAt })
          .from(notifications)
          .where(eq(notifications.id, input.cursor))
          .limit(1);

        if (cursorNotif) {
          conditions.push(
            sql`${notifications.createdAt} < ${cursorNotif.createdAt}`
          );
        }
      }

      const items = await ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit + 1);

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : undefined,
      };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return { count: await getUnreadCount(ctx.userId) };
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await markAsRead(input.notificationId);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllRead(ctx.userId);
    return { success: true };
  }),
});

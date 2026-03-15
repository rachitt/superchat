import { z } from "zod";
import { eq, desc, lt, and, isNull } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { messages, users } from "../../db/schema/index.js";
import { MESSAGES_PER_PAGE } from "@superchat/shared";

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
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
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

      return { items, nextCursor };
    }),
});

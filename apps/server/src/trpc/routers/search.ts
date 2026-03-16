import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import {
  messages,
  user as users,
  channels,
  workspaceMembers,
} from "../../db/schema/index.js";

export const searchRouter = router({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        workspaceId: z.string().uuid(),
        channelId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const [membership] = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, input.workspaceId),
            eq(workspaceMembers.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!membership) {
        return { results: [] };
      }

      const tsquery = sql`plainto_tsquery('english', ${input.query})`;

      const conditions = [
        eq(channels.workspaceId, input.workspaceId),
        isNull(messages.deletedAt),
        sql`${messages.searchVector} @@ ${tsquery}`,
      ];

      if (input.channelId) {
        conditions.push(eq(messages.channelId, input.channelId));
      }

      const results = await ctx.db
        .select({
          message: {
            id: messages.id,
            content: messages.content,
            channelId: messages.channelId,
            createdAt: messages.createdAt,
          },
          author: {
            id: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
          },
          channel: {
            name: channels.name,
          },
          headline: sql<string>`ts_headline('english', ${messages.content}, ${tsquery})`.as("headline"),
          rank: sql<number>`ts_rank(${messages.searchVector}, ${tsquery})`.as("rank"),
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.authorId))
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(and(...conditions))
        .orderBy(sql`ts_rank(${messages.searchVector}, ${tsquery}) DESC`)
        .limit(input.limit);

      return { results };
    }),
});

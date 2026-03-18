import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import {
  messages,
  user as users,
  channels,
  workspaceMembers,
} from "../../db/schema/index.js";
import { hybridSearch, type SearchMode } from "../../services/hybrid-search.js";

export const searchRouter = router({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        workspaceId: z.string().uuid(),
        channelId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
        mode: z.enum(["keyword", "semantic", "hybrid"]).default("hybrid"),
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

      const results = await hybridSearch({
        query: input.query,
        workspaceId: input.workspaceId,
        channelId: input.channelId,
        limit: input.limit,
        mode: input.mode as SearchMode,
      });

      return {
        results: results.map((r) => ({
          message: {
            id: r.messageId,
            content: r.content,
            channelId: r.channelId,
            createdAt: r.createdAt,
          },
          author: {
            id: r.authorId,
            username: r.authorUsername,
            name: r.authorName,
            image: r.authorImage,
          },
          channel: {
            name: r.channelName,
          },
          headline: r.headline,
          rank: r.score,
          score: r.score,
        })),
      };
    }),
});

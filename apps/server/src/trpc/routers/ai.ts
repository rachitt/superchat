import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { aiSummarizeSchema, aiSmartReplySchema } from "@superchat/shared";
import { generateSmartReplies, summarizeChannel, moderateContent } from "../../services/ai.js";
import { redis } from "../../lib/redis.js";
import { AI_RATE_LIMIT_PER_MINUTE } from "@superchat/shared";

async function checkRateLimit(userId: string) {
  const key = `ai:ratelimit:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > AI_RATE_LIMIT_PER_MINUTE) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `AI rate limit exceeded. Max ${AI_RATE_LIMIT_PER_MINUTE} requests per minute.`,
    });
  }
}

export const aiRouter = router({
  summarize: protectedProcedure
    .input(aiSummarizeSchema)
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.userId);
      const summary = await summarizeChannel(input.channelId, input.messageCount);
      return { summary };
    }),

  smartReplies: protectedProcedure
    .input(aiSmartReplySchema)
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.userId);
      const replies = await generateSmartReplies(input.channelId, input.messageId);
      return { replies };
    }),

  moderate: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.userId);
      const result = await moderateContent(input.content);
      return result;
    }),
});

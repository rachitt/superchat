import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { aiSummarizeSchema, aiSmartReplySchema } from "@superchat/shared";
import { generateSmartReplies, summarizeChannel, moderateContent } from "../../services/ai.js";
import { checkAiRateLimit } from "../../lib/rate-limit.js";

async function checkRateLimit(userId: string) {
  const result = await checkAiRateLimit(userId);
  if (result.limited) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: result.message,
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

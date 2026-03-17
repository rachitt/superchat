import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { aiSummarizeSchema, aiSmartReplySchema } from "@superchat/shared";
import { generateSmartReplies, summarizeChannel, summarizeThread, moderateContent } from "../../services/ai.js";
import { checkAiRateLimit } from "../../lib/rate-limit.js";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema/messages.js";

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

  summarizeThread: protectedProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.userId);
      const summary = await summarizeThread(input.parentId);
      return { summary };
    }),

  moderate: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.userId);
      const result = await moderateContent(input.content);
      return result;
    }),

  /** On-demand "Catch me up" thread summary */
  catchMeUp: protectedProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.userId);
      const summary = await summarizeThread(input.parentId);

      // Also persist the summary on the parent message payload
      const [parent] = await db
        .select({ payload: messages.payload })
        .from(messages)
        .where(eq(messages.id, input.parentId))
        .limit(1);

      const existingPayload = (parent?.payload as Record<string, unknown>) ?? {};

      await db
        .update(messages)
        .set({
          payload: {
            ...existingPayload,
            threadSummary: summary,
            summaryUpdatedAt: new Date().toISOString(),
          },
          payloadVersion: sql`${messages.payloadVersion} + 1`,
        })
        .where(eq(messages.id, input.parentId));

      return { summary };
    }),
});

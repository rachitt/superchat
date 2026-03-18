import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { scheduledMessages } from "../../db/schema/scheduled-messages.js";
import { getQueue } from "../../workers/queue.js";

export const scheduledRouter = router({
  schedule: protectedProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        content: z.string().min(1).max(4000),
        scheduledFor: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scheduledDate = new Date(input.scheduledFor);
      const delay = scheduledDate.getTime() - Date.now();
      if (delay < 5000) {
        throw new Error("Scheduled time must be at least 5 seconds in the future");
      }

      // Create the scheduled message record
      const [record] = await ctx.db
        .insert(scheduledMessages)
        .values({
          channelId: input.channelId,
          userId: ctx.userId,
          content: input.content,
          scheduledFor: scheduledDate,
        })
        .returning();

      // Enqueue BullMQ delayed job
      const job = await getQueue("scheduled-messages").add(
        "scheduled-message",
        {
          scheduledMessageId: record.id,
          userId: ctx.userId,
          channelId: input.channelId,
          content: input.content,
        },
        { delay }
      );

      // Store the job ID
      await ctx.db
        .update(scheduledMessages)
        .set({ jobId: job.id })
        .where(eq(scheduledMessages.id, record.id));

      return { id: record.id, scheduledFor: record.scheduledFor.toISOString() };
    }),

  list: protectedProcedure
    .input(z.object({ channelId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(scheduledMessages.userId, ctx.userId),
        eq(scheduledMessages.status, "pending"),
      ];
      if (input.channelId) {
        conditions.push(eq(scheduledMessages.channelId, input.channelId));
      }

      const items = await ctx.db
        .select()
        .from(scheduledMessages)
        .where(and(...conditions))
        .orderBy(desc(scheduledMessages.scheduledFor))
        .limit(50);

      return items.map((item) => ({
        id: item.id,
        channelId: item.channelId,
        content: item.content,
        scheduledFor: item.scheduledFor.toISOString(),
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      }));
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [record] = await ctx.db
        .select()
        .from(scheduledMessages)
        .where(
          and(
            eq(scheduledMessages.id, input.id),
            eq(scheduledMessages.userId, ctx.userId),
            eq(scheduledMessages.status, "pending")
          )
        )
        .limit(1);

      if (!record) {
        throw new Error("Scheduled message not found or already sent");
      }

      // Remove the BullMQ job
      if (record.jobId) {
        const queue = getQueue("scheduled-messages");
        const job = await queue.getJob(record.jobId);
        if (job) await job.remove();
      }

      // Update status
      await ctx.db
        .update(scheduledMessages)
        .set({ status: "cancelled" })
        .where(eq(scheduledMessages.id, input.id));

      return { success: true };
    }),
});

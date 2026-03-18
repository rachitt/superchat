import { randomBytes } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc.js";
import { webhooks } from "../../db/schema/webhooks.js";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export const webhookRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        name: z.string().min(1).max(100),
        type: z.enum(["generic", "github"]).default("generic"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [webhook] = await ctx.db
        .insert(webhooks)
        .values({
          channelId: input.channelId,
          name: input.name,
          type: input.type,
          token: generateToken(),
          createdBy: ctx.userId,
        })
        .returning();

      return webhook;
    }),

  list: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(webhooks)
        .where(eq(webhooks.channelId, input.channelId))
        .orderBy(webhooks.createdAt);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(webhooks).where(eq(webhooks.id, input.id));
      return { success: true };
    }),

  regenerateToken: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const newToken = generateToken();
      const [updated] = await ctx.db
        .update(webhooks)
        .set({ token: newToken })
        .where(eq(webhooks.id, input.id))
        .returning();

      return updated;
    }),
});

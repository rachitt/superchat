import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { channels, channelMembers, channelPrompts } from "../../db/schema/index.js";
import { invalidateChannelPromptCache } from "../../services/prompt-manager.js";

export const channelRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        name: z.string().min(1).max(80),
        description: z.string().max(500).optional(),
        type: z.enum(["public", "private"]).default("public"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [channel] = await ctx.db
        .insert(channels)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          type: input.type,
          createdBy: ctx.userId,
        })
        .returning();

      await ctx.db.insert(channelMembers).values({
        channelId: channel.id,
        userId: ctx.userId,
      });

      return channel;
    }),

  listByWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(channels)
        .where(eq(channels.workspaceId, input.workspaceId));
    }),

  join: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(channelMembers)
        .values({
          channelId: input.channelId,
          userId: ctx.userId,
        })
        .onConflictDoNothing();
    }),

  getPersona: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          persona: channelPrompts.persona,
          customPrompt: channelPrompts.customPrompt,
        })
        .from(channelPrompts)
        .where(eq(channelPrompts.channelId, input.channelId))
        .limit(1);

      return row ?? { persona: null, customPrompt: null };
    }),

  setPersona: protectedProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        persona: z.string().max(50).nullable(),
        customPrompt: z.string().max(2000).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert: insert or update on conflict
      await ctx.db
        .insert(channelPrompts)
        .values({
          channelId: input.channelId,
          persona: input.persona,
          customPrompt: input.customPrompt,
        })
        .onConflictDoUpdate({
          target: channelPrompts.channelId,
          set: {
            persona: input.persona,
            customPrompt: input.customPrompt,
            updatedAt: new Date(),
          },
        });

      // Invalidate cache so next AI call picks up the new persona
      await invalidateChannelPromptCache(input.channelId);

      return { success: true };
    }),
});

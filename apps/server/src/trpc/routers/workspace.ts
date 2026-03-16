import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { workspaces, workspaceMembers, workspacePrompts } from "../../db/schema/index.js";
import { invalidatePromptCache } from "../../services/prompt-manager.js";

export const workspaceRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .insert(workspaces)
        .values({
          name: input.name,
          slug: input.slug,
          ownerId: ctx.userId,
        })
        .returning();

      await ctx.db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: ctx.userId,
        role: "owner",
      });

      return workspace;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, ctx.userId))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId));

    return memberships.map((m) => ({
      ...m.workspaces,
      role: m.workspace_members.role,
    }));
  }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, input.slug))
        .limit(1);

      return workspace ?? null;
    }),

  updateBotSettings: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        systemPrompt: z.string().min(1).max(5000),
        botName: z.string().max(100).optional(),
        personality: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check that user is owner or admin
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

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owners and admins can update bot settings" });
      }

      const [result] = await ctx.db
        .insert(workspacePrompts)
        .values({
          workspaceId: input.workspaceId,
          systemPrompt: input.systemPrompt,
          botName: input.botName,
          personality: input.personality,
        })
        .onConflictDoUpdate({
          target: workspacePrompts.workspaceId,
          set: {
            systemPrompt: input.systemPrompt,
            botName: input.botName,
            personality: input.personality,
            updatedAt: new Date(),
          },
        })
        .returning();

      await invalidatePromptCache(input.workspaceId);

      return result;
    }),
});

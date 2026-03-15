import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { workspaces, workspaceMembers } from "../../db/schema/index.js";

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
});

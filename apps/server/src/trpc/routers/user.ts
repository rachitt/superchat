import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../trpc.js";
import { user as users } from "../../db/schema/index.js";
import { getUploadUrl, getPublicUrl } from "../../lib/storage.js";

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [u] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);
    return u ?? null;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        status: z.string().max(100).optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, ctx.userId))
        .returning();
      return updated;
    }),

  getById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [u] = await ctx.db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          image: users.image,
          status: users.status,
          bio: users.bio,
          xp: users.xp,
          level: users.level,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      return u ?? null;
    }),

  getAvatarUploadUrl: protectedProcedure
    .input(
      z.object({
        fileType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ext = input.fileType.split("/")[1];
      const key = `avatars/${ctx.userId}/${randomUUID()}.${ext}`;
      const uploadUrl = await getUploadUrl(key, input.fileType);
      const publicUrl = getPublicUrl(key);
      return { uploadUrl, publicUrl, key };
    }),
});

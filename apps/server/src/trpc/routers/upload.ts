import { z } from "zod";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../trpc.js";
import { getUploadUrl, getPublicUrl } from "../../lib/storage.js";

export const uploadRouter = router({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.string().min(1).max(100),
        fileSize: z.number().max(50 * 1024 * 1024), // 50MB max
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ext = input.fileName.split(".").pop() ?? "";
      const key = `uploads/${ctx.userId}/${randomUUID()}.${ext}`;
      const uploadUrl = await getUploadUrl(key, input.fileType);
      const publicUrl = getPublicUrl(key);

      return { uploadUrl, publicUrl, key };
    }),
});

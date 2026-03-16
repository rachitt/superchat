import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { db } from "../../db/index.js";
import { channels, workspaceMembers, user as users } from "../../db/schema/index.js";

export const memberRouter = router({
  listByChannel: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ input }) => {
      // Get the workspace for this channel
      const [channel] = await db
        .select({ workspaceId: channels.workspaceId })
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .limit(1);

      if (!channel) return [];

      // Return all workspace members
      const members = await db
        .select({
          userId: users.id,
          username: users.username,
          name: users.name,
          image: users.image,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, channel.workspaceId));

      return members;
    }),
});

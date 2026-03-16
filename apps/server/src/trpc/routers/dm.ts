import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import {
  channels,
  channelMembers,
  user as users,
  messages,
} from "../../db/schema/index.js";

export const dmRouter = router({
  /**
   * Find or create a DM channel between the current user and another user.
   * DM channels use type="dm" and name="dm:{id1}:{id2}" (sorted).
   */
  findOrCreate: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        targetUserId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [id1, id2] = [ctx.userId, input.targetUserId].sort();
      const dmName = `dm:${id1}:${id2}`;

      // Check if DM channel already exists in this workspace
      const [existing] = await ctx.db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.workspaceId, input.workspaceId),
            eq(channels.name, dmName),
            eq(channels.type, "dm")
          )
        )
        .limit(1);

      if (existing) return existing;

      // Create new DM channel
      const [channel] = await ctx.db
        .insert(channels)
        .values({
          workspaceId: input.workspaceId,
          name: dmName,
          type: "dm",
          createdBy: ctx.userId,
        })
        .returning();

      // Add both users as members
      await ctx.db.insert(channelMembers).values([
        { channelId: channel.id, userId: id1 },
        { channelId: channel.id, userId: id2 },
      ]);

      return channel;
    }),

  /**
   * List all DM channels for the current user in a workspace,
   * with the other user's info and last message preview.
   */
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get all DM channels the user is a member of in this workspace
      const dmChannels = await ctx.db
        .select({
          channelId: channels.id,
          channelName: channels.name,
          createdAt: channels.createdAt,
        })
        .from(channelMembers)
        .innerJoin(channels, eq(channels.id, channelMembers.channelId))
        .where(
          and(
            eq(channelMembers.userId, ctx.userId),
            eq(channels.workspaceId, input.workspaceId),
            eq(channels.type, "dm")
          )
        );

      if (dmChannels.length === 0) return [];

      // For each DM, resolve the other user
      const results = await Promise.all(
        dmChannels.map(async (dm) => {
          // Get the other member
          const [otherMember] = await ctx.db
            .select({
              id: users.id,
              username: users.username,
              name: users.name,
              image: users.image,
              status: users.status,
            })
            .from(channelMembers)
            .innerJoin(users, eq(users.id, channelMembers.userId))
            .where(
              and(
                eq(channelMembers.channelId, dm.channelId),
                sql`${channelMembers.userId} != ${ctx.userId}`
              )
            )
            .limit(1);

          // Get last message
          const [lastMessage] = await ctx.db
            .select({
              content: messages.content,
              createdAt: messages.createdAt,
              authorId: messages.authorId,
            })
            .from(messages)
            .where(eq(messages.channelId, dm.channelId))
            .orderBy(sql`${messages.createdAt} DESC`)
            .limit(1);

          return {
            channelId: dm.channelId,
            otherUser: otherMember ?? null,
            lastMessage: lastMessage ?? null,
          };
        })
      );

      // Sort by last message time (most recent first)
      return results.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
        const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      });
    }),
});

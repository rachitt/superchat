import { z } from "zod";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { user as users, workspaceMembers, games, gamePlayers, messages } from "../../db/schema/index.js";

export const leaderboardRouter = router({
  getLeaderboard: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        category: z.enum(["xp", "messages", "streaks", "gameWins"]),
        timeframe: z.enum(["weekly", "allTime"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { workspaceId, category, timeframe } = input;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      if (category === "xp") {
        const rows = await ctx.db
          .select({
            userId: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
            level: users.level,
            value: users.xp,
          })
          .from(users)
          .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
          .where(eq(workspaceMembers.workspaceId, workspaceId))
          .orderBy(desc(users.xp))
          .limit(50);

        return rows;
      }

      if (category === "messages") {
        // Count messages per user, optionally filtered to this week
        const conditions = [eq(workspaceMembers.workspaceId, workspaceId)];
        if (timeframe === "weekly") {
          conditions.push(gte(messages.createdAt, weekAgo));
        }

        const rows = await ctx.db
          .select({
            userId: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
            level: users.level,
            value: sql<number>`count(${messages.id})::int`,
          })
          .from(users)
          .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
          .innerJoin(messages, eq(messages.authorId, users.id))
          .where(and(...conditions))
          .groupBy(users.id, users.username, users.name, users.image, users.level)
          .orderBy(desc(sql`count(${messages.id})`))
          .limit(50);

        return rows;
      }

      if (category === "streaks") {
        const rows = await ctx.db
          .select({
            userId: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
            level: users.level,
            value: users.streakDays,
          })
          .from(users)
          .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
          .where(eq(workspaceMembers.workspaceId, workspaceId))
          .orderBy(desc(users.streakDays))
          .limit(50);

        return rows;
      }

      if (category === "gameWins") {
        // Count games won per user (highest score in finished games)
        const conditions = [
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(games.status, "finished"),
        ];
        if (timeframe === "weekly") {
          conditions.push(gte(games.finishedAt, weekAgo));
        }

        // Subquery: for each game, find the winner (player with max score)
        const rows = await ctx.db
          .select({
            userId: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
            level: users.level,
            value: sql<number>`count(DISTINCT ${games.id})::int`,
          })
          .from(users)
          .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
          .innerJoin(gamePlayers, eq(gamePlayers.userId, users.id))
          .innerJoin(games, eq(games.id, gamePlayers.gameId))
          .where(
            and(
              ...conditions,
              // User's score equals the max score in that game
              sql`${gamePlayers.score} = (SELECT max(gp2.score) FROM game_players gp2 WHERE gp2.game_id = ${games.id})`
            )
          )
          .groupBy(users.id, users.username, users.name, users.image, users.level)
          .orderBy(desc(sql`count(DISTINCT ${games.id})`))
          .limit(50);

        return rows;
      }

      return [];
    }),
});

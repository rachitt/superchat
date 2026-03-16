import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { games, gamePlayers, user as users } from "../../db/schema/index.js";
import { createGameSchema } from "@superchat/shared";
import { getGameEngine } from "../../games/index.js";
import type { GameConfig, GameState, GamePlayerData } from "@superchat/shared";

export const gameRouter = router({
  create: protectedProcedure
    .input(createGameSchema)
    .mutation(async ({ ctx, input }) => {
      const engine = getGameEngine(input.gameType);

      // Create player data for the creator
      const [creator] = await ctx.db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, ctx.userId));

      const initialPlayers: GamePlayerData[] = [
        {
          gameId: "", // will be set after insert
          userId: ctx.userId,
          username: creator.username || creator.name,
          displayName: creator.name,
          avatar: creator.image,
          score: 0,
          data: {},
          joinedAt: new Date().toISOString(),
        },
      ];

      // Create initial state (empty for waiting phase)
      const emptyState = { type: input.gameType } as GameState;

      const [game] = await ctx.db
        .insert(games)
        .values({
          workspaceId: input.workspaceId,
          channelId: input.channelId,
          gameType: input.gameType,
          status: "waiting",
          config: input.config,
          state: emptyState,
          createdBy: ctx.userId,
        })
        .returning();

      // Add creator as first player
      await ctx.db.insert(gamePlayers).values({
        gameId: game.id,
        userId: ctx.userId,
        score: 0,
        data: {},
      });

      return {
        id: game.id,
        workspaceId: game.workspaceId,
        channelId: game.channelId,
        gameType: game.gameType,
        status: game.status,
        config: game.config,
        state: game.state,
        createdBy: game.createdBy,
        startedAt: null,
        finishedAt: null,
        createdAt: game.createdAt.toISOString(),
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        status: z.enum(["waiting", "in_progress", "finished"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(games.channelId, input.channelId)];
      if (input.status) {
        conditions.push(eq(games.status, input.status));
      }

      const result = await ctx.db
        .select()
        .from(games)
        .where(and(...conditions))
        .orderBy(desc(games.createdAt))
        .limit(20);

      return result.map((g) => ({
        id: g.id,
        workspaceId: g.workspaceId,
        channelId: g.channelId,
        gameType: g.gameType,
        status: g.status,
        config: g.config,
        state: g.state,
        createdBy: g.createdBy,
        startedAt: g.startedAt?.toISOString() ?? null,
        finishedAt: g.finishedAt?.toISOString() ?? null,
        createdAt: g.createdAt.toISOString(),
      }));
    }),

  get: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [game] = await ctx.db
        .select()
        .from(games)
        .where(eq(games.id, input.gameId))
        .limit(1);

      if (!game) return null;

      const players = await ctx.db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          score: gamePlayers.score,
          data: gamePlayers.data,
          joinedAt: gamePlayers.joinedAt,
          username: users.username,
          name: users.name,
          image: users.image,
        })
        .from(gamePlayers)
        .innerJoin(users, eq(users.id, gamePlayers.userId))
        .where(eq(gamePlayers.gameId, input.gameId));

      return {
        game: {
          id: game.id,
          workspaceId: game.workspaceId,
          channelId: game.channelId,
          gameType: game.gameType,
          status: game.status,
          config: game.config,
          state: game.state,
          createdBy: game.createdBy,
          startedAt: game.startedAt?.toISOString() ?? null,
          finishedAt: game.finishedAt?.toISOString() ?? null,
          createdAt: game.createdAt.toISOString(),
        },
        players: players.map((p) => ({
          gameId: p.gameId,
          userId: p.userId,
          username: p.username || p.name,
          displayName: p.name,
          avatar: p.image,
          score: p.score,
          data: p.data as Record<string, unknown>,
          joinedAt: p.joinedAt.toISOString(),
        })),
      };
    }),

  join: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [game] = await ctx.db
        .select()
        .from(games)
        .where(eq(games.id, input.gameId))
        .limit(1);

      if (!game) throw new Error("Game not found");
      if (game.status !== "waiting") throw new Error("Game already started");

      // Check if already joined
      const [existing] = await ctx.db
        .select()
        .from(gamePlayers)
        .where(
          and(
            eq(gamePlayers.gameId, input.gameId),
            eq(gamePlayers.userId, ctx.userId)
          )
        )
        .limit(1);

      if (existing) return { alreadyJoined: true };

      const engine = getGameEngine(game.gameType as any);

      // Check max players
      const playerCount = await ctx.db
        .select()
        .from(gamePlayers)
        .where(eq(gamePlayers.gameId, input.gameId));

      if (playerCount.length >= engine.maxPlayers) {
        throw new Error("Game is full");
      }

      await ctx.db.insert(gamePlayers).values({
        gameId: input.gameId,
        userId: ctx.userId,
        score: 0,
        data: {},
      });

      return { alreadyJoined: false };
    }),

  leave: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(gamePlayers)
        .where(
          and(
            eq(gamePlayers.gameId, input.gameId),
            eq(gamePlayers.userId, ctx.userId)
          )
        );
    }),

  start: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [game] = await ctx.db
        .select()
        .from(games)
        .where(eq(games.id, input.gameId))
        .limit(1);

      if (!game) throw new Error("Game not found");
      if (game.createdBy !== ctx.userId) throw new Error("Only the creator can start");
      if (game.status !== "waiting") throw new Error("Game already started");

      const engine = getGameEngine(game.gameType as any);

      const playerRows = await ctx.db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          score: gamePlayers.score,
          data: gamePlayers.data,
          joinedAt: gamePlayers.joinedAt,
          username: users.username,
          name: users.name,
          image: users.image,
        })
        .from(gamePlayers)
        .innerJoin(users, eq(users.id, gamePlayers.userId))
        .where(eq(gamePlayers.gameId, input.gameId));

      const players: GamePlayerData[] = playerRows.map((p) => ({
        gameId: p.gameId,
        userId: p.userId,
        username: p.username || p.name,
        displayName: p.name,
        avatar: p.image,
        score: p.score,
        data: (p.data as Record<string, unknown>) || {},
        joinedAt: p.joinedAt.toISOString(),
      }));

      if (players.length < engine.minPlayers) {
        throw new Error(`Need at least ${engine.minPlayers} players`);
      }

      const config = game.config as any;
      const initialState = engine.initState(config, players);

      await ctx.db
        .update(games)
        .set({
          status: "in_progress",
          state: initialState,
          startedAt: new Date(),
        })
        .where(eq(games.id, input.gameId));

      return {
        game: {
          id: game.id,
          workspaceId: game.workspaceId,
          channelId: game.channelId,
          gameType: game.gameType,
          status: "in_progress" as const,
          config: game.config,
          state: initialState,
          createdBy: game.createdBy,
          startedAt: new Date().toISOString(),
          finishedAt: null,
          createdAt: game.createdAt.toISOString(),
        },
        players,
      };
    }),

  action: protectedProcedure
    .input(z.object({
      gameId: z.string().uuid(),
      action: z.string().min(1).max(50),
      data: z.record(z.unknown()).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      const [game] = await ctx.db
        .select()
        .from(games)
        .where(eq(games.id, input.gameId))
        .limit(1);

      if (!game || game.status !== "in_progress") throw new Error("Game not active");

      const engine = getGameEngine(game.gameType as any);

      const playerRows = await ctx.db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          score: gamePlayers.score,
          data: gamePlayers.data,
          joinedAt: gamePlayers.joinedAt,
          username: users.username,
          name: users.name,
          image: users.image,
        })
        .from(gamePlayers)
        .innerJoin(users, eq(users.id, gamePlayers.userId))
        .where(eq(gamePlayers.gameId, input.gameId));

      const players: GamePlayerData[] = playerRows.map((p) => ({
        gameId: p.gameId,
        userId: p.userId,
        username: p.username || p.name,
        displayName: p.name,
        avatar: p.image,
        score: p.score,
        data: (p.data as Record<string, unknown>) || {},
        joinedAt: p.joinedAt.toISOString(),
      }));

      const currentState = game.state as GameState;
      const result = engine.handleAction(currentState, ctx.userId, input.action, input.data, players);

      // Update scores
      if (result.state && "scores" in result.state) {
        const scores = (result.state as any).scores as Record<string, number>;
        for (const [pId, score] of Object.entries(scores)) {
          await ctx.db
            .update(gamePlayers)
            .set({ score })
            .where(and(eq(gamePlayers.gameId, input.gameId), eq(gamePlayers.userId, pId)));
        }
      }

      if (result.finished) {
        await ctx.db
          .update(games)
          .set({ state: result.state, status: "finished", finishedAt: new Date() })
          .where(eq(games.id, input.gameId));
      } else {
        await ctx.db
          .update(games)
          .set({ state: result.state })
          .where(eq(games.id, input.gameId));
      }

      // Re-fetch players with updated scores
      const updatedPlayerRows = await ctx.db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          score: gamePlayers.score,
          data: gamePlayers.data,
          joinedAt: gamePlayers.joinedAt,
          username: users.username,
          name: users.name,
          image: users.image,
        })
        .from(gamePlayers)
        .innerJoin(users, eq(users.id, gamePlayers.userId))
        .where(eq(gamePlayers.gameId, input.gameId));

      const updatedPlayers: GamePlayerData[] = updatedPlayerRows.map((p) => ({
        gameId: p.gameId,
        userId: p.userId,
        username: p.username || p.name,
        displayName: p.name,
        avatar: p.image,
        score: p.score,
        data: (p.data as Record<string, unknown>) || {},
        joinedAt: p.joinedAt.toISOString(),
      }));

      return {
        state: result.state,
        finished: result.finished,
        players: updatedPlayers,
        announcement: result.announcement,
      };
    }),
});

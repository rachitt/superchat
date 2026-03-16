import type { Server, Socket } from "socket.io";
import { eq, and } from "drizzle-orm";
import type { ClientToServerEvents, ServerToClientEvents, GamePlayerData, GameState } from "@superchat/shared";
import { gameActionSchema } from "@superchat/shared";
import { db } from "../../db/index.js";
import { games, gamePlayers, user as users } from "../../db/schema/index.js";
import { getGameEngine } from "../../games/index.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

async function getGamePlayers(gameId: string): Promise<GamePlayerData[]> {
  const rows = await db
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
    .where(eq(gamePlayers.gameId, gameId));

  return rows.map((r) => ({
    gameId: r.gameId,
    userId: r.userId,
    username: r.username || r.name,
    displayName: r.name,
    avatar: r.image,
    score: r.score,
    data: (r.data as Record<string, unknown>) || {},
    joinedAt: r.joinedAt.toISOString(),
  }));
}

export function registerGameHandlers(io: IOServer, socket: IOSocket) {
  const userId = socket.data.userId as string;
  console.log(`[Game] Registering handlers for ${userId}`);

  socket.on("game:join", async ({ gameId }) => {
    console.log(`[Game] game:join from ${userId} for ${gameId}`);
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (!game) {
      socket.emit("game:error", { gameId, message: "Game not found" });
      return;
    }

    // Join the socket room for real-time updates
    socket.join(`game:${gameId}`);

    // Check if already a player
    const [existing] = await db
      .select()
      .from(gamePlayers)
      .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)))
      .limit(1);

    if (!existing && game.status === "waiting") {
      // Add as player
      await db.insert(gamePlayers).values({
        gameId,
        userId,
        score: 0,
        data: {},
      });
    }

    const players = await getGamePlayers(gameId);
    const newPlayer = players.find((p) => p.userId === userId);

    if (newPlayer) {
      io.to(`game:${gameId}`).emit("game:player_joined", {
        gameId,
        player: newPlayer,
      });
    }
  });

  socket.on("game:leave", async ({ gameId }) => {
    socket.leave(`game:${gameId}`);

    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (game && game.status === "waiting") {
      await db
        .delete(gamePlayers)
        .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)));

      io.to(`game:${gameId}`).emit("game:player_left", { gameId, userId });
    }
  });

  socket.on("game:start", async ({ gameId }) => {
    console.log(`[Game] game:start from ${userId} for ${gameId}`);
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (!game) {
      socket.emit("game:error", { gameId, message: "Game not found" });
      return;
    }

    if (game.createdBy !== userId) {
      socket.emit("game:error", { gameId, message: "Only the creator can start the game" });
      return;
    }

    if (game.status !== "waiting") {
      socket.emit("game:error", { gameId, message: "Game already started" });
      return;
    }

    const engine = getGameEngine(game.gameType as any);
    const players = await getGamePlayers(gameId);

    if (players.length < engine.minPlayers) {
      socket.emit("game:error", {
        gameId,
        message: `Need at least ${engine.minPlayers} players to start`,
      });
      return;
    }

    // Initialize game state
    const config = game.config as any;
    const initialState = engine.initState(config, players);

    await db
      .update(games)
      .set({
        status: "in_progress",
        state: initialState,
        startedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    io.to(`game:${gameId}`).emit("game:started", {
      gameId,
      state: initialState,
      players,
    });
  });

  socket.on("game:action", async (data) => {
    console.log(`[Game] game:action from ${userId}:`, data);
    const parsed = gameActionSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit("error", { message: "Invalid game action", code: "VALIDATION_ERROR" });
      return;
    }

    const { gameId, action, data: actionData } = parsed.data;

    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (!game || game.status !== "in_progress") {
      socket.emit("game:error", { gameId, message: "Game not active" });
      return;
    }

    const engine = getGameEngine(game.gameType as any);
    const players = await getGamePlayers(gameId);
    const currentState = game.state as GameState;

    const result = engine.handleAction(currentState, userId, action, actionData, players);

    // Update scores in game_players table
    if (result.state && "scores" in result.state) {
      const scores = (result.state as any).scores as Record<string, number>;
      for (const [pId, score] of Object.entries(scores)) {
        await db
          .update(gamePlayers)
          .set({ score })
          .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, pId)));
      }
    }

    if (result.finished) {
      await db
        .update(games)
        .set({
          state: result.state,
          status: "finished",
          finishedAt: new Date(),
        })
        .where(eq(games.id, gameId));

      const finalPlayers = await getGamePlayers(gameId);
      const winner = finalPlayers.reduce((a, b) => (a.score > b.score ? a : b), finalPlayers[0]);

      io.to(`game:${gameId}`).emit("game:finished", {
        gameId,
        finalState: result.state,
        players: finalPlayers,
        winner: winner || null,
      });
    } else {
      await db
        .update(games)
        .set({ state: result.state })
        .where(eq(games.id, gameId));

      const updatedPlayers = await getGamePlayers(gameId);

      io.to(`game:${gameId}`).emit("game:state_update", {
        gameId,
        state: result.state,
        players: updatedPlayers,
      });
    }
  });
}

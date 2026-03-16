import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { Emitter } from "@socket.io/redis-emitter";
import type { GameState, ServerToClientEvents } from "@superchat/shared";
import { db } from "../../db/index.js";
import { games, gamePlayers, user as users } from "../../db/schema/index.js";
import { redis } from "../../lib/redis.js";
import { getGameEngine } from "../../games/index.js";
import logger from "../../lib/logger.js";

const log = logger.child({ module: "game-timeout-worker" });

export interface GameTimeoutPayload {
  gameId: string;
  userId: string;
}

async function getGamePlayers(gameId: string) {
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

function sanitizeStateForClient(state: GameState): GameState {
  if (state.type === "wordle" && state.phase === "playing") {
    const { targetWord, ...rest } = state;
    return { ...rest, targetWord: "" } as GameState;
  }
  return state;
}

export default async function processGameTimeout(job: Job<GameTimeoutPayload>) {
  const { gameId, userId } = job.data;
  log.info({ gameId, userId }, "Processing game timeout");

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (!game || game.status !== "in_progress") return;

  const state = game.state as GameState;
  if (!("currentTurnUserId" in state) || state.currentTurnUserId !== userId) return;

  const engine = getGameEngine(game.gameType as any);
  const players = await getGamePlayers(gameId);
  const result = engine.handleTimeout(state, players);

  if ("turnOrder" in state && "currentTurnUserId" in result.state) {
    const turnOrder = (state as any).turnOrder as string[];
    const currentIdx = turnOrder.indexOf(userId);
    if (currentIdx !== -1) {
      const nextIdx = (currentIdx + 1) % turnOrder.length;
      (result.state as any).currentTurnUserId = turnOrder[nextIdx];
    }
  }

  await db
    .update(games)
    .set({ state: result.state })
    .where(eq(games.id, gameId));

  const emitter = new Emitter<ServerToClientEvents>(redis.duplicate());
  const updatedPlayers = await getGamePlayers(gameId);
  emitter.to(`game:${gameId}`).emit("game:state_update", {
    gameId,
    state: sanitizeStateForClient(result.state),
    players: updatedPlayers,
  });
}

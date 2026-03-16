"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/stores/game-store";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { TriviaGame } from "./trivia-game";
import { WordleGame } from "./wordle-game";
import { TicTacToeGame } from "./tic-tac-toe-game";
import { CardsGame } from "./cards-game";
import type { GamePlayerData } from "@superchat/shared";

interface GameRoomProps {
  gameId: string;
}

export function GameRoom({ gameId }: GameRoomProps) {
  const { data: session } = useSession();
  const trpc = useTRPC();
  const { activeGame, players, setActiveGame, setPlayers, reset } = useGameStore();

  const { data } = useQuery(
    trpc.game.get.queryOptions({ gameId })
  );

  useEffect(() => {
    if (data) {
      setActiveGame(data.game as any);
      setPlayers(data.players as any);
    }
  }, [data, setActiveGame, setPlayers]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("game:join", { gameId });
    return () => {
      socket.emit("game:leave", { gameId });
    };
  }, [gameId]);

  if (!activeGame) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-zinc-400">Loading game...</p>
      </div>
    );
  }

  const isCreator = session?.user?.id === activeGame.createdBy;
  const currentUserId = session?.user?.id || "";

  if (activeGame.status === "waiting") {
    return (
      <WaitingRoom
        gameId={gameId}
        players={players}
        isCreator={isCreator}
        gameType={activeGame.gameType}
      />
    );
  }

  if (activeGame.status === "finished") {
    return (
      <GameResults
        players={players}
        gameType={activeGame.gameType}
        onClose={reset}
      />
    );
  }

  const handleAction = (action: string, data?: Record<string, unknown>) => {
    const socket = getSocket();
    socket.emit("game:action", { gameId, action, data: data ?? {} });
  };

  switch (activeGame.gameType) {
    case "trivia":
      return <TriviaGame game={activeGame} players={players} userId={currentUserId} onAction={handleAction} />;
    case "wordle":
      return <WordleGame game={activeGame} players={players} userId={currentUserId} onAction={handleAction} />;
    case "tic_tac_toe":
      return <TicTacToeGame game={activeGame} players={players} userId={currentUserId} onAction={handleAction} />;
    case "cards":
      return <CardsGame game={activeGame} players={players} userId={currentUserId} onAction={handleAction} />;
    default:
      return (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm text-zinc-400">Game type "{activeGame.gameType}" coming soon!</p>
        </div>
      );
  }
}

function WaitingRoom({
  gameId,
  players,
  isCreator,
  gameType,
}: {
  gameId: string;
  players: GamePlayerData[];
  isCreator: boolean;
  gameType: string;
}) {
  const socket = getSocket();
  const GAME_EMOJI: Record<string, string> = {
    trivia: "🧠", wordle: "📝", tic_tac_toe: "❌", cards: "🃏",
  };
  const GAME_NAME: Record<string, string> = {
    trivia: "Trivia", wordle: "Wordle", tic_tac_toe: "Tic Tac Toe", cards: "Cards",
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Waiting for Players</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {GAME_EMOJI[gameType] || "🎮"} {GAME_NAME[gameType] || gameType}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Players ({players.length})
        </p>
        {players.map((p) => (
          <div
            key={p.userId}
            className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
          >
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
              {(p.displayName || p.username)[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-white">{p.displayName || p.username}</span>
          </div>
        ))}
      </div>

      {isCreator && (
        <button
          onClick={() => socket.emit("game:start", { gameId })}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Start Game
        </button>
      )}

      {!isCreator && (
        <p className="text-sm text-zinc-400">Waiting for the host to start...</p>
      )}
    </div>
  );
}

function GameResults({
  players,
  gameType,
  onClose,
}: {
  players: GamePlayerData[];
  gameType: string;
  onClose: () => void;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <p className="text-4xl mb-2">🏆</p>
        <h2 className="text-xl font-bold text-white">Game Over!</h2>
      </div>

      <div className="w-full max-w-xs space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.userId}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              i === 0
                ? "border-yellow-600/50 bg-yellow-900/20"
                : "border-zinc-700 bg-zinc-800/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{medals[i] || `#${i + 1}`}</span>
              <span className="text-sm font-medium text-white">
                {p.displayName || p.username}
              </span>
            </div>
            <span className="text-sm font-bold text-indigo-400">{p.score} pts</span>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        Back to Lobby
      </button>
    </div>
  );
}

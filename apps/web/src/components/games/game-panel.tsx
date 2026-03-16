"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GameType, GameConfig, GameData, GamePlayerData } from "@superchat/shared";
import { GAME_TYPES } from "@superchat/shared";
import { TriviaGame } from "./trivia-game";
import { WordleGame } from "./wordle-game";
import { TicTacToeGame } from "./tic-tac-toe-game";
import { CardsGame } from "./cards-game";

const GAME_INFO: Record<GameType, { name: string; description: string; emoji: string }> = {
  trivia: { name: "Trivia", description: "Test your knowledge!", emoji: "🧠" },
  wordle: { name: "Wordle", description: "Guess the hidden word", emoji: "📝" },
  tic_tac_toe: { name: "Tic Tac Toe", description: "Classic X and O", emoji: "❌" },
  cards: { name: "Cards", description: "High card showdown", emoji: "🃏" },
};

function getDefaultConfig(type: GameType): GameConfig {
  switch (type) {
    case "trivia":
      return { type: "trivia", questionCount: 5, timePerQuestion: 15 };
    case "wordle":
      return { type: "wordle", wordLength: 5, maxGuesses: 6 };
    case "tic_tac_toe":
      return { type: "tic_tac_toe", boardSize: 3 };
    case "cards":
      return { type: "cards", deckType: "standard", maxPlayers: 4 };
  }
}

interface GamePanelProps {
  channelId: string;
  workspaceId: string;
  onClose: () => void;
}

export function GamePanel({ channelId, workspaceId, onClose }: GamePanelProps) {
  const { data: session } = useSession();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const userId = session?.user?.id || "";

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<GameType>("trivia");
  const [error, setError] = useState<string | null>(null);

  // Fetch active game data
  const { data: activeGameData } = useQuery({
    ...trpc.game.get.queryOptions({ gameId: activeGameId! }),
    enabled: !!activeGameId,
    refetchInterval: 2000, // poll for updates
  });

  // Fetch waiting games in channel
  const { data: waitingGames } = useQuery({
    ...trpc.game.list.queryOptions({ channelId, status: "waiting" }),
    enabled: !activeGameId,
  });

  const createMutation = useMutation(
    trpc.game.create.mutationOptions({
      onSuccess: (game) => {
        setError(null);
        setActiveGameId(game.id);
        setCreating(false);
      },
      onError: (err) => setError(err.message),
    })
  );

  const startMutation = useMutation(
    trpc.game.start.mutationOptions({
      onSuccess: () => {
        setError(null);
        queryClient.invalidateQueries({ queryKey: trpc.game.get.queryOptions({ gameId: activeGameId! }).queryKey });
      },
      onError: (err) => setError(err.message),
    })
  );

  const joinMutation = useMutation(
    trpc.game.join.mutationOptions({
      onSuccess: (_, variables) => {
        setActiveGameId(variables.gameId);
      },
      onError: (err) => setError(err.message),
    })
  );

  const actionMutation = useMutation(
    trpc.game.action.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.game.get.queryOptions({ gameId: activeGameId! }).queryKey });
      },
      onError: (err) => setError(err.message),
    })
  );

  function handleCreate() {
    setError(null);
    createMutation.mutate({
      channelId,
      workspaceId,
      gameType: selectedType,
      config: getDefaultConfig(selectedType),
    });
  }

  function handleAction(action: string, data: Record<string, unknown> = {}) {
    if (!activeGameId) return;
    actionMutation.mutate({ gameId: activeGameId, action, data });
  }

  const game = activeGameData?.game as GameData | undefined;
  const players = (activeGameData?.players || []) as GamePlayerData[];
  const isCreator = game?.createdBy === userId;

  return (
    <div className="flex w-80 flex-col border-l border-zinc-800 bg-zinc-900">
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <h3 className="text-sm font-semibold text-zinc-100">🎮 Games</h3>
        <button
          onClick={() => {
            setActiveGameId(null);
            onClose();
          }}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-3 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Active game view */}
        {game ? (
          game.status === "waiting" ? (
            <WaitingView
              game={game}
              players={players}
              isCreator={isCreator}
              onStart={() => startMutation.mutate({ gameId: game.id })}
              onBack={() => setActiveGameId(null)}
              starting={startMutation.isPending}
            />
          ) : game.status === "finished" ? (
            <FinishedView
              players={players}
              onBack={() => setActiveGameId(null)}
            />
          ) : (
            <ActiveGameView
              game={game}
              players={players}
              userId={userId}
              onAction={handleAction}
            />
          )
        ) : (
          /* Lobby view */
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Games</h2>
              <button
                onClick={() => setCreating(!creating)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                {creating ? "Cancel" : "New Game"}
              </button>
            </div>

            {creating && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
                <p className="text-sm font-medium text-zinc-300">Choose a game:</p>
                <div className="grid grid-cols-2 gap-2">
                  {GAME_TYPES.map((type) => {
                    const info = GAME_INFO[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                          selectedType === type
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                        }`}
                      >
                        <span className="text-xl">{info.emoji}</span>
                        <span className="text-sm font-medium text-white">{info.name}</span>
                        <span className="text-xs text-zinc-400">{info.description}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? "Creating..." : `Create ${GAME_INFO[selectedType].name}`}
                </button>
              </div>
            )}

            {waitingGames && waitingGames.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-400">Open Games</p>
                {waitingGames.map((g) => {
                  const info = GAME_INFO[g.gameType as GameType];
                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info?.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{info?.name}</p>
                          <p className="text-xs text-zinc-400">Waiting...</p>
                        </div>
                      </div>
                      <button
                        onClick={() => joinMutation.mutate({ gameId: g.id })}
                        disabled={joinMutation.isPending}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              !creating && (
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-8 text-center">
                  <p className="text-3xl mb-2">🎮</p>
                  <p className="text-sm text-zinc-400">No games yet.</p>
                  <p className="text-xs text-zinc-500 mt-1">Create one to get started!</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WaitingView({
  game,
  players,
  isCreator,
  onStart,
  onBack,
  starting,
}: {
  game: GameData;
  players: GamePlayerData[];
  isCreator: boolean;
  onStart: () => void;
  onBack: () => void;
  starting: boolean;
}) {
  const info = GAME_INFO[game.gameType as GameType];
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Waiting for Players</h2>
        <p className="text-sm text-zinc-400 mt-1">{info?.emoji} {info?.name}</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Players ({players.length})</p>
        {players.map((p) => (
          <div key={p.userId} className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
              {(p.displayName || p.username)[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-white">{p.displayName || p.username}</span>
          </div>
        ))}
      </div>
      {isCreator ? (
        <button
          onClick={onStart}
          disabled={starting}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {starting ? "Starting..." : "Start Game"}
        </button>
      ) : (
        <p className="text-sm text-zinc-400">Waiting for the host to start...</p>
      )}
      <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-300">Back to lobby</button>
    </div>
  );
}

function FinishedView({ players, onBack }: { players: GamePlayerData[]; onBack: () => void }) {
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
          <div key={p.userId} className={`flex items-center justify-between rounded-lg border p-3 ${i === 0 ? "border-yellow-600/50 bg-yellow-900/20" : "border-zinc-700 bg-zinc-800/50"}`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{medals[i] || `#${i + 1}`}</span>
              <span className="text-sm font-medium text-white">{p.displayName || p.username}</span>
            </div>
            <span className="text-sm font-bold text-indigo-400">{p.score} pts</span>
          </div>
        ))}
      </div>
      <button onClick={onBack} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">Back to Lobby</button>
    </div>
  );
}

function ActiveGameView({
  game,
  players,
  userId,
  onAction,
}: {
  game: GameData;
  players: GamePlayerData[];
  userId: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}) {
  switch (game.gameType) {
    case "trivia":
      return <TriviaGame game={game} players={players} userId={userId} onAction={onAction} />;
    case "wordle":
      return <WordleGame game={game} players={players} userId={userId} onAction={onAction} />;
    case "tic_tac_toe":
      return <TicTacToeGame game={game} players={players} userId={userId} onAction={onAction} />;
    case "cards":
      return <CardsGame game={game} players={players} userId={userId} onAction={onAction} />;
    default:
      return <p className="p-4 text-zinc-400">Unknown game type</p>;
  }
}

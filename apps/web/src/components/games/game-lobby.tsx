"use client";

import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/stores/game-store";
import { useTRPC } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GameType, GameConfig } from "@superchat/shared";
import { GAME_TYPES } from "@superchat/shared";

const GAME_LABELS: Record<GameType, { name: string; description: string; emoji: string; minPlayers: number }> = {
  trivia: { name: "Trivia", description: "Test your knowledge!", emoji: "🧠", minPlayers: 1 },
  wordle: { name: "Wordle", description: "Guess the hidden word", emoji: "📝", minPlayers: 1 },
  tic_tac_toe: { name: "Tic Tac Toe", description: "Classic X and O", emoji: "❌", minPlayers: 2 },
  cards: { name: "Cards", description: "High card showdown", emoji: "🃏", minPlayers: 2 },
};

interface GameLobbyProps {
  channelId: string;
  workspaceId: string;
}

export function GameLobby({ channelId, workspaceId }: GameLobbyProps) {
  const { data: session } = useSession();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { activeGame, setActiveGame, setPlayers } = useGameStore();
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<GameType>("trivia");

  const { data: channelGames, isLoading } = useQuery({
    ...trpc.game.list.queryOptions({ channelId, status: "waiting" }),
    enabled: !!channelId,
  });

  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation(
    trpc.game.create.mutationOptions({
      onSuccess: (game) => {
        setError(null);
        setActiveGame(game as any);
        queryClient.invalidateQueries({ queryKey: trpc.game.list.queryOptions({ channelId, status: "waiting" }).queryKey });
        setCreating(false);

        const socket = getSocket();
        socket.emit("game:join", { gameId: game.id });
      },
      onError: (err) => {
        setError(err.message);
      },
    })
  );

  const joinMutation = useMutation(
    trpc.game.join.mutationOptions({
      onSuccess: (_, variables) => {
        const socket = getSocket();
        socket.emit("game:join", { gameId: variables.gameId });
      },
    })
  );

  function handleCreate() {
    if (!workspaceId) {
      setError("Workspace not loaded yet. Try again.");
      return;
    }
    setError(null);
    const config = getDefaultConfig(selectedType);
    createMutation.mutate({
      channelId,
      workspaceId,
      gameType: selectedType,
      config,
    });
  }

  function handleJoinGame(gameId: string) {
    joinMutation.mutate({ gameId });

    queryClient.fetchQuery(trpc.game.get.queryOptions({ gameId })).then((data) => {
      if (data) {
        setActiveGame(data.game as any);
        setPlayers(data.players as any);
      }
    });
  }

  return (
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

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {creating && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-300">Choose a game:</p>
          <div className="grid grid-cols-2 gap-2">
            {GAME_TYPES.map((type) => {
              const info = GAME_LABELS[type];
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
            disabled={createMutation.isPending || !workspaceId}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "Creating..." : `Create ${GAME_LABELS[selectedType].name} Game`}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-zinc-400">Loading games...</div>
      ) : channelGames && channelGames.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-400">Open Games</p>
          {channelGames.map((game) => {
            const info = GAME_LABELS[game.gameType as GameType];
            return (
              <div
                key={game.id}
                className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info?.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{info?.name}</p>
                    <p className="text-xs text-zinc-400">Waiting for players...</p>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinGame(game.id)}
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
            <p className="text-sm text-zinc-400">No games in this channel yet.</p>
            <p className="text-xs text-zinc-500 mt-1">Create one to get started!</p>
          </div>
        )
      )}
    </div>
  );
}

function getDefaultConfig(type: GameType): GameConfig {
  switch (type) {
    case "trivia":
      return { type: "trivia", questionCount: 10, timePerQuestion: 15 };
    case "wordle":
      return { type: "wordle", wordLength: 5, maxGuesses: 6 };
    case "tic_tac_toe":
      return { type: "tic_tac_toe", boardSize: 3 };
    case "cards":
      return { type: "cards", deckType: "standard", maxPlayers: 4 };
  }
}

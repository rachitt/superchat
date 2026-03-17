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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Plus,
  Gamepad2,
  Brain,
  PenTool,
  Grid3X3,
  Spade,
  Trophy,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GAME_INFO: Record<GameType, { name: string; description: string; icon: React.ReactNode }> = {
  trivia: { name: "Trivia", description: "Test your knowledge!", icon: <Brain className="h-5 w-5" /> },
  wordle: { name: "Wordle", description: "Guess the hidden word", icon: <PenTool className="h-5 w-5" /> },
  tic_tac_toe: { name: "Tic Tac Toe", description: "Classic X and O", icon: <Grid3X3 className="h-5 w-5" /> },
  cards: { name: "Cards", description: "High card showdown", icon: <Spade className="h-5 w-5" /> },
};

function getDefaultConfig(type: GameType): GameConfig {
  switch (type) {
    case "trivia": return { type: "trivia", questionCount: 5, timePerQuestion: 15 };
    case "wordle": return { type: "wordle", wordLength: 5, maxGuesses: 6 };
    case "tic_tac_toe": return { type: "tic_tac_toe", boardSize: 3 };
    case "cards": return { type: "cards", deckType: "standard", maxPlayers: 4 };
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

  const { data: activeGameData } = useQuery({
    ...trpc.game.get.queryOptions({ gameId: activeGameId! }),
    enabled: !!activeGameId,
    refetchInterval: 2000,
  });

  const { data: waitingGames } = useQuery({
    ...trpc.game.list.queryOptions({ channelId, status: "waiting" }),
    enabled: !activeGameId,
  });

  const createMutation = useMutation(
    trpc.game.create.mutationOptions({
      onSuccess: (game) => { setError(null); setActiveGameId(game.id); setCreating(false); },
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
      onSuccess: (_, variables) => { setActiveGameId(variables.gameId); },
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
    createMutation.mutate({ channelId, workspaceId, gameType: selectedType, config: getDefaultConfig(selectedType) });
  }

  function handleAction(action: string, data: Record<string, unknown> = {}) {
    if (!activeGameId) return;
    actionMutation.mutate({ gameId: activeGameId, action, data });
  }

  const game = activeGameData?.game as GameData | undefined;
  const players = (activeGameData?.players || []) as GamePlayerData[];
  const isCreator = game?.createdBy === userId;

  return (
    <div className="flex w-80 flex-col border-l border-border bg-card animate-slide-in-right">
      <div className="flex h-13 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Games</h3>
        </div>
        <button
          onClick={() => { setActiveGameId(null); onClose(); }}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

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
            <FinishedView players={players} onBack={() => setActiveGameId(null)} />
          ) : (
            <ActiveGameView game={game} players={players} userId={userId} onAction={handleAction} />
          )
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Play a game</h2>
              <button
                onClick={() => setCreating(!creating)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  creating
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                )}
              >
                {creating ? "Cancel" : <><Plus className="h-3.5 w-3.5" /> New Game</>}
              </button>
            </div>

            {creating && (
              <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3 animate-slide-up">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Choose a game</p>
                <div className="grid grid-cols-2 gap-2">
                  {GAME_TYPES.map((type) => {
                    const info = GAME_INFO[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all",
                          selectedType === type
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:border-border/80 hover:bg-accent/50"
                        )}
                      >
                        <span className={cn("text-muted-foreground", selectedType === type && "text-primary")}>
                          {info.icon}
                        </span>
                        <span className="text-sm font-medium text-foreground">{info.name}</span>
                        <span className="text-[11px] text-muted-foreground">{info.description}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                    </span>
                  ) : (
                    `Create ${GAME_INFO[selectedType].name}`
                  )}
                </button>
              </div>
            )}

            {waitingGames && waitingGames.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Open Games</p>
                {waitingGames.map((g) => {
                  const info = GAME_INFO[g.gameType as GameType];
                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{info?.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{info?.name}</p>
                          <p className="text-[11px] text-muted-foreground">Waiting for players...</p>
                        </div>
                      </div>
                      <button
                        onClick={() => joinMutation.mutate({ gameId: g.id })}
                        disabled={joinMutation.isPending}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Join
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              !creating && (
                <div className="flex flex-col items-center rounded-xl border border-border/50 bg-background/30 py-10">
                  <Gamepad2 className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">No active games</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Create one to get started!</p>
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
  game, players, isCreator, onStart, onBack, starting,
}: {
  game: GameData; players: GamePlayerData[]; isCreator: boolean;
  onStart: () => void; onBack: () => void; starting: boolean;
}) {
  const info = GAME_INFO[game.gameType as GameType];
  return (
    <div className="flex flex-col items-center gap-5 p-6 animate-float-up">
      <div className="text-center">
        <span className="text-muted-foreground">{info?.icon}</span>
        <h2 className="mt-2 text-lg font-bold text-foreground">Waiting for Players</h2>
        <p className="text-xs text-muted-foreground mt-1">{info?.name}</p>
      </div>
      <div className="w-full space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-3 w-3 text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Players ({players.length})
          </p>
        </div>
        {players.map((p) => (
          <div key={p.userId} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-2.5">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                {(p.displayName || p.username)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground">{p.displayName || p.username}</span>
          </div>
        ))}
      </div>
      {isCreator ? (
        <button
          onClick={onStart}
          disabled={starting}
          className="w-full rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {starting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting...</span> : "Start Game"}
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">Waiting for the host to start...</p>
      )}
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3 w-3" /> Back to lobby
      </button>
    </div>
  );
}

function FinishedView({ players, onBack }: { players: GamePlayerData[]; onBack: () => void }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ["text-yellow-400", "text-muted-foreground", "text-orange-500"];
  return (
    <div className="flex flex-col items-center gap-5 p-6 animate-float-up">
      <div className="text-center">
        <Trophy className="mx-auto h-10 w-10 text-yellow-400" />
        <h2 className="mt-2 text-lg font-bold text-foreground">Game Over!</h2>
      </div>
      <div className="w-full space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.userId}
            className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              i === 0 ? "border-yellow-600/30 bg-yellow-900/10" : "border-border bg-background/50"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("text-lg font-bold", medals[i] || "text-muted-foreground")}>
                #{i + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{p.displayName || p.username}</span>
            </div>
            <Badge variant="secondary" className="font-bold">{p.score} pts</Badge>
          </div>
        ))}
      </div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Lobby
      </button>
    </div>
  );
}

function ActiveGameView({
  game, players, userId, onAction,
}: {
  game: GameData; players: GamePlayerData[]; userId: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}) {
  switch (game.gameType) {
    case "trivia": return <TriviaGame game={game} players={players} userId={userId} onAction={onAction} />;
    case "wordle": return <WordleGame game={game} players={players} userId={userId} onAction={onAction} />;
    case "tic_tac_toe": return <TicTacToeGame game={game} players={players} userId={userId} onAction={onAction} />;
    case "cards": return <CardsGame game={game} players={players} userId={userId} onAction={onAction} />;
    default: return <p className="p-4 text-muted-foreground">Unknown game type</p>;
  }
}

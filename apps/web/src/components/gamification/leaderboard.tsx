"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LevelBadge } from "./level-badge";
import {
  Trophy,
  MessageSquare,
  Flame,
  Gamepad2,
  Zap,
  X,
  Crown,
  Medal,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
  workspaceId: string;
  onClose: () => void;
}

const CATEGORIES = [
  { key: "xp" as const, label: "XP", icon: Zap },
  { key: "messages" as const, label: "Messages", icon: MessageSquare },
  { key: "streaks" as const, label: "Streaks", icon: Flame },
  { key: "gameWins" as const, label: "Wins", icon: Gamepad2 },
];

const TIMEFRAMES = [
  { key: "weekly" as const, label: "This Week" },
  { key: "allTime" as const, label: "All Time" },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-400" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-[11px] font-bold text-zinc-500 tabular-nums w-4 text-center">{rank}</span>;
}

function formatValue(value: number, category: string) {
  if (category === "xp") return `${value.toLocaleString()} XP`;
  if (category === "streaks") return `${value}d`;
  return value.toLocaleString();
}

export function Leaderboard({ workspaceId, onClose }: LeaderboardProps) {
  const { data: session } = useSession();
  const [category, setCategory] = useState<"xp" | "messages" | "streaks" | "gameWins">("xp");
  const [timeframe, setTimeframe] = useState<"weekly" | "allTime">("allTime");

  const trpc = useTRPC();
  const { data: entries = [], isLoading } = useQuery(
    trpc.leaderboard.getLeaderboard.queryOptions({
      workspaceId,
      category,
      timeframe,
    })
  );

  return (
    <div className="flex h-full flex-col bg-zinc-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Leaderboard</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 border-b border-zinc-800/80 px-3 pt-2 pb-0">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-md px-3 py-2 text-[11px] font-semibold transition-colors",
                isActive
                  ? "bg-zinc-800/80 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
              )}
            >
              <Icon className="h-3 w-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Timeframe toggle */}
      <div className="flex gap-1 px-4 py-2.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTimeframe(tf.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
              timeframe === tf.key
                ? "bg-zinc-800 text-zinc-200 ring-1 ring-zinc-700"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Trophy className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">No data yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const isCurrentUser = entry.userId === session?.user?.id;
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    isCurrentUser
                      ? "bg-emerald-500/8 ring-1 ring-emerald-500/20"
                      : "hover:bg-zinc-800/50",
                    rank <= 3 && "py-2.5"
                  )}
                >
                  <div className="flex w-5 items-center justify-center shrink-0">
                    <RankIcon rank={rank} />
                  </div>

                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={entry.image ?? undefined} />
                    <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-zinc-400">
                      {(entry.name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "truncate text-xs font-medium",
                        isCurrentUser ? "text-emerald-300" : "text-zinc-200"
                      )}>
                        {entry.name ?? entry.username ?? "Unknown"}
                      </span>
                      <LevelBadge level={entry.level} size="sm" />
                    </div>
                  </div>

                  <span className={cn(
                    "text-xs font-bold tabular-nums shrink-0",
                    rank === 1 ? "text-amber-400" :
                    rank === 2 ? "text-zinc-300" :
                    rank === 3 ? "text-amber-600" :
                    "text-zinc-400"
                  )}>
                    {formatValue(entry.value, category)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useGamificationStore } from "@/stores/gamification-store";
import { LevelBadge } from "./level-badge";
import { Flame } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Level formula matching backend: level = floor(sqrt(xp / 100)) + 1 */
function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

export function XpProgress() {
  const { xp, level, streakDays } = useGamificationStore();
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progress = nextLevelXp > currentLevelXp
    ? ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 100;

  return (
    <div className="flex items-center gap-2.5 px-1">
      <LevelBadge level={level} size="md" />

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex-1 h-1.5 rounded-full bg-muted overflow-hidden cursor-default">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</p>
          <p className="text-[10px] text-muted-foreground">Level {level} → {level + 1}</p>
        </TooltipContent>
      </Tooltip>

      {streakDays > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-0.5 text-orange-400 cursor-default">
              <Flame className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold tabular-nums">{streakDays}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {streakDays} day streak
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

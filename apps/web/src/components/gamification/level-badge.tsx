"use client";

import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md";
  className?: string;
}

function getBadgeColor(level: number) {
  if (level >= 20) return "from-amber-400 to-yellow-500 text-amber-950 shadow-amber-500/25";
  if (level >= 15) return "from-teal-400 to-purple-500 text-teal-950 shadow-teal-500/25";
  if (level >= 10) return "from-cyan-400 to-blue-500 text-cyan-950 shadow-cyan-500/25";
  if (level >= 5) return "from-emerald-400 to-green-500 text-emerald-950 shadow-emerald-500/25";
  return "from-zinc-400 to-zinc-500 text-zinc-950 shadow-zinc-500/15";
}

export function LevelBadge({ level, size = "sm", className }: LevelBadgeProps) {
  const colorClass = getBadgeColor(level);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold leading-none shadow-sm",
        colorClass,
        size === "sm" && "h-4 min-w-4 px-1 text-[9px]",
        size === "md" && "h-5 min-w-5 px-1.5 text-[10px]",
        className
      )}
    >
      {level}
    </span>
  );
}

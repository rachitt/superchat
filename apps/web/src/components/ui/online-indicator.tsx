"use client";

import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  status: "online" | "away" | "offline";
  className?: string;
}

const statusColors = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-muted-foreground/40",
};

export function OnlineIndicator({ status, className }: OnlineIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full border-2 border-background",
        statusColors[status],
        className
      )}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

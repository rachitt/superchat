"use client";

import { Gamepad2 } from "lucide-react";

interface Props {
  total: number;
  completed: number;
  active: number;
}

export function GameStatsCard({ total, completed, active }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Gamepad2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">Total games</p>
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{completed}</span> completed
        </span>
        <span>
          <span className="font-medium text-foreground">{active}</span> active
        </span>
      </div>
    </div>
  );
}

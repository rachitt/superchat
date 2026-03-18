"use client";

import { Bot } from "lucide-react";

interface Props {
  totalAiMessages: number;
}

export function AiStatsCard({ totalAiMessages }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{totalAiMessages}</p>
          <p className="text-xs text-muted-foreground">AI messages (30d)</p>
        </div>
      </div>
    </div>
  );
}

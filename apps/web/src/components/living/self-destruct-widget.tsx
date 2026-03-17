"use client";

import { useState, useEffect, useMemo } from "react";

interface SelfDestructPayload {
  content: string;
  expiresAt: string;
}

interface SelfDestructWidgetProps {
  messageId: string;
  payload: SelfDestructPayload;
}

export function SelfDestructWidget({ messageId, payload }: SelfDestructWidgetProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  void tick;

  const expiresMs = new Date(payload.expiresAt).getTime();
  const diff = expiresMs - Date.now();
  const expired = diff <= 0;
  const totalSeconds = Math.max(0, Math.ceil(diff / 1000));

  // Compute opacity: fade from 1 → 0.15 over the last 30 seconds
  const opacity = useMemo(() => {
    if (expired) return 0.15;
    if (totalSeconds > 30) return 1;
    return 0.15 + (totalSeconds / 30) * 0.85;
  }, [expired, totalSeconds]);

  const formatTime = () => {
    if (expired) return "Expired";
    if (totalSeconds >= 3600) {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      return `${h}h ${m}m`;
    }
    if (totalSeconds >= 60) {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m}m ${s}s`;
    }
    return `${totalSeconds}s`;
  };

  const urgency = totalSeconds <= 10 && !expired;

  return (
    <div
      className="my-1 max-w-md rounded-lg border border-red-500/30 bg-muted/80 p-3 transition-opacity duration-1000"
      style={{ opacity }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-medium text-red-400">
          {expired ? "💀 Self-destructed" : "💣 Self-destruct"}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
            urgency
              ? "animate-pulse bg-red-500/30 text-red-300"
              : expired
                ? "bg-accent text-muted-foreground"
                : "bg-red-500/20 text-red-400"
          }`}
        >
          {formatTime()}
        </span>
      </div>
      <p className={`text-sm break-words ${expired ? "text-zinc-600 line-through" : "text-secondary-foreground"}`}>
        {payload.content}
      </p>
      {/* Burn progress bar */}
      {!expired && totalSeconds <= 60 && (
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min(100, (totalSeconds / 60) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

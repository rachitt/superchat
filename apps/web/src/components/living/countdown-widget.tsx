"use client";

import { useState, useEffect } from "react";

interface CountdownPayload {
  label: string;
  targetTime: string;
  status: "active" | "finished";
}

interface CountdownWidgetProps {
  messageId: string;
  payload: CountdownPayload;
}

function getRemaining(targetTime: string) {
  const diff = new Date(targetTime).getTime() - Date.now();
  if (diff <= 0) return { total: 0, h: 0, m: 0, s: 0 };
  const s = Math.floor((diff / 1000) % 60);
  const m = Math.floor((diff / 1000 / 60) % 60);
  const h = Math.floor(diff / 1000 / 3600);
  return { total: diff, h, m, s };
}

function getProgress(targetTime: string, createdApprox: number) {
  const target = new Date(targetTime).getTime();
  const now = Date.now();
  const total = target - createdApprox;
  if (total <= 0) return 0;
  const remaining = target - now;
  return Math.max(0, Math.min(1, remaining / total));
}

export function CountdownWidget({ messageId, payload }: CountdownWidgetProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (payload.status === "finished") return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [payload.status]);

  void tick;

  const { h, m, s, total } = getRemaining(payload.targetTime);
  const finished = payload.status === "finished" || total <= 0;

  // Approximate creation time for progress (use 1hr default duration estimate)
  const targetMs = new Date(payload.targetTime).getTime();
  const createdApprox = targetMs - 3600000; // fallback: assume 1hr countdown
  const progress = getProgress(payload.targetTime, createdApprox);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  return (
    <div className="my-1 flex max-w-sm items-center gap-4 rounded-lg border border-border bg-muted/80 p-4">
      {/* Progress ring */}
      <div className="relative shrink-0">
        <svg width="88" height="88" className="-rotate-90">
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="rgb(63 63 70)"
            strokeWidth="5"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={finished ? "rgb(239 68 68)" : "rgb(99 102 241)"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {finished ? (
            <span className="text-xs font-bold text-red-400">DONE</span>
          ) : (
            <span className="font-mono text-sm font-semibold text-foreground">
              {h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`}
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{payload.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {finished ? "Countdown finished" : `Ends ${new Date(payload.targetTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </p>
      </div>
    </div>
  );
}

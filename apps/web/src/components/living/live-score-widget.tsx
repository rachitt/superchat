"use client";

import { getSocket } from "@/lib/socket";
import { useSession } from "@/lib/auth-client";

interface Team {
  name: string;
  score: number;
  color?: string;
}

interface LiveScorePayload {
  title: string;
  teams: Team[];
  status: "live" | "finished";
  lastUpdate?: string;
}

interface LiveScoreWidgetProps {
  messageId: string;
  payload: LiveScorePayload;
}

export function LiveScoreWidget({ messageId, payload }: LiveScoreWidgetProps) {
  const isLive = payload.status === "live";
  const maxScore = Math.max(...payload.teams.map((t) => t.score), 1);

  return (
    <div className="my-1 max-w-sm rounded-lg border border-zinc-700 bg-zinc-800/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-100">{payload.title}</p>
        {isLive ? (
          <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        ) : (
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
            FINAL
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {payload.teams.map((team, i) => {
          const barWidth = maxScore > 0 ? (team.score / maxScore) * 100 : 0;
          const teamColor = team.color || (i === 0 ? "#6366f1" : "#f59e0b");
          const isLeading = team.score === maxScore && payload.teams.filter((t) => t.score === maxScore).length === 1;

          return (
            <div key={i} className="flex items-center gap-3">
              <span
                className={`w-24 truncate text-sm ${isLeading ? "font-semibold text-zinc-100" : "text-zinc-400"}`}
              >
                {team.name}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-zinc-700/50">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${barWidth}%`, backgroundColor: teamColor }}
                />
              </div>
              <span
                className={`w-8 text-right font-mono text-sm ${isLeading ? "font-bold text-zinc-100" : "text-zinc-400"}`}
              >
                {team.score}
              </span>
            </div>
          );
        })}
      </div>

      {payload.lastUpdate && (
        <p className="mt-2 text-[10px] text-zinc-600">
          Updated {new Date(payload.lastUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

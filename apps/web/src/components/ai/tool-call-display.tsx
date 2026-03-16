"use client";

import { useAiToolStore, type ToolCallEntry } from "@/stores/ai-tool-store";

interface ToolCallDisplayProps {
  messageId: string;
}

function formatToolResult(entry: ToolCallEntry): string {
  switch (entry.toolName) {
    case "createPoll":
      return "Poll created";
    case "startGame": {
      const gameType = (entry.args?.gameType as string) || (entry.result as any)?.gameType || "game";
      return `${gameType} started`;
    }
    case "searchMessages": {
      const res = entry.result as { count?: number } | undefined;
      const count = res?.count ?? 0;
      return `${count} message${count !== 1 ? "s" : ""} found`;
    }
    case "pinMessage": {
      const pin = entry.args?.pin !== false;
      return pin ? "Pinned" : "Unpinned";
    }
    case "getCurrentTime": {
      const res = entry.result as { currentTime?: string } | undefined;
      if (res?.currentTime) {
        return new Date(res.currentTime).toLocaleTimeString();
      }
      return "Time retrieved";
    }
    default:
      return "Done";
  }
}

function ToolCallPill({ entry }: { entry: ToolCallEntry }) {
  const isRunning = entry.status === "running";
  const isError = entry.status === "error";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isError
          ? "bg-red-500/10 text-red-400"
          : isRunning
            ? "bg-violet-500/10 text-violet-400"
            : "bg-emerald-500/10 text-emerald-400"
      }`}
    >
      {isRunning && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {isError && <span>✕</span>}
      {!isRunning && !isError && <span>✓</span>}
      <span>{entry.toolName}</span>
      {!isRunning && !isError && (
        <span className="text-[10px] opacity-75">— {formatToolResult(entry)}</span>
      )}
    </span>
  );
}

export function ToolCallDisplay({ messageId }: ToolCallDisplayProps) {
  const toolCalls = useAiToolStore((s) => s.toolCalls.get(messageId));

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {toolCalls.map((entry, i) => (
        <ToolCallPill key={`${entry.toolName}-${i}`} entry={entry} />
      ))}
    </div>
  );
}

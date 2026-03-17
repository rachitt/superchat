"use client";

import { useAiToolStore, type ToolCallEntry } from "@/stores/ai-tool-store";
import {
  BarChart3,
  Gamepad2,
  Search,
  Pin,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCallDisplayProps {
  messageId: string;
}

function getToolIcon(toolName: string) {
  const iconClass = "h-3 w-3";
  switch (toolName) {
    case "createPoll": return <BarChart3 className={iconClass} />;
    case "startGame": return <Gamepad2 className={iconClass} />;
    case "searchMessages": return <Search className={iconClass} />;
    case "pinMessage": return <Pin className={iconClass} />;
    case "getCurrentTime": return <Clock className={iconClass} />;
    default: return <Wrench className={iconClass} />;
  }
}

function formatToolResult(entry: ToolCallEntry): string {
  switch (entry.toolName) {
    case "createPoll": return "Poll created";
    case "startGame": {
      const gameType = (entry.args?.gameType as string) || (entry.result as any)?.gameType || "game";
      return `${gameType} started`;
    }
    case "searchMessages": {
      const res = entry.result as { count?: number } | undefined;
      const count = res?.count ?? 0;
      return `${count} message${count !== 1 ? "s" : ""} found`;
    }
    case "pinMessage": return (entry.args?.pin !== false) ? "Pinned" : "Unpinned";
    case "getCurrentTime": {
      const res = entry.result as { currentTime?: string } | undefined;
      if (res?.currentTime) return new Date(res.currentTime).toLocaleTimeString();
      return "Time retrieved";
    }
    default: return "Done";
  }
}

function ToolCallPill({ entry }: { entry: ToolCallEntry }) {
  const isRunning = entry.status === "running";
  const isError = entry.status === "error";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
        isError && "border-destructive/30 bg-destructive/10 text-destructive",
        isRunning && "border-teal-500/30 bg-teal-500/10 text-teal-400",
        !isRunning && !isError && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      )}
    >
      {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
      {isError && <XCircle className="h-3 w-3" />}
      {!isRunning && !isError && <CheckCircle2 className="h-3 w-3" />}
      {getToolIcon(entry.toolName)}
      <span>{entry.toolName}</span>
      {!isRunning && !isError && (
        <span className="opacity-60">— {formatToolResult(entry)}</span>
      )}
    </span>
  );
}

export function ToolCallDisplay({ messageId }: ToolCallDisplayProps) {
  const toolCalls = useAiToolStore((s) => s.toolCalls.get(messageId));

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {toolCalls.map((entry, i) => (
        <ToolCallPill key={`${entry.toolName}-${i}`} entry={entry} />
      ))}
    </div>
  );
}

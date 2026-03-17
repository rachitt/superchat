"use client";

import { useAiStore } from "@/stores/ai-store";
import { getSocket } from "@/lib/socket";
import { Sparkles, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SmartReplyBarProps {
  channelId: string;
  messageId: string;
  isLoading?: boolean;
}

export function SmartReplyBar({ channelId, messageId, isLoading }: SmartReplyBarProps) {
  const replies = useAiStore((s) => s.smartReplies.get(messageId));
  const clearSmartReplies = useAiStore((s) => s.clearSmartReplies);

  const handleReply = (reply: string) => {
    const socket = getSocket();
    socket.emit("message:send", { channelId, content: reply });
    clearSmartReplies(messageId);
  };

  if (isLoading) {
    return (
      <div className="mb-2 flex items-center gap-2 animate-slide-up">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    );
  }

  if (!replies || replies.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 animate-slide-up">
      <Sparkles className="h-3 w-3 text-teal-700 dark:text-teal-400" />
      {replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => handleReply(reply)}
          className="rounded-full border border-border bg-card px-3 py-1 text-xs text-secondary-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
          {reply}
        </button>
      ))}
      <button
        onClick={() => clearSmartReplies(messageId)}
        className="rounded-full p-1 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

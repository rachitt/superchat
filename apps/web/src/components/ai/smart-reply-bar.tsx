"use client";

import { useAiStore } from "@/stores/ai-store";
import { getSocket } from "@/lib/socket";

interface SmartReplyBarProps {
  channelId: string;
  messageId: string;
}

export function SmartReplyBar({ channelId, messageId }: SmartReplyBarProps) {
  const replies = useAiStore((s) => s.smartReplies.get(messageId));
  const clearSmartReplies = useAiStore((s) => s.clearSmartReplies);

  if (!replies || replies.length === 0) return null;

  const handleReply = (reply: string) => {
    const socket = getSocket();
    socket.emit("message:send", {
      channelId,
      content: reply,
    });
    clearSmartReplies(messageId);
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <span className="self-center text-xs text-zinc-500">Quick replies:</span>
      {replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => handleReply(reply)}
          className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300"
        >
          {reply}
        </button>
      ))}
      <button
        onClick={() => clearSmartReplies(messageId)}
        className="self-center text-xs text-zinc-600 hover:text-zinc-400"
      >
        Dismiss
      </button>
    </div>
  );
}

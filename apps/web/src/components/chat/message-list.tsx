"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { MessageItem } from "./message-item";

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const messages = useChatStore((s) => s.messages.get(channelId) ?? []);
  const typingUsers = useChatStore((s) => s.typingUsers.get(channelId));
  const bottomRef = useRef<HTMLDivElement>(null);

  // Only show top-level messages (not thread replies)
  const topLevelMessages = messages.filter((m) => !m.parentId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topLevelMessages.length]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mt-auto flex flex-col gap-0.5 py-4">
        {topLevelMessages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {typingUsers && typingUsers.size > 0 && (
        <div className="px-4 pb-2 text-xs text-zinc-500">
          {Array.from(typingUsers.values()).join(", ")}{" "}
          {typingUsers.size === 1 ? "is" : "are"} typing...
        </div>
      )}
    </div>
  );
}

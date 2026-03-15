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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mt-auto flex flex-col gap-0.5 py-4">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {typingUsers && typingUsers.size > 0 && (
        <div className="px-4 pb-2 text-xs text-zinc-500">
          {typingUsers.size === 1
            ? "Someone is typing..."
            : `${typingUsers.size} people are typing...`}
        </div>
      )}
    </div>
  );
}

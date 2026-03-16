"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { MessageItem } from "./message-item";
import { AiMessage } from "../ai/ai-message";

const EMPTY: never[] = [];

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const messages = useChatStore((s) => s.messages.get(channelId)) ?? EMPTY;
  const typingUsers = useChatStore((s) => s.typingUsers.get(channelId));
  const highlightedMessageId = useChatStore((s) => s.highlightedMessageId);
  const setHighlightedMessage = useChatStore((s) => s.setHighlightedMessage);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [localHighlight, setLocalHighlight] = useState<string | null>(null);

  const topLevelMessages = messages.filter((m) => !m.parentId);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!localHighlight) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [topLevelMessages.length, localHighlight]);

  // Pick up highlight from store, manage locally
  useEffect(() => {
    if (!highlightedMessageId) return;

    // Transfer to local state and clear store immediately
    setLocalHighlight(highlightedMessageId);
    setHighlightedMessage(null);

    // Scroll after a brief delay
    setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${highlightedMessageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    // Clear local highlight after 3s
    const timer = setTimeout(() => setLocalHighlight(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedMessageId, setHighlightedMessage]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mt-auto flex flex-col gap-0.5 py-4">
        {topLevelMessages.map((msg) =>
          msg.type === "system" ? (
            <AiMessage
              key={msg.id}
              messageId={msg.id}
              persistedContent={msg.content}
            />
          ) : (
            <MessageItem
              key={msg.id}
              message={msg}
              highlighted={msg.id === localHighlight}
            />
          )
        )}
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

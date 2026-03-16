"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { MessageItem } from "./message-item";
import { AiMessage } from "../ai/ai-message";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, MessageSquare } from "lucide-react";

const EMPTY: never[] = [];

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-5 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3.5 w-full max-w-md" />
        <Skeleton className="h-3.5 w-2/3 max-w-xs" />
      </div>
    </div>
  );
}

interface MessageListProps {
  channelId: string;
  loading?: boolean;
}

export function MessageList({ channelId, loading }: MessageListProps) {
  const messages = useChatStore((s) => s.messages.get(channelId)) ?? EMPTY;
  const typingUsers = useChatStore((s) => s.typingUsers.get(channelId));
  const highlightedMessageId = useChatStore((s) => s.highlightedMessageId);
  const setHighlightedMessage = useChatStore((s) => s.setHighlightedMessage);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [localHighlight, setLocalHighlight] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const topLevelMessages = messages.filter((m) => !m.parentId);

  // Track scroll position for scroll-to-bottom FAB
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll on new messages (only if near bottom)
  useEffect(() => {
    if (!localHighlight) {
      const el = scrollContainerRef.current;
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < 300) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [topLevelMessages.length, localHighlight]);

  // Pick up highlight from store
  useEffect(() => {
    if (!highlightedMessageId) return;
    setLocalHighlight(highlightedMessageId);
    setHighlightedMessage(null);
    setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${highlightedMessageId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    const timer = setTimeout(() => setLocalHighlight(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedMessageId, setHighlightedMessage]);

  // Group messages by date for separators
  let lastDate = "";

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mt-auto flex flex-col py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MessageSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="relative flex flex-1 flex-col overflow-y-auto"
    >
      <div className="mt-auto flex flex-col py-2">
        {topLevelMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 animate-float-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No messages yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start the conversation by sending a message below.
            </p>
          </div>
        )}

        {topLevelMessages.map((msg) => {
          const msgDate = formatDateLabel(msg.createdAt);
          const showDateSep = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {msgDate}
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>
              )}
              {msg.type === "system" ? (
                <AiMessage
                  messageId={msg.id}
                  persistedContent={msg.content}
                />
              ) : (
                <MessageItem
                  message={msg}
                  highlighted={msg.id === localHighlight}
                />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers && typingUsers.size > 0 && (
        <div className="flex items-center gap-2 px-5 pb-3 animate-slide-up">
          <div className="flex gap-1">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground">
            {Array.from(typingUsers.values()).join(", ")}{" "}
            {typingUsers.size === 1 ? "is" : "are"} typing
          </span>
        </div>
      )}

      {/* Scroll to bottom FAB */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all hover:bg-accent animate-slide-up"
        >
          <ArrowDown className="h-4 w-4 text-foreground" />
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { getSocket } from "@/lib/socket";
import { MessageItem } from "./message-item";
import { MAX_MESSAGE_LENGTH } from "@superchat/shared";
import { X, MessageSquare, SendHorizontal } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ThreadPanelProps {
  parentId: string;
  channelId: string;
}

export function ThreadPanel({ parentId, channelId }: ThreadPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const parentMessage = useChatStore((s) =>
    (s.messages.get(channelId) ?? []).find((m) => m.id === parentId)
  );
  const [content, setContent] = useState("");

  const threadQueryOptions = trpc.message.getThread.queryOptions({ parentId });
  const { data: replies } = useQuery(threadQueryOptions);

  // Refetch thread replies when a new message arrives for this thread
  const channelMessages = useChatStore((s) => s.messages.get(channelId));
  const threadReplyCount = channelMessages?.filter((m) => m.parentId === parentId).length ?? 0;
  const prevReplyCount = useRef(threadReplyCount);
  useEffect(() => {
    if (threadReplyCount > prevReplyCount.current) {
      queryClient.invalidateQueries({ queryKey: threadQueryOptions.queryKey });
    }
    prevReplyCount.current = threadReplyCount;
  }, [threadReplyCount, queryClient, threadQueryOptions.queryKey]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const socket = getSocket();
    socket.emit("message:send", { channelId, content: trimmed, parentId });
    setContent("");
  }, [content, channelId, parentId]);

  const replyCount = replies?.length ?? 0;

  return (
    <div className="flex w-80 flex-col border-l border-border bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex h-13 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Thread</h3>
          {replyCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveThread(null)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto">
        {parentMessage && (
          <div className="pb-1">
            <MessageItem message={parentMessage} showThread={false} />
            <Separator className="mx-5" />
          </div>
        )}

        <div className="flex flex-col py-1">
          {replies?.map((item) => (
            <MessageItem
              key={item.message.id}
              message={{
                id: item.message.id,
                channelId: item.message.channelId,
                authorId: item.message.authorId,
                type: item.message.type as any,
                content: item.message.content,
                parentId: item.message.parentId,
                createdAt: item.message.createdAt.toISOString(),
                author: item.author,
              }}
              showThread={false}
            />
          ))}

          {replyCount === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No replies yet. Start the conversation.
            </p>
          )}
        </div>
      </div>

      {/* Thread reply input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2 transition-colors focus-within:border-primary/40">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Reply..."
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm text-foreground placeholder-muted-foreground/60 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

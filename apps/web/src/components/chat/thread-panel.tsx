"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { getSocket } from "@/lib/socket";
import { MessageItem } from "./message-item";
import { MAX_MESSAGE_LENGTH } from "@superchat/shared";
import { X, MessageSquare, SendHorizontal, Sparkles, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  const [localSummary, setLocalSummary] = useState<string | null>(null);

  const threadQueryOptions = trpc.message.getThread.queryOptions({ parentId });
  const { data: replies } = useQuery(threadQueryOptions);

  const catchMeUpMutation = useMutation(trpc.ai.catchMeUp.mutationOptions());

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

  // Reset local summary when thread changes
  useEffect(() => {
    setLocalSummary(null);
  }, [parentId]);

  const handleCatchMeUp = useCallback(async () => {
    try {
      const result = await catchMeUpMutation.mutateAsync({ parentId });
      setLocalSummary(result.summary);
    } catch {
      // Error is handled by mutation state
    }
  }, [parentId, catchMeUpMutation]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const socket = getSocket();
    socket.emit("message:send", { channelId, content: trimmed, parentId });
    setContent("");
  }, [content, channelId, parentId]);

  const replyCount = replies?.length ?? 0;

  // Thread summary from payload or local state
  const payloadSummary = (parentMessage?.payload as Record<string, unknown> | undefined)?.threadSummary as string | undefined;
  const threadSummary = localSummary ?? payloadSummary ?? null;
  const summaryUpdatedAt = (parentMessage?.payload as Record<string, unknown> | undefined)?.summaryUpdatedAt as string | undefined;

  // Auto-generated thread title from parent content
  const threadTitle = parentMessage
    ? parentMessage.content.length > 40
      ? parentMessage.content.slice(0, 40).trim() + "..."
      : parentMessage.content
    : "Thread";

  return (
    <div className="flex w-80 flex-col border-l border-border bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex h-13 items-center justify-between border-b border-border px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="truncate text-sm font-semibold text-foreground" title={threadTitle}>
              {threadTitle}
            </h3>
          </div>
          {replyCount > 0 && (
            <span className="ml-6 text-[11px] text-muted-foreground">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveThread(null)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Thread Summary */}
        {(threadSummary || replyCount >= 5) && (
          <div className="relative mx-3 mt-3 mb-1 overflow-hidden rounded-lg border border-teal-500/15 bg-teal-500/[0.04]">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-teal-500/60 via-teal-500/40 to-transparent" />
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-teal-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400/80">
                    Summary
                  </span>
                </div>
                <button
                  onClick={handleCatchMeUp}
                  disabled={catchMeUpMutation.isPending}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all",
                    catchMeUpMutation.isPending
                      ? "text-teal-400/50 cursor-wait"
                      : "text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
                  )}
                >
                  <RefreshCw className={cn("h-2.5 w-2.5", catchMeUpMutation.isPending && "animate-spin")} />
                  {threadSummary ? "Refresh" : "Catch me up"}
                </button>
              </div>
              {threadSummary ? (
                <p className="mt-1.5 text-[12px] leading-relaxed text-secondary-foreground/90">
                  {threadSummary}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] italic text-muted-foreground/60">
                  Click "Catch me up" to generate a summary
                </p>
              )}
              {summaryUpdatedAt && !localSummary && (
                <span className="mt-1 block text-[10px] text-muted-foreground/40">
                  Updated {new Date(summaryUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        )}

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

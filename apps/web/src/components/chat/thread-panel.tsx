"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { getSocket } from "@/lib/socket";
import { MessageItem } from "./message-item";
import { MAX_MESSAGE_LENGTH } from "@superchat/shared";

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
    socket.emit("message:send", {
      channelId,
      content: trimmed,
      parentId,
    });
    setContent("");
  }, [content, channelId, parentId]);

  return (
    <div className="flex w-80 flex-col border-l border-zinc-800">
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <h3 className="text-sm font-semibold text-zinc-100">Thread</h3>
        <button
          onClick={() => setActiveThread(null)}
          className="text-zinc-400 hover:text-zinc-200"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {parentMessage && (
          <div className="border-b border-zinc-800 pb-2">
            <MessageItem message={parentMessage} showThread={false} />
          </div>
        )}

        <div className="flex flex-col gap-0.5 py-2">
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
        </div>
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2 rounded-lg bg-zinc-800 p-2">
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
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

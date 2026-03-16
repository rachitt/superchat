"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { getSocket } from "@/lib/socket";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { SearchDialog, useSearchShortcut } from "@/components/chat/search-dialog";

export default function ChannelPage() {
  const params = useParams<{ workspaceSlug: string; channelId: string }>();
  const channelId = params.channelId;
  const trpc = useTRPC();
  const { setActiveChannel, setMessages, activeThreadId } = useChatStore();
  const [showSearch, setShowSearch] = useState(false);
  const openSearch = useCallback(() => setShowSearch(true), []);
  useSearchShortcut(openSearch);

  const { data: workspace } = useQuery(
    trpc.workspace.getBySlug.queryOptions({ slug: params.workspaceSlug })
  );

  useEffect(() => {
    setActiveChannel(channelId);
    const socket = getSocket();
    socket.emit("channel:join", { channelId });
    return () => {
      socket.emit("channel:leave", { channelId });
    };
  }, [channelId, setActiveChannel]);

  const { data } = useQuery({
    ...trpc.message.list.queryOptions({ channelId }),
    enabled: !!channelId,
  });

  useEffect(() => {
    if (data?.items) {
      const msgs = data.items.map((item) => ({
        id: item.message.id,
        channelId: item.message.channelId,
        authorId: item.message.authorId,
        type: item.message.type as any,
        content: item.message.content,
        payload: item.message.payload as Record<string, unknown> | undefined,
        parentId: item.message.parentId,
        createdAt: item.message.createdAt.toISOString(),
        author: item.author,
      }));
      setMessages(channelId, msgs);
    }
  }, [data, channelId, setMessages]);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
          <div className="flex items-center">
            <span className="text-zinc-500 mr-1">#</span>
            <h2 className="text-sm font-semibold text-zinc-100">
              {channelId.slice(0, 8)}
            </h2>
          </div>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            title="Search (Cmd+K)"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </button>
        </div>
        <MessageList channelId={channelId} />
        <MessageInput channelId={channelId} />
      </div>
      {activeThreadId && <ThreadPanel parentId={activeThreadId} channelId={channelId} />}
      {workspace && (
        <SearchDialog
          workspaceId={workspace.id}
          open={showSearch}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

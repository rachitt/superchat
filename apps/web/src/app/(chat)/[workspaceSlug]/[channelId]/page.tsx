"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { getSocket } from "@/lib/socket";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { GamePanel } from "@/components/games/game-panel";

export default function ChannelPage() {
  const params = useParams<{ workspaceSlug: string; channelId: string }>();
  const channelId = params.channelId;
  const workspaceSlug = params.workspaceSlug;
  const trpc = useTRPC();
  const { setActiveChannel, setMessages, activeThreadId } = useChatStore();
  const [showGames, setShowGames] = useState(false);

  const { data: workspace } = useQuery(
    trpc.workspace.getBySlug.queryOptions({ slug: workspaceSlug })
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
            onClick={() => setShowGames(!showGames)}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
              showGames
                ? "bg-indigo-600/20 text-indigo-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
            title="Games"
          >
            🎮
          </button>
        </div>
        <MessageList channelId={channelId} />
        <MessageInput channelId={channelId} />
      </div>
      {activeThreadId && <ThreadPanel parentId={activeThreadId} channelId={channelId} />}
      {showGames && workspace?.id && (
        <GamePanel
          channelId={channelId}
          workspaceId={workspace.id}
          onClose={() => setShowGames(false)}
        />
      )}
    </div>
  );
}

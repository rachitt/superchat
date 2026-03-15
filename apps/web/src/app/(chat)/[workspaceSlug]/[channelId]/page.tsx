"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { getSocket } from "@/lib/socket";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ThreadPanel } from "@/components/chat/thread-panel";

export default function ChannelPage() {
  const params = useParams<{ channelId: string }>();
  const channelId = params.channelId;
  const trpc = useTRPC();
  const { setActiveChannel, setMessages, activeThreadId } = useChatStore();

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
        <div className="flex h-12 items-center border-b border-zinc-800 px-4">
          <span className="text-zinc-500 mr-1">#</span>
          <h2 className="text-sm font-semibold text-zinc-100">
            {channelId.slice(0, 8)}
          </h2>
        </div>
        <MessageList channelId={channelId} />
        <MessageInput channelId={channelId} />
      </div>
      {activeThreadId && <ThreadPanel parentId={activeThreadId} channelId={channelId} />}
    </div>
  );
}

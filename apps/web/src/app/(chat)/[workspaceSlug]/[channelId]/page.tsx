"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { useAiStore } from "@/stores/ai-store";
import { getSocket } from "@/lib/socket";
import { useAiSocket } from "@/hooks/use-ai";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { SummaryDialog } from "@/components/ai/summary-dialog";
import { GamePanel } from "@/components/games/game-panel";

export default function ChannelPage() {
  const params = useParams<{ workspaceSlug: string; channelId: string }>();
  const channelId = params.channelId;
  const workspaceSlug = params.workspaceSlug;
  const trpc = useTRPC();
  const { setActiveChannel, setMessages, activeThreadId } = useChatStore();
  const { setSummarizing, setSummary } = useAiStore();
  const [showSummary, setShowSummary] = useState(false);
  const [showGames, setShowGames] = useState(false);

  // Set up AI socket listeners
  useAiSocket();

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

  const summarizeMutation = useMutation(
    trpc.ai.summarize.mutationOptions()
  );

  const handleSummarize = useCallback(async () => {
    setShowSummary(true);
    setSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeMutation.mutateAsync({ channelId });
      setSummary(result.summary);
    } catch {
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setSummarizing(false);
    }
  }, [channelId, summarizeMutation, setSummarizing, setSummary]);

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleSummarize}
              className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              title="Summarize channel with AI"
            >
              Summarize
            </button>
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
        </div>
        <MessageList channelId={channelId} />
        <MessageInput channelId={channelId} />
      </div>
      {activeThreadId && <ThreadPanel parentId={activeThreadId} channelId={channelId} />}
      {showSummary && <SummaryDialog onClose={() => setShowSummary(false)} />}
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

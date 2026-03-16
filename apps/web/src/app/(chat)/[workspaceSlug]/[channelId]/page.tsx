"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat-store";
import { useAiStore } from "@/stores/ai-store";
import { useGameStore } from "@/stores/game-store";
import { getSocket } from "@/lib/socket";
import { useAiSocket } from "@/hooks/use-ai";
import { useGameSocket } from "@/hooks/use-game";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { SummaryDialog } from "@/components/ai/summary-dialog";
import { GamePanel } from "@/components/games/game-panel";
import { SearchDialog, useSearchShortcut } from "@/components/chat/search-dialog";
import {
  Hash,
  Search,
  Sparkles,
  Gamepad2,
  Users,
  Pin,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export default function ChannelPage() {
  const params = useParams<{ workspaceSlug: string; channelId: string }>();
  const channelId = params.channelId;
  const workspaceSlug = params.workspaceSlug;
  const trpc = useTRPC();
  const { setActiveChannel, setMessages, activeThreadId } = useChatStore();
  const { setSummarizing, setSummary } = useAiStore();
  const [showSummary, setShowSummary] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const pendingOpenGameId = useGameStore((s) => s.pendingOpenGameId);
  const setPendingOpenGameId = useGameStore((s) => s.setPendingOpenGameId);

  useEffect(() => {
    if (pendingOpenGameId) {
      setShowGames(true);
      setPendingOpenGameId(null);
    }
  }, [pendingOpenGameId, setPendingOpenGameId]);

  const [showSearch, setShowSearch] = useState(false);
  const openSearch = useCallback(() => setShowSearch(true), []);
  useSearchShortcut(openSearch);

  useAiSocket();
  useGameSocket();

  const { data: workspace } = useQuery(
    trpc.workspace.getBySlug.queryOptions({ slug: workspaceSlug })
  );

  // Get channel info from workspace channels list
  const { data: channels } = useQuery({
    ...trpc.channel.listByWorkspace.queryOptions({
      workspaceId: workspace?.id ?? "",
    }),
    enabled: !!workspace?.id,
  });
  const channel = channels?.find((c) => c.id === channelId);

  useEffect(() => {
    setActiveChannel(channelId);
    const socket = getSocket();
    socket.emit("channel:join", { channelId });
    return () => {
      socket.emit("channel:leave", { channelId });
    };
  }, [channelId, setActiveChannel]);

  const { data, isLoading: loadingMessages } = useQuery({
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

  const handleSummarize = useCallback(async (messageCount: number = 50) => {
    setSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeMutation.mutateAsync({ channelId, messageCount });
      setSummary(result.summary);
    } catch {
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setSummarizing(false);
    }
  }, [channelId, summarizeMutation, setSummarizing, setSummary]);

  const channelName = channel?.name ?? "Loading...";
  const channelDescription = channel?.description;

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        {/* Channel header */}
        <header className="flex h-13 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold text-foreground truncate">
              {channelName}
            </h2>
            {channelDescription && (
              <>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <p className="truncate text-xs text-muted-foreground">
                  {channelDescription}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSearch(true)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="ml-1 hidden rounded border border-border px-1 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">
                    ⌘K
                  </kbd>
                </button>
              </TooltipTrigger>
              <TooltipContent>Search messages</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSummary(true)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Summarize</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>AI Summary</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowGames(!showGames)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    showGames
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Games</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Games</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <MessageList channelId={channelId} loading={loadingMessages} />
        <MessageInput channelId={channelId} />
      </div>

      {activeThreadId && <ThreadPanel parentId={activeThreadId} channelId={channelId} />}

      {showSummary && (
        <SummaryDialog
          onClose={() => setShowSummary(false)}
          onSummarize={handleSummarize}
        />
      )}
      {showGames && workspace?.id && (
        <GamePanel
          channelId={channelId}
          workspaceId={workspace.id}
          onClose={() => setShowGames(false)}
        />
      )}
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

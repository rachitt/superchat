"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { MessagesChart } from "@/components/analytics/messages-chart";
import { UsersChart } from "@/components/analytics/users-chart";
import { ChannelsChart } from "@/components/analytics/channels-chart";
import { AiStatsCard } from "@/components/analytics/ai-stats-card";
import { GameStatsCard } from "@/components/analytics/game-stats-card";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const params = useParams<{ workspaceSlug: string }>();
  const trpc = useTRPC();

  const { data: workspace } = useQuery(
    trpc.workspace.getBySlug.queryOptions({ slug: params.workspaceSlug }),
  );

  const workspaceId = workspace?.id ?? "";

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    ...trpc.analytics.messagesPerDay.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    ...trpc.analytics.activeUsers.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const { data: channelsData, isLoading: loadingChannels } = useQuery({
    ...trpc.analytics.topChannels.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const { data: aiStats, isLoading: loadingAi } = useQuery({
    ...trpc.analytics.aiStats.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const { data: gameStats, isLoading: loadingGames } = useQuery({
    ...trpc.analytics.gameStats.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const isLoading = loadingMessages || loadingUsers || loadingChannels || loadingAi || loadingGames;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
          <p className="text-xs text-muted-foreground">Last 30 days overview</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        {isLoading ? (
          <div className="grid gap-5">
            <Skeleton className="h-72 rounded-xl" />
            <div className="grid grid-cols-2 gap-5">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {/* Messages over time — full width */}
            <MessagesChart data={messagesData ?? []} />

            {/* Active users + Top channels */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <UsersChart data={usersData ?? []} />
              <ChannelsChart data={channelsData ?? []} />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AiStatsCard totalAiMessages={aiStats?.totalAiMessages ?? 0} />
              <GameStatsCard
                total={gameStats?.total ?? 0}
                completed={gameStats?.completed ?? 0}
                active={gameStats?.active ?? 0}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

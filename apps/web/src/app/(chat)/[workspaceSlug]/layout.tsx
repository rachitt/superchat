"use client";

import { useParams } from "next/navigation";
import { WorkspaceSidebar } from "@/components/sidebar/workspace-sidebar";
import { BookmarkPanel } from "@/components/chat/bookmark-panel";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ workspaceSlug: string }>();
  const trpc = useTRPC();
  const showBookmarks = useUiStore((s) => s.showBookmarks);
  const setShowBookmarks = useUiStore((s) => s.setShowBookmarks);

  const { data: workspace, isLoading: loadingWorkspace } = useQuery(
    trpc.workspace.getBySlug.queryOptions({ slug: params.workspaceSlug })
  );

  const { data: channels } = useQuery({
    ...trpc.channel.listByWorkspace.queryOptions({
      workspaceId: workspace?.id ?? "",
    }),
    enabled: !!workspace?.id,
  });

  if (loadingWorkspace) {
    return (
      <div className="flex h-full">
        {/* Sidebar skeleton */}
        <div className="flex w-64 flex-col border-r border-border bg-sidebar p-4">
          <Skeleton className="mb-6 h-8 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-auto">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          <Skeleton className="h-13 w-full border-b border-border" />
          <div className="flex-1" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  return (
    <>
      <WorkspaceSidebar
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        channels={(channels ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }))}
      />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      {showBookmarks && (
        <BookmarkPanel onClose={() => setShowBookmarks(false)} />
      )}
    </>
  );
}

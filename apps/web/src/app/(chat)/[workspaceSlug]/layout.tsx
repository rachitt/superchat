"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceSidebar } from "@/components/sidebar/workspace-sidebar";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const trpc = useTRPC();

  const { data: workspace, isLoading: loadingWorkspace } = useQuery(
    trpc.workspace.getBySlug.queryOptions({ slug: params.workspaceSlug })
  );

  const { data: channels, isLoading: loadingChannels } = useQuery({
    ...trpc.channel.listByWorkspace.queryOptions({
      workspaceId: workspace?.id ?? "",
    }),
    enabled: !!workspace?.id,
  });

  if (loadingWorkspace) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-zinc-400">Loading workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-zinc-400">Workspace not found</div>
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
    </>
  );
}

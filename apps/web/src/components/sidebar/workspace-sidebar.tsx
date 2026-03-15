"use client";

import { ChannelList } from "./channel-list";

interface WorkspaceSidebarProps {
  workspaceName: string;
  channels: { id: string; name: string; type: string }[];
}

export function WorkspaceSidebar({
  workspaceName,
  channels,
}: WorkspaceSidebarProps) {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex h-12 items-center border-b border-zinc-800 px-4">
        <h2 className="text-sm font-semibold text-zinc-100 truncate">
          {workspaceName}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <ChannelList channels={channels} />
      </div>
    </aside>
  );
}

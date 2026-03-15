"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { ChannelList } from "./channel-list";
import { CreateChannelDialog } from "./create-channel-dialog";

interface WorkspaceSidebarProps {
  workspaceId: string;
  workspaceName: string;
  channels: { id: string; name: string; type: string }[];
}

export function WorkspaceSidebar({ workspaceId, workspaceName, channels }: WorkspaceSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <h2 className="text-sm font-semibold text-zinc-100 truncate">
          {workspaceName}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <ChannelList channels={channels} />
        <button
          onClick={() => setShowCreateChannel(true)}
          className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <span>+</span> Add channel
        </button>
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
            {session?.user?.name?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {session?.user?.name}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300"
            title="Sign out"
          >
            ↪
          </button>
        </div>
      </div>

      {showCreateChannel && (
        <CreateChannelDialog
          workspaceId={workspaceId}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
    </aside>
  );
}

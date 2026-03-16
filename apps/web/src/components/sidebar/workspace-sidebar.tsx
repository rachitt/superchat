"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { ChannelList } from "./channel-list";
import { CreateChannelDialog } from "./create-channel-dialog";
import { NotificationBell } from "../notifications/notification-bell";
import { BotSettingsDialog } from "./bot-settings-dialog";

interface WorkspaceSidebarProps {
  workspaceId: string;
  workspaceName: string;
  channels: { id: string; name: string; type: string }[];
}

export function WorkspaceSidebar({ workspaceId, workspaceName, channels }: WorkspaceSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showBotSettings, setShowBotSettings] = useState(false);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <h2 className="text-sm font-semibold text-zinc-100 truncate">
          {workspaceName}
        </h2>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setShowBotSettings(true)}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            title="Bot Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
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

      {showBotSettings && (
        <BotSettingsDialog
          workspaceId={workspaceId}
          onClose={() => setShowBotSettings(false)}
        />
      )}
    </aside>
  );
}

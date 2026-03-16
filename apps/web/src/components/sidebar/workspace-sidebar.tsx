"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronDown,
  Plus,
  Settings,
  LogOut,
  Bot,
  Hash,
  Bell,
} from "lucide-react";
import { ChannelList } from "./channel-list";
import { DmList } from "./dm-list";
import { CreateChannelDialog } from "./create-channel-dialog";
import { NotificationBell } from "../notifications/notification-bell";
import { BotSettingsDialog } from "./bot-settings-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkspaceSidebarProps {
  workspaceId: string;
  workspaceName: string;
  channels: { id: string; name: string; type: string }[];
}

export function WorkspaceSidebar({ workspaceId, workspaceName, channels }: WorkspaceSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams<{ workspaceSlug: string }>();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const regularChannels = channels.filter((c) => c.type !== "dm");
  const dmChannels = channels.filter((c) => c.type === "dm");
  const initials = session?.user?.name?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <aside
      className={`flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Workspace header */}
      <div className="flex h-13 items-center justify-between border-b border-border px-3">
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                {workspaceName[0]?.toUpperCase()}
              </div>
              <span className="truncate">{workspaceName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setShowBotSettings(true)}>
                <Bot className="mr-2 h-4 w-4" />
                Bot Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCollapsed(!collapsed)}>
                <Settings className="mr-2 h-4 w-4" />
                {collapsed ? "Expand" : "Collapse"} Sidebar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground transition-colors hover:opacity-90"
          >
            {workspaceName[0]?.toUpperCase()}
          </button>
        )}
        <div className="flex items-center gap-0.5">
          <NotificationBell />
        </div>
      </div>

      {/* Channel sections */}
      <div className="flex-1 overflow-y-auto py-3">
        {!collapsed ? (
          <>
            {/* Channels section */}
            <div className="mb-1">
              <div className="group flex items-center justify-between px-3 py-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Channels
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowCreateChannel(true)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Add channel</TooltipContent>
                </Tooltip>
              </div>
              <ChannelList channels={regularChannels} />
            </div>

            <Separator className="mx-3 my-3" />

            {/* DM section */}
            <DmList workspaceId={workspaceId} />

            {dmChannels.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center px-3 py-1">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Direct Messages
                  </span>
                </div>
                <ChannelList channels={dmChannels} />
              </div>
            )}
          </>
        ) : (
          /* Collapsed: icon-only channel list */
          <div className="flex flex-col items-center gap-1 px-1">
            {channels.slice(0, 8).map((channel) => (
              <Tooltip key={channel.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => router.push(`/${workspaceName}/${channel.id}`)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Hash className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{channel.name}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Add channel</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* User panel */}
      <div className="border-t border-border p-3">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {session?.user?.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Online
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (session?.user?.id) {
                    router.push(`/${params.workspaceSlug}/profile/${session.user.id}`);
                  }
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/${params.workspaceSlug}/settings`)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="mx-auto flex h-9 w-9 items-center justify-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image ?? undefined} />
                  <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{session?.user?.name}</TooltipContent>
          </Tooltip>
        )}
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

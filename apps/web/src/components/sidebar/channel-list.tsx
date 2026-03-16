"use client";

import { useParams, useRouter } from "next/navigation";
import { usePresenceStore } from "@/stores/presence-store";
import { OnlineIndicator } from "../ui/online-indicator";
import { Hash, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  type: string;
  dmUserId?: string;
}

interface ChannelListProps {
  channels: Channel[];
}

export function ChannelList({ channels }: ChannelListProps) {
  const params = useParams<{ workspaceSlug: string; channelId?: string }>();
  const router = useRouter();
  const presenceUsers = usePresenceStore((s) => s.users);

  return (
    <div className="flex flex-col gap-px px-2">
      {channels.map((channel) => {
        const isActive = params.channelId === channel.id;
        const isDm = channel.type === "dm";
        const dmPresence = channel.dmUserId
          ? presenceUsers.get(channel.dmUserId)
          : undefined;

        return (
          <button
            key={channel.id}
            onClick={() => router.push(`/${params.workspaceSlug}/${channel.id}`)}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150",
              isActive
                ? "bg-accent text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {isDm && dmPresence ? (
              <OnlineIndicator status={dmPresence.status} />
            ) : isDm ? (
              <MessageCircle className="h-4 w-4 shrink-0 opacity-50" />
            ) : (
              <Hash
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "opacity-40"
                )}
              />
            )}
            <span className="truncate">{channel.name}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { usePresenceStore } from "@/stores/presence-store";
import { OnlineIndicator } from "../ui/online-indicator";

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
    <div className="flex flex-col gap-0.5 px-2">
      <h3 className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Channels
      </h3>
      {channels.map((channel) => {
        const dmPresence = channel.dmUserId
          ? presenceUsers.get(channel.dmUserId)
          : undefined;

        return (
          <button
            key={channel.id}
            onClick={() => router.push(`/${params.workspaceSlug}/${channel.id}`)}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              params.channelId === channel.id
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {channel.type === "dm" && dmPresence ? (
              <OnlineIndicator status={dmPresence.status} />
            ) : (
              <span className="text-zinc-500">#</span>
            )}
            {channel.name}
          </button>
        );
      })}
    </div>
  );
}

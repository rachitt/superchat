"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { usePresenceStore } from "@/stores/presence-store";
import { OnlineIndicator } from "../ui/online-indicator";

interface DmListProps {
  workspaceId: string;
}

export function DmList({ workspaceId }: DmListProps) {
  const params = useParams<{ workspaceSlug: string; channelId?: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const presenceUsers = usePresenceStore((s) => s.users);

  const { data: dms } = useQuery({
    ...trpc.dm.list.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  if (!dms || dms.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-0.5 px-2">
      <h3 className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Direct Messages
      </h3>
      {dms.map((dm) => {
        if (!dm.otherUser) return null;
        const presence = presenceUsers.get(dm.otherUser.id);
        const isActive = params.channelId === dm.channelId;

        return (
          <button
            key={dm.channelId}
            onClick={() => router.push(`/${params.workspaceSlug}/${dm.channelId}`)}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="relative shrink-0">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-medium text-foreground">
                {dm.otherUser.image ? (
                  <img
                    src={dm.otherUser.image}
                    alt={dm.otherUser.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  dm.otherUser.name.slice(0, 1).toUpperCase()
                )}
              </div>
              {presence && (
                <OnlineIndicator
                  status={presence.status}
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2"
                />
              )}
            </div>
            <span className="truncate">{dm.otherUser.name}</span>
          </button>
        );
      })}
    </div>
  );
}

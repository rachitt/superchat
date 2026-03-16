"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore, type NotificationData } from "@/stores/notification-store";
import { useChatStore } from "@/stores/chat-store";

function relativeTime(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeIcon(type: string): string {
  switch (type) {
    case "mention": return "@";
    case "reply": return "\u21A9";
    case "invite": return "+";
    case "reminder": return "\u23F0";
    default: return "\u2022";
  }
}

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams<{ workspaceSlug: string }>();
  const setHighlightedMessage = useChatStore((s) => s.setHighlightedMessage);
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const storeMarkAsRead = useNotificationStore((s) => s.markAsRead);
  const storeMarkAllRead = useNotificationStore((s) => s.markAllRead);

  const { data } = useQuery({
    ...trpc.notification.list.queryOptions({ limit: 30 }),
  });

  // Merge server data with real-time store notifications, deduplicating by id
  const notifications = useMemo(() => {
    const serverItems: NotificationData[] = (data?.items ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data as Record<string, unknown> | undefined,
      createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date(n.createdAt).toISOString(),
      readAt: n.readAt ? (typeof n.readAt === "string" ? n.readAt : new Date(n.readAt).toISOString()) : null,
    }));

    const serverIds = new Set(serverItems.map((n) => n.id));
    const realtimeOnly = storeNotifications.filter((n) => !serverIds.has(n.id));
    return [...realtimeOnly, ...serverItems];
  }, [data, storeNotifications]);

  const markAllReadMutation = useMutation(
    trpc.notification.markAllRead.mutationOptions({
      onSuccess: () => {
        storeMarkAllRead();
        queryClient.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey({ limit: 30 }) });
      },
    })
  );

  const markReadMutation = useMutation(
    trpc.notification.markRead.mutationOptions()
  );

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.readAt) {
      storeMarkAsRead(notification.id);
      markReadMutation.mutate({ notificationId: notification.id });
    }

    const notifData = notification.data;
    if (notifData?.channelId && notifData?.messageId) {
      setHighlightedMessage(notifData.messageId as string);
      router.push(`/${params.workspaceSlug}/${notifData.channelId}`);
      onClose();
    }
  };

  return (
    <div
      data-notification-panel
      className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
        <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
        <button
          onClick={() => markAllReadMutation.mutate()}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-zinc-500">
            No notifications yet
          </p>
        )}

        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`flex w-full gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 ${
              !notification.readAt ? "bg-zinc-800/50" : ""
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-300">
              {typeIcon(notification.type)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-zinc-200">
                  {notification.title}
                </span>
                {!notification.readAt && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                {notification.body}
              </p>
              <span className="mt-0.5 text-[10px] text-zinc-500">
                {relativeTime(notification.createdAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

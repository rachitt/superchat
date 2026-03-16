"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore, type NotificationData } from "@/stores/notification-store";
import { useChatStore } from "@/stores/chat-store";
import { AtSign, Reply, UserPlus, Bell, Clock, CheckCheck } from "lucide-react";

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

function TypeIcon({ type }: { type: string }) {
  const iconClass = "h-3.5 w-3.5";
  switch (type) {
    case "mention": return <AtSign className={iconClass} />;
    case "reply": return <Reply className={iconClass} />;
    case "invite": return <UserPlus className={iconClass} />;
    case "reminder": return <Clock className={iconClass} />;
    default: return <Bell className={iconClass} />;
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
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-popover shadow-2xl animate-slide-down"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
        <button
          onClick={() => markAllReadMutation.mutate()}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <CheckCheck className="h-3 w-3" />
          Mark all read
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center py-10">
            <Bell className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">
              No notifications yet
            </p>
          </div>
        )}

        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
              !notification.readAt ? "bg-accent/30" : ""
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <TypeIcon type={notification.type} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-foreground">
                  {notification.title}
                </span>
                {!notification.readAt && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                {notification.body}
              </p>
              <span className="mt-1 block text-[10px] text-muted-foreground/60">
                {relativeTime(notification.createdAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

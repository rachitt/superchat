"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { useNotificationStore } from "@/stores/notification-store";

function playNotificationBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gain.gain.value = 0.1;
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch {
    // Web Audio not available
  }
}

export function useNotifications() {
  const initialized = useRef(false);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const trpc = useTRPC();

  const { data } = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
  });

  useEffect(() => {
    if (data?.count != null) {
      setUnreadCount(data.count);
    }
  }, [data?.count, setUnreadCount]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on("notification:new", (notification) => {
      addNotification({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        createdAt: notification.createdAt,
      });
      playNotificationBeep();
    });

    return () => {
      socket.off("notification:new");
      initialized.current = false;
    };
  }, [addNotification]);
}

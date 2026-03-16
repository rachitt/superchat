"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useNotificationStore } from "@/stores/notification-store";

export function useSocket() {
  const initialized = useRef(false);
  const { addMessage, updateMessage, removeMessage, setTyping, toggleReaction } =
    useChatStore();
  const setPresence = usePresenceStore((s) => s.setPresence);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on("message:new", (data) => {
      addMessage(data.channelId, data);
    });

    socket.on("message:updated", (data) => {
      updateMessage(data);
    });

    socket.on("message:deleted", ({ messageId, channelId }) => {
      removeMessage(messageId, channelId);
    });

    socket.on("typing:update", ({ channelId, userId, username, isTyping }) => {
      setTyping(channelId, userId, username, isTyping);
    });

    socket.on("message:reaction", ({ messageId, userId, emoji, action }) => {
      toggleReaction(messageId, userId, emoji, action);
    });

    socket.on("presence:changed", ({ userId, status }) => {
      setPresence(userId, status);
    });

    socket.on("notification:new", (data) => {
      addNotification({
        id: data.id,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data,
        createdAt: data.createdAt,
      });
    });

    return () => {
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("message:deleted");
      socket.off("typing:update");
      socket.off("message:reaction");
      socket.off("presence:changed");
      socket.off("notification:new");
      initialized.current = false;
    };
  }, [addMessage, updateMessage, removeMessage, setTyping, toggleReaction, setPresence, addNotification]);
}

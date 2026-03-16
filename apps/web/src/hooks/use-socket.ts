"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat-store";
import { usePresenceStore } from "@/stores/presence-store";

export function useSocket() {
  const initialized = useRef(false);
  const { addMessage, updateMessage, updateMessagePayload, removeMessage, setTyping, toggleReaction } =
    useChatStore();
  const setPresence = usePresenceStore((s) => s.setPresence);

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

    socket.on("living:update", ({ messageId, payload }) => {
      updateMessagePayload(messageId, payload);
    });

    return () => {
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("message:deleted");
      socket.off("typing:update");
      socket.off("message:reaction");
      socket.off("presence:changed");
      socket.off("living:update");
      initialized.current = false;
    };
  }, [addMessage, updateMessage, updateMessagePayload, removeMessage, setTyping, toggleReaction, setPresence]);
}

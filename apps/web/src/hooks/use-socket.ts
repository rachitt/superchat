"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat-store";

export function useSocket() {
  const initialized = useRef(false);
  const { addMessage, updateMessage, removeMessage, setTyping } = useChatStore();

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

    socket.on("typing:update", ({ channelId, userId, isTyping }) => {
      setTyping(channelId, userId, isTyping);
    });

    return () => {
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("message:deleted");
      socket.off("typing:update");
      initialized.current = false;
    };
  }, [addMessage, updateMessage, removeMessage, setTyping]);
}

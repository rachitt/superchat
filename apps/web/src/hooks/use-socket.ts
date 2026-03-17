"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useGamificationStore } from "@/stores/gamification-store";

export function useSocket() {
  const initialized = useRef(false);
  const { addMessage, updateMessage, updateMessagePayload, removeMessage, setTyping, toggleReaction } =
    useChatStore();
  const setPresence = usePresenceStore((s) => s.setPresence);
  const setLevel = useGamificationStore((s) => s.setLevel);

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

    socket.on("user:levelup", ({ newLevel, xp }) => {
      setLevel(newLevel, xp);
      toast("Level Up!", {
        description: `You reached level ${newLevel}!`,
        duration: 5000,
        icon: "🎉",
      });
    });

    return () => {
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("message:deleted");
      socket.off("typing:update");
      socket.off("message:reaction");
      socket.off("presence:changed");
      socket.off("living:update");
      socket.off("user:levelup");
      initialized.current = false;
    };
  }, [addMessage, updateMessage, updateMessagePayload, removeMessage, setTyping, toggleReaction, setPresence, setLevel]);
}

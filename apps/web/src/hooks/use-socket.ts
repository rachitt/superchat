"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useGamificationStore } from "@/stores/gamification-store";
import { useAiStore } from "@/stores/ai-store";

export function useSocket() {
  const initialized = useRef(false);
  const { addMessage, updateMessage, updateMessagePayload, removeMessage, setTyping, toggleReaction } =
    useChatStore();
  const setPresence = usePresenceStore((s) => s.setPresence);
  const setLevel = useGamificationStore((s) => s.setLevel);
  const addAgentStep = useAiStore((s) => s.addAgentStep);

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

    socket.on("ai:step", ({ messageId, step, toolName, description }) => {
      addAgentStep(messageId, { step, toolName, description, timestamp: Date.now() });
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
      socket.off("ai:step");
      initialized.current = false;
    };
  }, [addMessage, updateMessage, updateMessagePayload, removeMessage, setTyping, toggleReaction, setPresence, setLevel, addAgentStep]);
}

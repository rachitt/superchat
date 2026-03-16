"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useAiStore } from "@/stores/ai-store";
import { useChatStore } from "@/stores/chat-store";

/**
 * Hook that sets up AI-related Socket.IO listeners for streaming responses.
 */
export function useAiSocket() {
  const initialized = useRef(false);
  const { startStream, appendChunk, finishStream, errorStream } = useAiStore();
  const { updateMessage } = useChatStore();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on("ai:stream", ({ messageId, chunk }) => {
      // Start tracking if we haven't seen this stream yet
      const streams = useAiStore.getState().streams;
      if (!streams.has(messageId)) {
        startStream(messageId);
      }
      appendChunk(messageId, chunk);
    });

    socket.on("ai:stream:done", ({ messageId, content }) => {
      finishStream(messageId, content);
      // Update the message in the chat store with final content
      const streams = useAiStore.getState().streams;
      const stream = streams.get(messageId);
      if (stream) {
        // We need channelId from the message, but we can update by finding it
        updateMessage({
          id: messageId,
          content,
          channelId: "", // updateMessage matches by id across channels
          authorId: "",
          type: "system",
          createdAt: "",
        });
      }
    });

    socket.on("ai:stream:error", ({ messageId }) => {
      if (messageId) {
        errorStream(messageId);
      }
    });

    return () => {
      socket.off("ai:stream");
      socket.off("ai:stream:done");
      socket.off("ai:stream:error");
      initialized.current = false;
    };
  }, [startStream, appendChunk, finishStream, errorStream, updateMessage]);
}

/**
 * Hook for sending AI chat messages.
 */
export function useAiChat(channelId: string) {
  const sendAiMessage = useCallback(
    (message: string, parentId?: string | null) => {
      const socket = getSocket();
      socket.emit("ai:chat", { channelId, message, parentId });
    },
    [channelId]
  );

  const stopAiStream = useCallback((messageId: string) => {
    const socket = getSocket();
    socket.emit("ai:stop", { messageId });
  }, []);

  return { sendAiMessage, stopAiStream };
}

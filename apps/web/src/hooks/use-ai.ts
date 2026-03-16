"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useAiStore } from "@/stores/ai-store";
import { useAiToolStore } from "@/stores/ai-tool-store";
import { useChatStore } from "@/stores/chat-store";

/**
 * Hook that sets up AI-related Socket.IO listeners for streaming responses.
 */
export function useAiSocket() {
  const initialized = useRef(false);
  const { startStream, appendChunk, finishStream, errorStream } = useAiStore();
  const { addToolCall, completeToolCall } = useAiToolStore();
  const { updateMessage, setActiveThread } = useChatStore();

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

    socket.on("ai:stream:done", ({ messageId, content, parentId }) => {
      finishStream(messageId, content);
      // Update the message in the chat store with final content
      const streams = useAiStore.getState().streams;
      const stream = streams.get(messageId);
      if (stream) {
        updateMessage({
          id: messageId,
          content,
          channelId: "",
          authorId: "",
          type: "system",
          createdAt: "",
        });
      }
      // Auto-open thread panel when AI responds in a thread
      if (parentId) {
        setActiveThread(parentId);
      }
    });

    socket.on("ai:stream:error", ({ messageId }) => {
      if (messageId) {
        errorStream(messageId);
      }
    });

    socket.on("ai:tool_call", ({ messageId, toolName, args, result }) => {
      addToolCall(messageId, toolName, args);
      completeToolCall(messageId, toolName, result);
    });

    return () => {
      socket.off("ai:stream");
      socket.off("ai:stream:done");
      socket.off("ai:stream:error");
      socket.off("ai:tool_call");
      initialized.current = false;
    };
  }, [startStream, appendChunk, finishStream, errorStream, updateMessage, setActiveThread, addToolCall, completeToolCall]);
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

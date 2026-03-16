"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTRPC } from "@/lib/trpc";
import { useMutation } from "@tanstack/react-query";
import { useAiStore } from "@/stores/ai-store";
import { useChatStore } from "@/stores/chat-store";

/**
 * Hook that fetches smart reply suggestions for the latest message in a channel.
 * Only fetches when channel is active and user hasn't typed in 5 seconds.
 */
export function useSmartReplies(channelId: string) {
  const trpc = useTRPC();
  const lastFetchedMessageId = useRef<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTyping = useRef(false);

  const { setSmartReplies } = useAiStore();

  const mutation = useMutation(trpc.ai.smartReplies.mutationOptions());

  const fetchReplies = useCallback(
    (messageId: string) => {
      if (lastFetchedMessageId.current === messageId) return;
      lastFetchedMessageId.current = messageId;

      mutation.mutate(
        { channelId, messageId },
        {
          onSuccess: (data) => {
            setSmartReplies(messageId, data.replies);
          },
        }
      );
    },
    [channelId, mutation, setSmartReplies]
  );

  // Watch for new messages in the active channel
  useEffect(() => {
    const unsub = useChatStore.subscribe((state) => {
      const msgs = state.messages.get(channelId);
      if (!msgs || msgs.length === 0) return;
      const latest = msgs[msgs.length - 1];
      // Only suggest replies for non-system messages
      if (latest.type === "system") return;
      if (latest.id === lastFetchedMessageId.current) return;

      // Wait for user to stop typing before fetching
      if (isTyping.current) return;

      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        fetchReplies(latest.id);
      }, 5000);
    });

    return () => {
      unsub();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [channelId, fetchReplies]);

  const notifyTyping = useCallback(() => {
    isTyping.current = true;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
    }, 5000);
  }, []);

  return {
    isLoading: mutation.isPending,
    notifyTyping,
  };
}

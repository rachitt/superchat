import { create } from "zustand";
import type { MessageData } from "@superchat/shared";

interface MessageWithAuthor extends MessageData {
  author?: {
    id: string;
    username: string | null;
    name: string;
    image: string | null;
  };
}

interface Reaction {
  emoji: string;
  userIds: Set<string>;
}

interface ChatState {
  messages: Map<string, MessageWithAuthor[]>;
  activeChannelId: string | null;
  activeThreadId: string | null;
  highlightedMessageId: string | null;
  typingUsers: Map<string, Map<string, string>>; // channelId -> Map<userId, username>
  reactions: Map<string, Reaction[]>; // messageId -> reactions

  setActiveChannel: (channelId: string) => void;
  setActiveThread: (messageId: string | null) => void;
  setHighlightedMessage: (messageId: string | null) => void;
  addMessage: (channelId: string, message: MessageWithAuthor) => void;
  setMessages: (channelId: string, messages: MessageWithAuthor[]) => void;
  prependMessages: (channelId: string, messages: MessageWithAuthor[]) => void;
  updateMessage: (message: MessageData) => void;
  removeMessage: (messageId: string, channelId: string) => void;
  setTyping: (channelId: string, userId: string, username: string, isTyping: boolean) => void;
  updateMessagePayload: (messageId: string, payload: Record<string, unknown>) => void;
  toggleReaction: (messageId: string, userId: string, emoji: string, action: "add" | "remove") => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: new Map(),
  activeChannelId: null,
  activeThreadId: null,
  highlightedMessageId: null,
  typingUsers: new Map(),
  reactions: new Map(),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  setActiveThread: (messageId) => set({ activeThreadId: messageId }),
  setHighlightedMessage: (messageId) => set({ highlightedMessageId: messageId }),

  addMessage: (channelId, message) =>
    set((state) => {
      const updated = new Map(state.messages);
      const existing = updated.get(channelId) ?? [];
      // Skip if message already exists (dedup)
      if (existing.some((m) => m.id === message.id)) return state;
      // Insert in chronological order by createdAt
      const newMsgs = [...existing, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      updated.set(channelId, newMsgs);
      return { messages: updated };
    }),

  setMessages: (channelId, messages) =>
    set((state) => {
      const updated = new Map(state.messages);
      updated.set(channelId, messages);
      return { messages: updated };
    }),

  prependMessages: (channelId, messages) =>
    set((state) => {
      const updated = new Map(state.messages);
      const existing = updated.get(channelId) ?? [];
      updated.set(channelId, [...messages, ...existing]);
      return { messages: updated };
    }),

  updateMessage: (message) =>
    set((state) => {
      const updated = new Map(state.messages);
      const channelMessages = updated.get(message.channelId);
      if (channelMessages) {
        updated.set(
          message.channelId,
          channelMessages.map((m) => (m.id === message.id ? { ...m, ...message } : m))
        );
      }
      return { messages: updated };
    }),

  removeMessage: (messageId, channelId) =>
    set((state) => {
      const updated = new Map(state.messages);
      const channelMessages = updated.get(channelId);
      if (channelMessages) {
        updated.set(
          channelId,
          channelMessages.filter((m) => m.id !== messageId)
        );
      }
      return { messages: updated };
    }),

  setTyping: (channelId, userId, username, isTyping) =>
    set((state) => {
      const updated = new Map(state.typingUsers);
      const users = new Map(updated.get(channelId) ?? []);
      if (isTyping) users.set(userId, username);
      else users.delete(userId);
      updated.set(channelId, users);
      return { typingUsers: updated };
    }),

  updateMessagePayload: (messageId, payload) =>
    set((state) => {
      const updated = new Map(state.messages);
      for (const [channelId, msgs] of updated) {
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx >= 0) {
          const newMsgs = [...msgs];
          newMsgs[idx] = { ...newMsgs[idx], payload };
          updated.set(channelId, newMsgs);
          break;
        }
      }
      return { messages: updated };
    }),

  toggleReaction: (messageId, userId, emoji, action) =>
    set((state) => {
      const updated = new Map(state.reactions);
      const existing = [...(updated.get(messageId) ?? [])];
      const reactionIdx = existing.findIndex((r) => r.emoji === emoji);

      if (action === "add") {
        if (reactionIdx >= 0) {
          existing[reactionIdx] = {
            ...existing[reactionIdx],
            userIds: new Set([...existing[reactionIdx].userIds, userId]),
          };
        } else {
          existing.push({ emoji, userIds: new Set([userId]) });
        }
      } else if (reactionIdx >= 0) {
        const newUserIds = new Set(existing[reactionIdx].userIds);
        newUserIds.delete(userId);
        if (newUserIds.size === 0) {
          existing.splice(reactionIdx, 1);
        } else {
          existing[reactionIdx] = { ...existing[reactionIdx], userIds: newUserIds };
        }
      }

      updated.set(messageId, existing);
      return { reactions: updated };
    }),
}));

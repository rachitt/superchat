import { create } from "zustand";
import type { MessageData } from "@superchat/shared";

interface ChatState {
  messages: Map<string, MessageData[]>; // channelId -> messages
  activeChannelId: string | null;
  typingUsers: Map<string, Set<string>>; // channelId -> Set<userId>

  setActiveChannel: (channelId: string) => void;
  addMessage: (channelId: string, message: MessageData) => void;
  setMessages: (channelId: string, messages: MessageData[]) => void;
  updateMessage: (message: MessageData) => void;
  removeMessage: (messageId: string, channelId: string) => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: new Map(),
  activeChannelId: null,
  typingUsers: new Map(),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

  addMessage: (channelId, message) =>
    set((state) => {
      const updated = new Map(state.messages);
      const existing = updated.get(channelId) ?? [];
      updated.set(channelId, [...existing, message]);
      return { messages: updated };
    }),

  setMessages: (channelId, messages) =>
    set((state) => {
      const updated = new Map(state.messages);
      updated.set(channelId, messages);
      return { messages: updated };
    }),

  updateMessage: (message) =>
    set((state) => {
      const updated = new Map(state.messages);
      const channelMessages = updated.get(message.channelId);
      if (channelMessages) {
        updated.set(
          message.channelId,
          channelMessages.map((m) => (m.id === message.id ? message : m))
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

  setTyping: (channelId, userId, isTyping) =>
    set((state) => {
      const updated = new Map(state.typingUsers);
      const users = new Set(updated.get(channelId) ?? []);
      if (isTyping) users.add(userId);
      else users.delete(userId);
      updated.set(channelId, users);
      return { typingUsers: updated };
    }),
}));

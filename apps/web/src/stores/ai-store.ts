import { create } from "zustand";

interface AiStreamState {
  /** Content accumulated so far for a streaming message */
  content: string;
  /** Whether the stream is still active */
  isStreaming: boolean;
}

interface AiState {
  /** Active AI streams: messageId -> stream state */
  streams: Map<string, AiStreamState>;
  /** Smart reply suggestions: messageId -> replies */
  smartReplies: Map<string, string[]>;
  /** Whether a summarization is in progress */
  isSummarizing: boolean;
  /** Latest channel summary */
  summary: string | null;

  startStream: (messageId: string) => void;
  appendChunk: (messageId: string, chunk: string) => void;
  finishStream: (messageId: string, content: string) => void;
  errorStream: (messageId: string) => void;
  clearStream: (messageId: string) => void;
  setSmartReplies: (messageId: string, replies: string[]) => void;
  clearSmartReplies: (messageId: string) => void;
  setSummarizing: (isSummarizing: boolean) => void;
  setSummary: (summary: string | null) => void;
}

export const useAiStore = create<AiState>((set) => ({
  streams: new Map(),
  smartReplies: new Map(),
  isSummarizing: false,
  summary: null,

  startStream: (messageId) =>
    set((state) => {
      const streams = new Map(state.streams);
      streams.set(messageId, { content: "", isStreaming: true });
      return { streams };
    }),

  appendChunk: (messageId, chunk) =>
    set((state) => {
      const streams = new Map(state.streams);
      const existing = streams.get(messageId);
      if (existing) {
        streams.set(messageId, {
          ...existing,
          content: existing.content + chunk,
        });
      }
      return { streams };
    }),

  finishStream: (messageId, content) =>
    set((state) => {
      const streams = new Map(state.streams);
      streams.set(messageId, { content, isStreaming: false });
      return { streams };
    }),

  errorStream: (messageId) =>
    set((state) => {
      const streams = new Map(state.streams);
      const existing = streams.get(messageId);
      if (existing) {
        streams.set(messageId, { ...existing, isStreaming: false });
      }
      return { streams };
    }),

  clearStream: (messageId) =>
    set((state) => {
      const streams = new Map(state.streams);
      streams.delete(messageId);
      return { streams };
    }),

  setSmartReplies: (messageId, replies) =>
    set((state) => {
      const smartReplies = new Map(state.smartReplies);
      smartReplies.set(messageId, replies);
      return { smartReplies };
    }),

  clearSmartReplies: (messageId) =>
    set((state) => {
      const smartReplies = new Map(state.smartReplies);
      smartReplies.delete(messageId);
      return { smartReplies };
    }),

  setSummarizing: (isSummarizing) => set({ isSummarizing }),
  setSummary: (summary) => set({ summary }),
}));

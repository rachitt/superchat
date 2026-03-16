import { create } from "zustand";

export interface ToolCallEntry {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "running" | "done" | "error";
}

interface AiToolState {
  toolCalls: Map<string, ToolCallEntry[]>;
  addToolCall: (messageId: string, toolName: string, args: Record<string, unknown>) => void;
  completeToolCall: (messageId: string, toolName: string, result: unknown) => void;
  errorToolCall: (messageId: string, toolName: string) => void;
}

export const useAiToolStore = create<AiToolState>((set) => ({
  toolCalls: new Map(),

  addToolCall: (messageId, toolName, args) =>
    set((state) => {
      const toolCalls = new Map(state.toolCalls);
      const existing = toolCalls.get(messageId) ?? [];
      toolCalls.set(messageId, [...existing, { toolName, args, status: "running" }]);
      return { toolCalls };
    }),

  completeToolCall: (messageId, toolName, result) =>
    set((state) => {
      const toolCalls = new Map(state.toolCalls);
      const existing = toolCalls.get(messageId);
      if (existing) {
        const idx = existing.findIndex((t) => t.toolName === toolName && t.status === "running");
        if (idx >= 0) {
          const updated = [...existing];
          updated[idx] = { ...updated[idx], result, status: "done" };
          toolCalls.set(messageId, updated);
        }
      }
      return { toolCalls };
    }),

  errorToolCall: (messageId, toolName) =>
    set((state) => {
      const toolCalls = new Map(state.toolCalls);
      const existing = toolCalls.get(messageId);
      if (existing) {
        const idx = existing.findIndex((t) => t.toolName === toolName && t.status === "running");
        if (idx >= 0) {
          const updated = [...existing];
          updated[idx] = { ...updated[idx], status: "error" };
          toolCalls.set(messageId, updated);
        }
      }
      return { toolCalls };
    }),
}));

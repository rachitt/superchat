import { create } from "zustand";

interface PresenceEntry {
  status: "online" | "away" | "offline";
  lastSeen: string;
}

interface PresenceState {
  users: Map<string, PresenceEntry>;
  setPresence: (userId: string, status: "online" | "away" | "offline") => void;
  bulkSetPresence: (entries: { userId: string; status: "online" | "away" | "offline" }[]) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  users: new Map(),

  setPresence: (userId, status) =>
    set((state) => {
      const users = new Map(state.users);
      users.set(userId, { status, lastSeen: new Date().toISOString() });
      return { users };
    }),

  bulkSetPresence: (entries) =>
    set((state) => {
      const users = new Map(state.users);
      const now = new Date().toISOString();
      for (const { userId, status } of entries) {
        users.set(userId, { status, lastSeen: now });
      }
      return { users };
    }),
}));

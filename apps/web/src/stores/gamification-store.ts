import { create } from "zustand";

interface GamificationState {
  xp: number;
  level: number;
  streakDays: number;
  setStats: (xp: number, level: number, streakDays: number) => void;
  setLevel: (level: number, xp: number) => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  xp: 0,
  level: 1,
  streakDays: 0,

  setStats: (xp, level, streakDays) => set({ xp, level, streakDays }),
  setLevel: (level, xp) => set({ level, xp }),
}));

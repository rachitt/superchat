import { create } from "zustand";

interface UiState {
  showBookmarks: boolean;
  toggleBookmarks: () => void;
  setShowBookmarks: (show: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  showBookmarks: false,
  toggleBookmarks: () => set((s) => ({ showBookmarks: !s.showBookmarks })),
  setShowBookmarks: (show) => set({ showBookmarks: show }),
}));

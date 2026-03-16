import { create } from "zustand";
import type { GameData, GameState, GamePlayerData } from "@superchat/shared";

interface GameStoreState {
  activeGame: GameData | null;
  players: GamePlayerData[];
  channelGames: Map<string, GameData[]>;

  setActiveGame: (game: GameData | null) => void;
  setPlayers: (players: GamePlayerData[]) => void;
  updatePlayer: (player: GamePlayerData) => void;
  removePlayer: (userId: string) => void;
  updateGameState: (state: GameState) => void;
  finishGame: (state: GameState) => void;
  setChannelGames: (channelId: string, games: GameData[]) => void;
  addChannelGame: (channelId: string, game: GameData) => void;
  updateChannelGame: (game: GameData) => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  activeGame: null,
  players: [],
  channelGames: new Map(),

  setActiveGame: (game) => set({ activeGame: game }),

  setPlayers: (players) => set({ players }),

  updatePlayer: (player) =>
    set((state) => {
      const existing = state.players.findIndex((p) => p.userId === player.userId);
      if (existing >= 0) {
        const updated = [...state.players];
        updated[existing] = player;
        return { players: updated };
      }
      return { players: [...state.players, player] };
    }),

  removePlayer: (userId) =>
    set((state) => ({
      players: state.players.filter((p) => p.userId !== userId),
    })),

  updateGameState: (gameState) =>
    set((state) => {
      if (!state.activeGame) return {};
      return {
        activeGame: { ...state.activeGame, state: gameState, status: "in_progress" },
      };
    }),

  finishGame: (gameState) =>
    set((state) => {
      if (!state.activeGame) return {};
      return {
        activeGame: { ...state.activeGame, state: gameState, status: "finished" },
      };
    }),

  setChannelGames: (channelId, games) =>
    set((state) => {
      const updated = new Map(state.channelGames);
      updated.set(channelId, games);
      return { channelGames: updated };
    }),

  addChannelGame: (channelId, game) =>
    set((state) => {
      const updated = new Map(state.channelGames);
      const existing = updated.get(channelId) ?? [];
      updated.set(channelId, [game, ...existing]);
      return { channelGames: updated };
    }),

  updateChannelGame: (game) =>
    set((state) => {
      const updated = new Map(state.channelGames);
      const channelGames = updated.get(game.channelId);
      if (channelGames) {
        updated.set(
          game.channelId,
          channelGames.map((g) => (g.id === game.id ? game : g))
        );
      }
      return { channelGames: updated };
    }),

  reset: () => set({ activeGame: null, players: [] }),
}));

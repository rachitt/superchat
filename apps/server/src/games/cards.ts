import type {
  GameConfig,
  GameState,
  GamePlayerData,
  CardsState,
  CardsConfig,
} from "@superchat/shared";
import type { GameEngine, GameActionResult } from "./base.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck(): string[] {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cardValue(card: string): number {
  const rank = card.slice(0, -1);
  const idx = RANKS.indexOf(rank);
  return idx + 2; // 2=2, ..., A=14
}

// Simple "High Card" game: each round players play a card, highest wins
export const cardsEngine: GameEngine = {
  minPlayers: 2,
  maxPlayers: 6,

  initState(config: GameConfig, players: GamePlayerData[]): GameState {
    const deck = shuffleDeck(createDeck());
    const cardsPerPlayer = Math.floor(deck.length / players.length);
    const hands: Record<string, string[]> = {};
    const scores: Record<string, number> = {};
    const turnOrder = players.map((p) => p.userId);

    players.forEach((p, i) => {
      hands[p.userId] = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
      scores[p.userId] = 0;
    });

    return {
      type: "cards",
      hands,
      deck: [],
      discard: [],
      currentTurnUserId: turnOrder[0] || null,
      turnOrder,
      scores,
      phase: "playing",
      cardsPlayedThisRound: 0,
    };
  },

  handleAction(
    state: GameState,
    playerId: string,
    action: string,
    data: Record<string, unknown>,
    players: GamePlayerData[]
  ): GameActionResult {
    const s = state as CardsState & { type: "cards" };

    if (action === "play_card" && s.phase === "playing") {
      if (s.currentTurnUserId !== playerId) {
        return { state, finished: false };
      }

      const cardIndex = data.cardIndex as number;
      const hand = s.hands[playerId];
      if (!hand || typeof cardIndex !== "number" || cardIndex < 0 || cardIndex >= hand.length) {
        return { state, finished: false };
      }

      const card = hand[cardIndex];
      const newHands = { ...s.hands };
      newHands[playerId] = hand.filter((_, i) => i !== cardIndex);
      const newDiscard = [...s.discard, card];

      // Track how many cards have been played this round
      const cardsPlayedThisRound = (s.cardsPlayedThisRound || 0) + 1;
      const currentIdx = s.turnOrder.indexOf(playerId);
      const nextIdx = (currentIdx + 1) % s.turnOrder.length;
      const isRoundEnd = cardsPlayedThisRound === s.turnOrder.length;

      const newScores = { ...s.scores };

      if (isRoundEnd) {
        // Evaluate round: last N cards in discard (one per player)
        const roundSize = s.turnOrder.length;
        const roundPlayedCards = newDiscard.slice(-roundSize);
        let highestValue = -1;
        let roundWinner = playerId;

        roundPlayedCards.forEach((c, i) => {
          const val = cardValue(c);
          if (val > highestValue) {
            highestValue = val;
            roundWinner = s.turnOrder[i];
          }
        });

        newScores[roundWinner] = (newScores[roundWinner] || 0) + 10;
      }

      // Check if game is over (any player out of cards)
      const anyEmpty = Object.values(newHands).some((h) => h.length === 0);

      if (anyEmpty) {
        return {
          state: {
            ...s,
            hands: newHands,
            discard: newDiscard,
            scores: newScores,
            phase: "finished",
            currentTurnUserId: null,
            cardsPlayedThisRound: 0,
          },
          finished: true,
        };
      }

      return {
        state: {
          ...s,
          hands: newHands,
          discard: newDiscard,
          scores: newScores,
          currentTurnUserId: s.turnOrder[nextIdx],
          cardsPlayedThisRound: isRoundEnd ? 0 : cardsPlayedThisRound,
        },
        finished: false,
      };
    }

    return { state, finished: false };
  },

  handleTimeout(state: GameState, players: GamePlayerData[]): GameActionResult {
    return { state, finished: false };
  },
};

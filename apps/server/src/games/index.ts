import type { GameType } from "@superchat/shared";
import type { GameEngine } from "./base.js";
import { triviaEngine } from "./trivia.js";
import { wordleEngine } from "./wordle.js";
import { ticTacToeEngine } from "./tic-tac-toe.js";
import { cardsEngine } from "./cards.js";

const engines: Record<string, GameEngine> = {
  trivia: triviaEngine,
  wordle: wordleEngine,
  tic_tac_toe: ticTacToeEngine,
  cards: cardsEngine,
};

export function getGameEngine(gameType: GameType): GameEngine {
  const engine = engines[gameType];
  if (!engine) {
    throw new Error(`No engine registered for game type: ${gameType}`);
  }
  return engine;
}

export type { GameEngine, GameActionResult } from "./base.js";

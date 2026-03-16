import type {
  GameConfig,
  GameState,
  GamePlayerData,
  WordleState,
  WordleConfig,
  LetterResult,
} from "@superchat/shared";
import type { GameEngine, GameActionResult } from "./base.js";

const FIVE_LETTER_WORDS = [
  "crane", "slate", "trace", "crate", "stare", "share", "blaze", "flame",
  "grape", "brave", "gleam", "dream", "cream", "steam", "beach", "peach",
  "reach", "teach", "leach", "feast", "beast", "yeast", "least", "toast",
  "roast", "coast", "boast", "blast", "clamp", "champ", "stamp", "swamp",
  "crisp", "clasp", "grasp", "brisk", "whisk", "twist", "drift", "grift",
  "shift", "swift", "theft", "shelf", "dwell", "swell", "spell", "shell",
  "skull", "skill", "spill", "still", "stall", "small", "shawl", "crawl",
  "drawl", "growl", "prowl", "scowl", "vowel", "towel", "jewel", "level",
  "novel", "model", "moral", "coral", "focal", "local", "vocal", "total",
  "vital", "metal", "petal", "royal", "loyal", "solar", "polar", "lunar",
  "sugar", "cedar", "radar", "sonar", "tiger", "river", "liver", "giver",
  "diver", "miner", "liner", "diner", "finer", "wiser", "rider", "wider",
  "cider", "elder", "under", "other", "outer", "water", "later", "after",
  "super", "paper", "power", "tower", "lower", "mower", "sewer", "newer",
  "fewer", "lever", "never", "fever", "seven", "given", "often", "alien",
  "queen", "green", "sheen", "wheel", "steel", "kneel", "sleep", "sweep",
  "creep", "steep", "sheep", "cheek", "sleek", "creek", "flute", "brute",
  "crude", "prude", "truce", "juice", "sauce", "dance", "lance", "prance",
  "plant", "grant", "giant", "paint", "faint", "saint", "brain", "train",
  "chain", "plain", "stain", "grain", "claim", "chair", "stair",
];

const FOUR_LETTER_WORDS = [
  "word", "game", "play", "time", "love", "hope", "fire", "rain", "snow",
  "star", "moon", "tree", "bird", "fish", "cake", "book", "door", "wall",
  "hand", "face", "mind", "soul", "life", "dark", "blue", "gold", "bold",
  "cold", "warm", "fast", "slow", "tall", "wise", "kind", "calm", "wild",
];

function getWordList(length: number): string[] {
  if (length === 4) return FOUR_LETTER_WORDS;
  return FIVE_LETTER_WORDS;
}

function evaluateGuess(guess: string, target: string): LetterResult[] {
  const result: LetterResult[] = new Array(guess.length).fill("absent");
  const targetChars = target.split("");
  const used = new Array(target.length).fill(false);

  // First pass: mark correct positions
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === targetChars[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }

  // Second pass: mark present (wrong position)
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < targetChars.length; j++) {
      if (!used[j] && guess[i] === targetChars[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

export const wordleEngine: GameEngine = {
  minPlayers: 1,
  maxPlayers: 8,

  initState(config: GameConfig, players: GamePlayerData[]): GameState {
    const c = config as WordleConfig & { type: "wordle" };
    const wordList = getWordList(c.wordLength);
    const targetWord = wordList[Math.floor(Math.random() * wordList.length)];
    const scores: Record<string, number> = {};
    const turnOrder = players.map((p) => p.userId);
    players.forEach((p) => (scores[p.userId] = 0));

    return {
      type: "wordle",
      targetWord,
      guesses: [],
      currentTurnUserId: turnOrder[0] || null,
      turnOrder,
      scores,
      phase: "playing",
      maxGuesses: c.maxGuesses,
      wordLength: c.wordLength,
    };
  },

  handleAction(
    state: GameState,
    playerId: string,
    action: string,
    data: Record<string, unknown>,
    players: GamePlayerData[]
  ): GameActionResult {
    const s = state as WordleState & { type: "wordle" };

    if (action === "guess" && s.phase === "playing") {
      const guess = (data.word as string || "").toLowerCase().trim();

      if (guess.length !== s.wordLength) {
        return { state, finished: false };
      }

      if (!/^[a-z]+$/.test(guess)) {
        return { state, finished: false };
      }

      const result = evaluateGuess(guess, s.targetWord);
      const newGuesses = [...s.guesses, { userId: playerId, word: guess, result }];

      const isCorrect = result.every((r) => r === "correct");
      const newScores = { ...s.scores };

      // Advance turn to next player
      const currentIdx = s.turnOrder.indexOf(playerId);
      const nextIdx = (currentIdx + 1) % s.turnOrder.length;
      const nextPlayer = s.turnOrder[nextIdx];

      if (isCorrect) {
        // Player who guessed correctly gets bonus points based on remaining guesses
        const remainingGuesses = s.maxGuesses - newGuesses.length;
        newScores[playerId] = (newScores[playerId] || 0) + 100 + remainingGuesses * 20;

        return {
          state: {
            ...s,
            guesses: newGuesses,
            scores: newScores,
            phase: "won",
            currentTurnUserId: null,
          },
          finished: true,
          announcement: `Solved it! The word was "${s.targetWord}"`,
        };
      }

      if (newGuesses.length >= s.maxGuesses) {
        return {
          state: {
            ...s,
            guesses: newGuesses,
            scores: newScores,
            phase: "lost",
            currentTurnUserId: null,
          },
          finished: true,
          announcement: `Out of guesses! The word was "${s.targetWord}"`,
        };
      }

      // Award small points for each guess
      newScores[playerId] = (newScores[playerId] || 0) + result.filter((r) => r === "correct").length * 10 + result.filter((r) => r === "present").length * 5;

      return {
        state: {
          ...s,
          guesses: newGuesses,
          scores: newScores,
          currentTurnUserId: nextPlayer,
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

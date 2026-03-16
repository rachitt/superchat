import type { GameType, GameStatus } from "../constants";

// ── Core game data shapes ──

export interface GameData {
  id: string;
  workspaceId: string;
  channelId: string;
  gameType: GameType;
  status: GameStatus;
  config: GameConfig;
  state: GameState;
  createdBy: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface GamePlayerData {
  gameId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  score: number;
  data: Record<string, unknown>;
  joinedAt: string;
}

// ── Game configs (per game type) ──

export interface TriviaConfig {
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  questionCount: number;
  timePerQuestion: number; // seconds
}

export interface WordleConfig {
  wordLength: number;
  maxGuesses: number;
}

export interface TicTacToeConfig {
  boardSize: number; // 3 for standard
}

export interface CardsConfig {
  deckType: "standard" | "custom";
  maxPlayers: number;
}

export type GameConfig =
  | ({ type: "trivia" } & TriviaConfig)
  | ({ type: "wordle" } & WordleConfig)
  | ({ type: "tic_tac_toe" } & TicTacToeConfig)
  | ({ type: "cards" } & CardsConfig);

// ── Game states (per game type) ──

export interface TriviaState {
  currentQuestionIndex: number;
  questions: TriviaQuestion[];
  answers: Record<string, string>;
  scores: Record<string, number>;
  phase: "question" | "reveal" | "finished";
  questionStartedAt: string | null;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category?: string;
}

export interface WordleState {
  targetWord: string; // hidden from clients in server logic
  guesses: { userId: string; word: string; result: LetterResult[] }[];
  currentTurnUserId: string | null;
  turnOrder: string[];
  scores: Record<string, number>;
  phase: "playing" | "won" | "lost" | "finished";
  maxGuesses: number;
  wordLength: number;
}

export type LetterResult = "correct" | "present" | "absent";

export interface TicTacToeState {
  board: (string | null)[]; // userId or null, length = boardSize^2
  currentTurnUserId: string | null;
  players: { x: string; o: string }; // userId for X and O
  scores: Record<string, number>;
  phase: "playing" | "won" | "draw" | "finished";
  winner: string | null;
  winningLine: number[] | null;
  boardSize: number;
}

export interface CardsState {
  hands: Record<string, string[]>;
  deck: string[];
  discard: string[];
  currentTurnUserId: string | null;
  turnOrder: string[];
  scores: Record<string, number>;
  phase: "playing" | "finished";
  cardsPlayedThisRound: number;
}

export type GameState =
  | ({ type: "trivia" } & TriviaState)
  | ({ type: "wordle" } & WordleState)
  | ({ type: "tic_tac_toe" } & TicTacToeState)
  | ({ type: "cards" } & CardsState);

// ── Game actions (client → server via socket) ──

export interface GameAction {
  gameId: string;
  action: string;
  data: Record<string, unknown>;
}

// ── Socket event payloads ──

export interface GameCreatedEvent {
  game: GameData;
  players: GamePlayerData[];
}

export interface GameStateUpdate {
  gameId: string;
  state: GameState;
  players: GamePlayerData[];
}

export interface GameFinishedEvent {
  gameId: string;
  finalState: GameState;
  players: GamePlayerData[];
  winner: GamePlayerData | null;
}

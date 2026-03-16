import { z } from "zod";
import { GAME_TYPES } from "../constants";

export const triviaConfigSchema = z.object({
  type: z.literal("trivia"),
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  questionCount: z.number().int().min(3).max(30).default(10),
  timePerQuestion: z.number().int().min(5).max(60).default(15),
});

export const wordleConfigSchema = z.object({
  type: z.literal("wordle"),
  wordLength: z.number().int().min(4).max(7).default(5),
  maxGuesses: z.number().int().min(4).max(8).default(6),
});

export const ticTacToeConfigSchema = z.object({
  type: z.literal("tic_tac_toe"),
  boardSize: z.number().int().min(3).max(5).default(3),
});

export const cardsConfigSchema = z.object({
  type: z.literal("cards"),
  deckType: z.enum(["standard", "custom"]).default("standard"),
  maxPlayers: z.number().int().min(2).max(8).default(4),
});

export const gameConfigSchema = z.discriminatedUnion("type", [
  triviaConfigSchema,
  wordleConfigSchema,
  ticTacToeConfigSchema,
  cardsConfigSchema,
]);

export const createGameSchema = z.object({
  channelId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  gameType: z.enum(GAME_TYPES),
  config: gameConfigSchema,
});

export const joinGameSchema = z.object({
  gameId: z.string().uuid(),
});

export const gameActionSchema = z.object({
  gameId: z.string().uuid(),
  action: z.string().min(1).max(50),
  data: z.record(z.unknown()).default({}),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type GameActionInput = z.infer<typeof gameActionSchema>;

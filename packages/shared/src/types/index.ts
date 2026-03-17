export type {
  MessageData,
  TypingData,
  PresenceData,
  ReactionData,
  LivingInteraction,
  AiStreamData,
  AiStreamDone,
  ClientToServerEvents,
  ServerToClientEvents,
} from "./socket-events";

export type { SlashCommandDefinition } from "./slash-commands";
export { SLASH_COMMANDS } from "./slash-commands";

export type {
  GameData,
  GamePlayerData,
  GameConfig,
  GameState,
  GameAction,
  GameCreatedEvent,
  GameStateUpdate,
  GameFinishedEvent,
  TriviaConfig,
  TriviaState,
  TriviaQuestion,
  WordleConfig,
  WordleState,
  LetterResult,
  TicTacToeConfig,
  TicTacToeState,
  CardsConfig,
  CardsState,
} from "./game";

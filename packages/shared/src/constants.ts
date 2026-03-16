export const MESSAGE_TYPES = [
  "text",
  "system",
  "poll",
  "countdown",
  "live_score",
  "trivia",
  "dynamic_card",
  "self_destruct",
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const CHANNEL_TYPES = ["public", "private", "dm"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const GAME_TYPES = ["trivia", "wordle", "tic_tac_toe", "cards"] as const;
export type GameType = (typeof GAME_TYPES)[number];

export const GAME_STATUSES = ["waiting", "in_progress", "finished"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CHANNEL_NAME_LENGTH = 80;
export const MAX_WORKSPACE_NAME_LENGTH = 100;
export const MESSAGES_PER_PAGE = 50;

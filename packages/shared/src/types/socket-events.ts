import type { MessageType } from "../constants";
import type {
  GameData,
  GamePlayerData,
  GameState,
  GameAction,
  GameCreatedEvent,
  GameStateUpdate,
  GameFinishedEvent,
} from "./game";

// ── Data shapes ──

export interface MessageData {
  id: string;
  channelId: string;
  authorId: string;
  type: MessageType;
  content: string;
  payload?: Record<string, unknown>;
  payloadVersion?: number;
  parentId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface TypingData {
  channelId: string;
  userId: string;
  username: string;
}

export interface PresenceData {
  userId: string;
  status: "online" | "away" | "offline";
}

export interface ReactionData {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface LivingInteraction {
  messageId: string;
  action: string;
  data?: Record<string, unknown>;
}

// ── AI data shapes ──

export interface AiStreamData {
  channelId: string;
  /** The bot's message ID (created when streaming starts) */
  messageId: string;
  /** Incremental text chunk */
  chunk: string;
  /** Thread parent, if the AI response is in a thread */
  parentId?: string | null;
}

export interface AiStreamDone {
  channelId: string;
  messageId: string;
  /** Full completed content */
  content: string;
  /** Thread parent, if the AI response is in a thread */
  parentId?: string | null;
}

// ── Client → Server events ──

export interface ClientToServerEvents {
  "message:send": (data: {
    channelId: string;
    content: string;
    type?: MessageType;
    payload?: Record<string, unknown>;
    parentId?: string | null;
    expiresAt?: string;
  }) => void;
  "message:edit": (data: { messageId: string; content: string }) => void;
  "message:delete": (data: { messageId: string }) => void;
  "message:react": (data: { messageId: string; emoji: string }) => void;
  "typing:start": (data: { channelId: string }) => void;
  "typing:stop": (data: { channelId: string }) => void;
  "channel:join": (data: { channelId: string }) => void;
  "channel:leave": (data: { channelId: string }) => void;
  "presence:update": (data: { status: "online" | "away" }) => void;
  "living:interact": (data: LivingInteraction) => void;
  "ai:chat": (data: { channelId: string; message: string; parentId?: string | null }) => void;
  "ai:stop": (data: { messageId: string }) => void;
  "game:join": (data: { gameId: string }) => void;
  "game:leave": (data: { gameId: string }) => void;
  "game:start": (data: { gameId: string }) => void;
  "game:action": (data: GameAction) => void;
}

// ── Server → Client events ──

export interface ServerToClientEvents {
  "message:new": (data: MessageData) => void;
  "message:updated": (data: MessageData) => void;
  "message:deleted": (data: { messageId: string; channelId: string }) => void;
  "message:reaction": (data: ReactionData & { action: "add" | "remove" }) => void;
  "typing:update": (data: TypingData & { isTyping: boolean }) => void;
  "presence:changed": (data: PresenceData) => void;
  "channel:updated": (data: { channelId: string }) => void;
  "living:update": (data: { messageId: string; payload: Record<string, unknown>; version: number }) => void;
  "ai:stream": (data: AiStreamData) => void;
  "ai:stream:done": (data: AiStreamDone) => void;
  "ai:stream:error": (data: { channelId: string; messageId?: string; error: string }) => void;
  "ai:tool_call": (data: { channelId: string; messageId: string; toolName: string; args: Record<string, unknown>; result: unknown }) => void;
  "game:created": (data: GameCreatedEvent) => void;
  "game:player_joined": (data: { gameId: string; player: GamePlayerData }) => void;
  "game:player_left": (data: { gameId: string; userId: string }) => void;
  "game:started": (data: GameStateUpdate) => void;
  "game:state_update": (data: GameStateUpdate) => void;
  "game:finished": (data: GameFinishedEvent) => void;
  "game:error": (data: { gameId: string; message: string }) => void;
  "notification:new": (data: { id: string; type: string; title: string; body: string; data?: Record<string, unknown>; createdAt: string }) => void;
  "error": (data: { message: string; code?: string }) => void;
}

import type { MessageType } from "../constants";

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

// ── Client → Server events ──

export interface ClientToServerEvents {
  "message:send": (data: {
    channelId: string;
    content: string;
    type?: MessageType;
    payload?: Record<string, unknown>;
    parentId?: string | null;
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
  "error": (data: { message: string; code?: string }) => void;
}

import { z } from "zod";
import { MESSAGE_TYPES, MAX_MESSAGE_LENGTH } from "../constants";

export const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  type: z.enum(MESSAGE_TYPES).default("text"),
  payload: z.record(z.unknown()).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;

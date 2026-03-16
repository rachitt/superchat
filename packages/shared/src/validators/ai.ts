import { z } from "zod";

export const aiChatSchema = z.object({
  channelId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  /** If set, AI responds in a thread under this message */
  parentId: z.string().uuid().nullable().optional(),
});

export const aiSummarizeSchema = z.object({
  channelId: z.string().uuid(),
  /** Number of recent messages to summarize (default 50) */
  messageCount: z.number().min(5).max(200).default(50),
});

export const aiSmartReplySchema = z.object({
  channelId: z.string().uuid(),
  /** The message to generate replies for */
  messageId: z.string().uuid(),
});

export const aiModerationSchema = z.object({
  content: z.string(),
  messageId: z.string().uuid().optional(),
});

export type AiChatInput = z.infer<typeof aiChatSchema>;
export type AiSummarizeInput = z.infer<typeof aiSummarizeSchema>;
export type AiSmartReplyInput = z.infer<typeof aiSmartReplySchema>;
export type AiModerationInput = z.infer<typeof aiModerationSchema>;

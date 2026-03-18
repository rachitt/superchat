import { streamText, generateText, generateObject } from "ai";
import { z } from "zod";
import { eq, desc, and, isNull } from "drizzle-orm";
import { getModel, getLightModel } from "../lib/ai.js";
import { db } from "../db/index.js";
import { messages, user as users } from "../db/schema/index.js";
import { AI_MAX_CONTEXT_MESSAGES, AI_BOT_NAME, AI_SMART_REPLY_COUNT } from "@superchat/shared";
import { getSystemPrompt } from "./prompt-manager.js";
import { findSimilar } from "./embeddings.js";
import { getMemories } from "./ai-memory.js";
import { sanitizeForAi } from "../lib/sanitize.js";
import { withSpan } from "../lib/tracing.js";

interface ChannelMessage {
  role: "user" | "assistant";
  content: string;
  name?: string;
}

/**
 * Fetches recent channel messages to build AI context.
 */
async function getChannelContext(channelId: string, limit: number = AI_MAX_CONTEXT_MESSAGES): Promise<ChannelMessage[]> {
  const recentMessages = await db
    .select({
      content: messages.content,
      authorId: messages.authorId,
      type: messages.type,
      username: users.username,
      displayName: users.name,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.authorId))
    .where(and(eq(messages.channelId, channelId), isNull(messages.deletedAt)))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return recentMessages.reverse().map((msg) => ({
    role: msg.type === "system" ? "assistant" as const : "user" as const,
    content: msg.content,
    name: msg.displayName ?? msg.username ?? undefined,
  }));
}

/**
 * Options for streaming an AI chat response.
 */
export interface StreamAiChatOptions {
  channelId: string;
  userMessage: string;
  userName: string;
  userId?: string;
  /** Workspace ID, used to fetch workspace-specific system prompt */
  workspaceId?: string;
  /** Override the system prompt (e.g. from workspace settings) */
  systemPrompt?: string;
  /** Additional context messages to prepend (e.g. from RAG) */
  extraContext?: ChannelMessage[];
  /** AI SDK tools to pass to streamText */
  tools?: Record<string, any>;
  /** Max output tokens (default 1500) */
  maxOutputTokens?: number;
}

/**
 * Stream an AI response for a chat message. Returns an async iterable of text chunks.
 */
export async function streamAiChat(opts: StreamAiChatOptions): Promise<any> {
  return withSpan("ai.streamChat", async (span) => {
    return _streamAiChatInner(opts, span);
  }, {
    "ai.channelId": opts.channelId,
    "ai.model": "auto",
    "ai.maxSteps": opts.tools ? 2 : 0,
  });
}

async function _streamAiChatInner(opts: StreamAiChatOptions, _span: any): Promise<any> {
  const { channelId, userMessage, userName, userId, workspaceId, systemPrompt, extraContext, tools, maxOutputTokens = 1500 } = opts;

  // Sanitize user input to prevent prompt injection
  const sanitizedMessage = sanitizeForAi(userMessage);

  // Fetch recent messages (last 5) and RAG similar messages (top 10), deduplicated
  const [recentContext, ragResults] = await Promise.all([
    getChannelContext(channelId, 5),
    findSimilarSafe(channelId, sanitizedMessage),
  ]);

  const ragContext: ChannelMessage[] = ragResults.map((r) => ({
    role: "user" as const,
    content: r.content,
    name: r.authorName,
  }));

  const mergedContext = deduplicateContext([
    ...ragContext,
    ...(extraContext ?? []),
    ...recentContext,
  ]);

  // Resolve system prompt: explicit override > workspace prompt > default
  let finalSystemPrompt = systemPrompt ?? (workspaceId ? await getSystemPrompt(workspaceId) : await getSystemPrompt("__default__"));

  // Instruct the model to use tools rather than describe actions
  if (tools) {
    finalSystemPrompt += `\n\nIMPORTANT: When the user asks you to create a poll, start a game, search messages, pin a message, get the time, or generate/draw an image — you MUST call the appropriate tool. Do NOT describe what you would do or say "I've created a poll" without actually calling the tool. Always use tool calls for actions. After calling a tool, ALWAYS respond with a brief, friendly message telling the user what you did (e.g. "Here's your poll!" or "It's currently 3:45 PM."). For image generation, use the generateImage tool when the user asks to draw, create, generate, or make an image/picture/illustration. If the user refines a previous image request in a thread, modify the original prompt accordingly.`;
  }

  // Load user memories into system prompt
  if (userId && workspaceId) {
    const memories = await getMemories(userId, workspaceId);
    if (memories.length > 0) {
      const memoryBlock = memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");
      finalSystemPrompt += `\n\nWhat you remember about this user:\n${memoryBlock}`;
    }
  }

  const result = streamText({
    model: getModel(),
    system: finalSystemPrompt,
    messages: [
      ...mergedContext.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: sanitizedMessage },
    ],
    maxOutputTokens,
    ...(tools ? { tools, toolChoice: "auto" as const, maxSteps: 2 } : {}),
  });

  return result;
}

/** Safe wrapper around findSimilar that returns empty on failure (e.g. no pgvector). */
async function findSimilarSafe(channelId: string, query: string) {
  try {
    return await findSimilar(channelId, query, 10);
  } catch {
    return [];
  }
}

/** Deduplicate context messages by content */
function deduplicateContext(msgs: ChannelMessage[]): ChannelMessage[] {
  const seen = new Set<string>();
  return msgs.filter((m) => {
    if (seen.has(m.content)) return false;
    seen.add(m.content);
    return true;
  });
}

/**
 * Generate smart reply suggestions for a message.
 */
export async function generateSmartReplies(channelId: string, messageId: string): Promise<string[]> {
  const [targetMessage] = await db
    .select({ content: messages.content })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!targetMessage) return [];

  const context = await getChannelContext(channelId, 10);

  const { object } = await generateObject({
    model: getLightModel(),
    schema: z.object({
      replies: z.array(z.string()).length(AI_SMART_REPLY_COUNT),
    }),
    prompt: `Given this chat context and the latest message, suggest ${AI_SMART_REPLY_COUNT} short, natural reply options that a user might want to send. Each reply should be different in tone/approach (e.g., agreeing, asking a follow-up, providing info).

Recent context:
${context.map((m) => `${m.name ?? "User"}: ${m.content}`).join("\n")}

Latest message to reply to: "${targetMessage.content}"

Return exactly ${AI_SMART_REPLY_COUNT} brief replies (1-2 sentences each).`,
  });

  return object.replies;
}

/**
 * Summarize recent channel messages.
 */
export async function summarizeChannel(channelId: string, messageCount: number = 50): Promise<string> {
  const context = await getChannelContext(channelId, messageCount);

  if (context.length < 3) {
    return "Not enough messages to summarize.";
  }

  const { text } = await generateText({
    model: getModel(),
    system: "You are a concise summarizer. Summarize chat conversations into key points, decisions, and action items.",
    prompt: `Summarize this conversation:\n\n${context.map((m) => `${m.name ?? "User"}: ${m.content}`).join("\n")}`,
    maxOutputTokens: 800,
  });

  return text;
}

/**
 * Summarize a thread (all replies to a parent message).
 */
export async function summarizeThread(parentId: string): Promise<string> {
  const [parentMsg, ...replies] = await Promise.all([
    db
      .select({
        content: messages.content,
        type: messages.type,
        username: users.username,
        displayName: users.name,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.authorId))
      .where(and(eq(messages.id, parentId), isNull(messages.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        content: messages.content,
        type: messages.type,
        username: users.username,
        displayName: users.name,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.authorId))
      .where(and(eq(messages.parentId, parentId), isNull(messages.deletedAt)))
      .orderBy(messages.createdAt)
      .then((rows) => rows),
  ]);

  const threadMessages = parentMsg ? [parentMsg, ...replies.flat()] : replies.flat();

  if (threadMessages.length < 2) {
    return "Not enough messages in this thread to summarize.";
  }

  const context = threadMessages.map((msg) => {
    const name = msg.displayName ?? msg.username ?? "User";
    return `${name}: ${msg.content}`;
  });

  const { text } = await generateText({
    model: getModel(),
    system: "You are a concise summarizer. Summarize chat thread conversations into key points, decisions, and action items.",
    prompt: `Summarize this thread:\n\n${context.join("\n")}`,
    maxOutputTokens: 800,
  });

  return text;
}

/**
 * Check content for moderation issues. Returns null if clean, or a reason string if flagged.
 */
export async function moderateContent(content: string): Promise<{ flagged: boolean; reason: string | null }> {
  const { object } = await generateObject({
    model: getLightModel(),
    schema: z.object({
      flagged: z.boolean(),
      reason: z.string().nullable(),
      severity: z.enum(["none", "low", "medium", "high"]),
    }),
    prompt: `Analyze this chat message for harmful content (hate speech, harassment, threats, spam, NSFW). Be lenient with casual language and humor.

Message: "${content}"

Return whether the message should be flagged and why.`,
  });

  return { flagged: object.flagged, reason: object.reason };
}

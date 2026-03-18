import { eq, desc, and, isNull, sql } from "drizzle-orm";
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { db } from "../db/index.js";
import { messages, user as users } from "../db/schema/index.js";
import { summarizeChannel } from "./ai.js";
import { getQueue } from "../workers/queue.js";
import { generateText } from "ai";
import { getModel } from "../lib/ai.js";
import { createChildLogger } from "../lib/logger.js";

const log = createChildLogger({ module: "slash-commands" });

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

interface SlashCommandContext {
  channelId: string;
  userId: string;
  io: IOServer;
}

/**
 * Returns true if the content is a slash command (starts with "/").
 */
export function isSlashCommand(content: string): boolean {
  return content.startsWith("/") && /^\/\w+/.test(content);
}

/**
 * Parse and execute a slash command. Returns true if handled.
 */
export async function executeSlashCommand(
  content: string,
  ctx: SlashCommandContext
): Promise<boolean> {
  const trimmed = content.trim();
  const spaceIdx = trimmed.indexOf(" ");
  const command = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
  const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

  switch (command) {
    case "/poll":
      return handlePoll(args, ctx);
    case "/remind":
      return handleRemind(args, ctx);
    case "/summarize":
      return handleSummarize(ctx);
    case "/translate":
      return handleTranslate(args, ctx);
    case "/weather":
      return handleWeather(args, ctx);
    case "/whiteboard":
      return handleWhiteboard(args, ctx);
    default:
      return false;
  }
}

async function sendBotMessage(
  ctx: SlashCommandContext,
  content: string,
  opts?: { type?: string; payload?: Record<string, unknown> }
) {
  const [msg] = await db
    .insert(messages)
    .values({
      channelId: ctx.channelId,
      authorId: ctx.userId,
      type: opts?.type ?? "system",
      content,
      payload: opts?.payload,
      createdAt: sql`now() + interval '2 seconds'`,
    })
    .returning();

  ctx.io.to(`channel:${ctx.channelId}`).emit("message:new", {
    id: msg.id,
    channelId: msg.channelId,
    authorId: msg.authorId,
    type: msg.type as any,
    content: msg.content,
    payload: msg.payload as Record<string, unknown> | undefined,
    payloadVersion: msg.payloadVersion,
    parentId: msg.parentId,
    createdAt: msg.createdAt.toISOString(),
  });

  return msg;
}

// ── /poll ──

async function handlePoll(args: string, ctx: SlashCommandContext): Promise<boolean> {
  // Parse quoted strings: /poll "Question" "Opt1" "Opt2" ...
  const quoted = args.match(/"([^"]+)"/g);
  if (!quoted || quoted.length < 3) {
    await sendBotMessage(ctx, 'Usage: /poll "Question" "Option 1" "Option 2" ...');
    return true;
  }

  const parts = quoted.map((q) => q.slice(1, -1));
  const question = parts[0];
  const options = parts.slice(1);

  const payload = {
    question,
    options: options.map((text, i) => ({ id: i, text, votes: [] as string[] })),
  };

  const [msg] = await db
    .insert(messages)
    .values({
      channelId: ctx.channelId,
      authorId: ctx.userId,
      type: "poll",
      content: question,
      payload,
      createdAt: sql`now() + interval '2 seconds'`,
    })
    .returning();

  ctx.io.to(`channel:${ctx.channelId}`).emit("message:new", {
    id: msg.id,
    channelId: msg.channelId,
    authorId: msg.authorId,
    type: msg.type as any,
    content: msg.content,
    payload: msg.payload as Record<string, unknown>,
    payloadVersion: msg.payloadVersion,
    parentId: msg.parentId,
    createdAt: msg.createdAt.toISOString(),
  });

  return true;
}

// ── /remind ──

function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?)$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("s")) return num * 1000;
  if (unit.startsWith("m")) return num * 60 * 1000;
  if (unit.startsWith("h")) return num * 60 * 60 * 1000;
  if (unit.startsWith("d")) return num * 24 * 60 * 60 * 1000;
  return null;
}

async function handleRemind(args: string, ctx: SlashCommandContext): Promise<boolean> {
  // /remind me in 30m to review the PR
  const match = args.match(/^me\s+in\s+(\S+)\s+to\s+(.+)$/i);
  if (!match) {
    await sendBotMessage(ctx, "Usage: /remind me in <duration> to <text>\nExamples: 30m, 2h, 1d");
    return true;
  }

  const durationStr = match[1];
  const reminderText = match[2].trim();
  const delayMs = parseDuration(durationStr);

  if (!delayMs) {
    await sendBotMessage(ctx, `Invalid duration "${durationStr}". Use formats like: 30s, 5m, 2h, 1d`);
    return true;
  }

  // Enqueue a delayed job
  getQueue("reminders").add(
    "reminder",
    {
      userId: ctx.userId,
      channelId: ctx.channelId,
      text: reminderText,
    },
    { delay: delayMs }
  );

  const friendly = durationStr;
  await sendBotMessage(ctx, `Reminder set! I'll DM you in ${friendly} to: "${reminderText}"`);
  return true;
}

// ── /summarize ──

async function handleSummarize(ctx: SlashCommandContext): Promise<boolean> {
  try {
    const summary = await summarizeChannel(ctx.channelId, 50);
    await sendBotMessage(ctx, `**Channel Summary**\n\n${summary}`);
  } catch (err) {
    log.error({ err }, "Summarize failed");
    await sendBotMessage(ctx, "Failed to generate summary. Please try again.");
  }
  return true;
}

// ── /translate ──

async function handleTranslate(args: string, ctx: SlashCommandContext): Promise<boolean> {
  const targetLang = args.trim();
  if (!targetLang) {
    await sendBotMessage(ctx, "Usage: /translate <language>\nExample: /translate Spanish");
    return true;
  }

  // Get the last non-system message in the channel
  const [lastMsg] = await db
    .select({ content: messages.content, authorId: messages.authorId })
    .from(messages)
    .where(
      and(
        eq(messages.channelId, ctx.channelId),
        isNull(messages.deletedAt),
        eq(messages.type, "text")
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);

  if (!lastMsg) {
    await sendBotMessage(ctx, "No messages to translate.");
    return true;
  }

  try {
    const { text } = await generateText({
      model: getModel(),
      system: "You are a translator. Translate the given text accurately. Only output the translation, nothing else.",
      prompt: `Translate the following to ${targetLang}:\n\n"${lastMsg.content}"`,
      maxOutputTokens: 500,
    });

    await sendBotMessage(ctx, `**Translation (${targetLang}):**\n${text}`);
  } catch (err) {
    log.error({ err }, "Translate failed");
    await sendBotMessage(ctx, "Translation failed. Please try again.");
  }
  return true;
}

// ── /whiteboard ──

async function handleWhiteboard(args: string, ctx: SlashCommandContext): Promise<boolean> {
  const title = args.trim() || "Whiteboard";

  const [msg] = await db
    .insert(messages)
    .values({
      channelId: ctx.channelId,
      authorId: ctx.userId,
      type: "whiteboard",
      content: title,
      payload: { title, shapes: {}, bindings: {} },
      createdAt: sql`now() + interval '2 seconds'`,
    })
    .returning();

  ctx.io.to(`channel:${ctx.channelId}`).emit("message:new", {
    id: msg.id,
    channelId: msg.channelId,
    authorId: msg.authorId,
    type: msg.type as any,
    content: msg.content,
    payload: msg.payload as Record<string, unknown>,
    payloadVersion: msg.payloadVersion,
    parentId: msg.parentId,
    createdAt: msg.createdAt.toISOString(),
  });

  return true;
}

// ── /weather ──

async function handleWeather(args: string, ctx: SlashCommandContext): Promise<boolean> {
  const city = args.trim();
  if (!city) {
    await sendBotMessage(ctx, "Usage: /weather <city>\nExample: /weather Tokyo");
    return true;
  }

  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    if (!response.ok) throw new Error(`wttr.in returned ${response.status}`);
    const data = await response.json() as any;

    const current = data.current_condition?.[0];
    if (!current) throw new Error("No weather data");

    const desc = current.weatherDesc?.[0]?.value ?? "Unknown";
    const tempC = current.temp_C;
    const tempF = current.temp_F;
    const humidity = current.humidity;
    const feelsLikeC = current.FeelsLikeC;
    const wind = current.windspeedKmph;
    const windDir = current.winddir16Point;

    const weatherMsg = [
      `**Weather in ${city}**`,
      `${desc} | ${tempC}°C (${tempF}°F)`,
      `Feels like ${feelsLikeC}°C | Humidity ${humidity}%`,
      `Wind ${wind} km/h ${windDir}`,
    ].join("\n");

    await sendBotMessage(ctx, weatherMsg);
  } catch (err) {
    log.error({ err, city }, "Weather fetch failed");
    await sendBotMessage(ctx, `Couldn't fetch weather for "${city}". Check the city name and try again.`);
  }
  return true;
}

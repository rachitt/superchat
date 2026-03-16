import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const openaiApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

export const openai = openaiApiKey
  ? createOpenAI({ apiKey: openaiApiKey })
  : null;

export const anthropic = anthropicApiKey
  ? createAnthropic({ apiKey: anthropicApiKey })
  : null;

export const google = geminiApiKey
  ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
  : null;

/** Returns the best available model. Prefers OpenAI, then Anthropic, then Gemini. */
export function getModel() {
  if (openai) return openai("gpt-4o");
  if (anthropic) return anthropic("claude-sonnet-4-20250514");
  if (google) return google("gemini-2.5-flash-lite");
  throw new Error("No AI provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.");
}

/** Lighter model for smart replies and moderation */
export function getLightModel() {
  if (openai) return openai("gpt-4o-mini");
  if (anthropic) return anthropic("claude-haiku-4-5-20251001");
  if (google) return google("gemini-2.5-flash-lite");
  throw new Error("No AI provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.");
}

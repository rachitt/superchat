import { openai, anthropic, google } from "../lib/ai.js";
import { moderateContent } from "./ai.js";
import { redis } from "../lib/redis.js";
import logger from "../lib/logger.js";

/**
 * Auto-moderate a message. Returns null if the message is clean,
 * or a reason string if it should be flagged.
 *
 * Only runs if an AI provider is configured. Results are cached briefly.
 */
export async function autoModerate(content: string): Promise<string | null> {
  // Skip if no AI provider is configured
  if (!openai && !anthropic && !google) return null;

  // Skip very short messages
  if (content.length < 10) return null;

  // Check cache to avoid re-moderating the same content
  const cacheKey = `mod:${Buffer.from(content).toString("base64").slice(0, 64)}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached === "" ? null : cached;

  try {
    const result = await moderateContent(content);
    const value = result.flagged ? (result.reason ?? "Content flagged by auto-moderation") : "";
    await redis.setex(cacheKey, 300, value); // cache for 5 minutes
    return result.flagged ? value : null;
  } catch (err) {
    // If moderation fails, let the message through but log a warning
    logger.warn({ err }, "Moderation check failed, allowing message through");
    return null;
  }
}

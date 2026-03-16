import { redis } from "./redis.js";
import { AI_RATE_LIMIT_PER_MINUTE } from "@superchat/shared";

export interface RateLimitResult {
  limited: boolean;
  message: string;
}

/**
 * Check the AI rate limit for a user. Returns whether the request
 * is rate-limited and an appropriate message.
 */
export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const key = `ai:ratelimit:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > AI_RATE_LIMIT_PER_MINUTE) {
    return {
      limited: true,
      message: `AI rate limit exceeded. Max ${AI_RATE_LIMIT_PER_MINUTE} requests per minute.`,
    };
  }
  return { limited: false, message: "" };
}

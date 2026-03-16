import { redis } from "./redis.js";
import { AI_RATE_LIMIT_PER_MINUTE } from "@superchat/shared";

export interface RateLimitCheckResult {
  limited: boolean;
  remaining: number;
  retryAfter?: number;
}

export interface RateLimitPreset {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMIT_PRESETS = {
  AI_CHAT: { maxRequests: 10, windowSeconds: 60 },
  API_GENERAL: { maxRequests: 100, windowSeconds: 60 },
  SOCKET_MESSAGE: { maxRequests: 30, windowSeconds: 60 },
  AUTH_LOGIN: { maxRequests: 5, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitPreset>;

export class RateLimiter {
  private prefix: string;
  private preset: RateLimitPreset;

  constructor(prefix: string, preset: RateLimitPreset) {
    this.prefix = prefix;
    this.preset = preset;
  }

  async check(key: string): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const windowMs = this.preset.windowSeconds * 1000;
    const redisKey = `rl:${this.prefix}:${key}`;
    const member = `${now}:${Math.random().toString(36).slice(2)}`;

    // Sliding window using sorted set
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, now - windowMs);
    pipeline.zcard(redisKey); // count BEFORE adding
    pipeline.expire(redisKey, this.preset.windowSeconds);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) ?? 0;

    if (count >= this.preset.maxRequests) {
      const oldestEntry = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
      const oldestTime = oldestEntry.length >= 2 ? parseInt(oldestEntry[1], 10) : now;
      const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);

      return {
        limited: true,
        remaining: 0,
        retryAfter: Math.max(retryAfter, 1),
      };
    }

    // Only add the entry if we're under the limit
    await redis.zadd(redisKey, now, member);

    return {
      limited: false,
      remaining: this.preset.maxRequests - count - 1,
    };
  }
}

// Pre-built limiters
export const aiChatLimiter = new RateLimiter("ai_chat", RATE_LIMIT_PRESETS.AI_CHAT);
export const apiGeneralLimiter = new RateLimiter("api_general", RATE_LIMIT_PRESETS.API_GENERAL);
export const socketMessageLimiter = new RateLimiter("socket_msg", RATE_LIMIT_PRESETS.SOCKET_MESSAGE);
export const authLoginLimiter = new RateLimiter("auth_login", RATE_LIMIT_PRESETS.AUTH_LOGIN);

/**
 * Backwards-compatible AI rate limit check.
 */
export interface RateLimitResult {
  limited: boolean;
  message: string;
}

export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const result = await aiChatLimiter.check(userId);
  if (result.limited) {
    return {
      limited: true,
      message: `AI rate limit exceeded. Max ${AI_RATE_LIMIT_PER_MINUTE} requests per minute.`,
    };
  }
  return { limited: false, message: "" };
}

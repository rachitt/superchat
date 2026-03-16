import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  client.on("error", () => {
    // Suppress connection errors in dev when Redis is unavailable
  });
  return client;
}

export const redis = createRedisClient();
export const pubRedis = createRedisClient();
export const subRedis = createRedisClient();

import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const pubRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const subRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

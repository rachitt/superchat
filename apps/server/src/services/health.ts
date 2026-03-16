import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { redis } from "../lib/redis.js";
import { getQueue, type QueueName } from "../workers/queue.js";

interface HealthCheck {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

interface QueueHealth {
  waiting: number;
  active: number;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    queues: Record<string, QueueHealth>;
  };
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "up", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await redis.ping();
    return { status: "up", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function checkQueues(): Promise<Record<string, QueueHealth>> {
  const queueNames: QueueName[] = ["ai-embeddings", "notifications", "game-timeouts", "message-cleanup"];
  const results: Record<string, QueueHealth> = {};

  for (const name of queueNames) {
    try {
      const queue = getQueue(name);
      const [waiting, active] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
      ]);
      results[name] = { waiting, active };
    } catch {
      results[name] = { waiting: -1, active: -1 };
    }
  }

  return results;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const [database, redisCheck, queues] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkQueues(),
  ]);

  const mem = process.memoryUsage();

  let status: HealthStatus["status"] = "healthy";
  if (database.status === "down" && redisCheck.status === "down") {
    status = "unhealthy";
  } else if (database.status === "down" || redisCheck.status === "down") {
    status = "degraded";
  }

  return {
    status,
    checks: {
      database,
      redis: redisCheck,
      queues,
    },
    uptime: process.uptime(),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    },
  };
}

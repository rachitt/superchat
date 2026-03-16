import { randomUUID } from "node:crypto";
import { Queue, type JobsOptions } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const QUEUE_NAMES = [
  "ai-embeddings",
  "notifications",
  "game-timeouts",
  "message-cleanup",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: { url: REDIS_URL, maxRetriesPerRequest: null } });
    queues.set(name, queue);
  }
  return queue;
}

export async function enqueueJob(
  queueName: QueueName,
  data: Record<string, unknown>,
  opts?: JobsOptions & { traceId?: string }
) {
  const queue = getQueue(queueName);
  const { traceId, ...jobOpts } = opts || {};
  return queue.add(queueName, { ...data, traceId: traceId || randomUUID() }, jobOpts);
}

export function tryGetQueue(name: QueueName): Queue | undefined {
  return queues.get(name);
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(
    Array.from(queues.values()).map((q) => q.close())
  );
  queues.clear();
}

import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

const queues = new Map<string, Queue>();

/**
 * Get or create a BullMQ queue by name.
 */
export function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: redis as any });
    queues.set(name, queue);
  }
  return queue;
}

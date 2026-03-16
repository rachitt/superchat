import "dotenv/config";
import { Worker } from "bullmq";
import { getQueue, closeAllQueues } from "./queue.js";
import processGameTimeout from "./processors/game-timeout.js";
import processMessageCleanup from "./processors/message-cleanup.js";
import logger from "../lib/logger.js";

const log = logger.child({ module: "worker" });

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connectionOpts = { url: REDIS_URL, maxRetriesPerRequest: null as null };

const workers = [
  new Worker("game-timeouts", processGameTimeout, { connection: { ...connectionOpts } }),
  new Worker("message-cleanup", processMessageCleanup, { connection: { ...connectionOpts } }),
];

// Set up repeatable message-cleanup job (every 5 minutes)
async function setupRepeatableJobs() {
  const cleanupQueue = getQueue("message-cleanup");
  await cleanupQueue.upsertJobScheduler(
    "message-cleanup-scheduler",
    { every: 5 * 60 * 1000 },
    { name: "cleanup" }
  );
  log.info("Repeatable message-cleanup job scheduled (every 5min)");
}

async function shutdown() {
  log.info("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  await closeAllQueues();
  log.info("Workers shut down");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

setupRepeatableJobs().then(() => {
  log.info("Workers started");
}).catch((err) => {
  log.error({ err }, "Failed to start workers");
  process.exit(1);
});

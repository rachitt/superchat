import "../lib/telemetry.js";
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { getQueue, closeAllQueues } from "./queue.js";
import processGameTimeout from "./processors/game-timeout.js";
import processMessageCleanup from "./processors/message-cleanup.js";
import processLivingTick from "./processors/living-tick.js";
import processReminder from "./processors/reminder.js";
import processThreadSummary from "./processors/thread-summary.js";
import logger from "../lib/logger.js";
import { withSpan } from "../lib/tracing.js";
import {
  bullmqJobsProcessedTotal,
  bullmqJobsDuration,
} from "../lib/metrics.js";

const log = logger.child({ module: "worker" });

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connectionOpts = { url: REDIS_URL, maxRetriesPerRequest: null as null };

function wrapProcessor(queueName: string, processor: (job: Job) => Promise<void>) {
  return async (job: Job) => {
    const traceId = (job.data as Record<string, unknown>)?.traceId as string | undefined;
    const jobLog = log.child({ queue: queueName, jobId: job.id, traceId });
    jobLog.info("Processing job");

    const start = Date.now();
    try {
      await withSpan(`worker.${queueName}`, async (span) => {
        span.setAttribute("job.id", job.id ?? "unknown");
        if (traceId) span.setAttribute("job.parentTraceId", traceId);
        await processor(job);
      });
      const durationSec = (Date.now() - start) / 1000;
      bullmqJobsProcessedTotal.inc({ queue: queueName, status: "completed" });
      bullmqJobsDuration.observe({ queue: queueName }, durationSec);
      jobLog.info({ durationMs: Date.now() - start }, "Job completed");
    } catch (err) {
      const durationSec = (Date.now() - start) / 1000;
      bullmqJobsProcessedTotal.inc({ queue: queueName, status: "failed" });
      bullmqJobsDuration.observe({ queue: queueName }, durationSec);
      jobLog.error({ err }, "Job failed");
      throw err;
    }
  };
}

const workers = [
  new Worker("game-timeouts", wrapProcessor("game-timeouts", processGameTimeout), {
    connection: { ...connectionOpts },
  }),
  new Worker("message-cleanup", wrapProcessor("message-cleanup", processMessageCleanup), {
    connection: { ...connectionOpts },
  }),
  new Worker("living-tick", wrapProcessor("living-tick", processLivingTick), {
    connection: { ...connectionOpts },
  }),
  new Worker("reminders", wrapProcessor("reminders", processReminder), {
    connection: { ...connectionOpts },
  }),
  new Worker("thread-summary", wrapProcessor("thread-summary", processThreadSummary), {
    connection: { ...connectionOpts },
  }),
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

  const livingTickQueue = getQueue("living-tick");
  await livingTickQueue.upsertJobScheduler(
    "living-tick-scheduler",
    { every: 10_000 },
    { name: "tick" }
  );
  log.info("Repeatable living-tick job scheduled (every 10s)");
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

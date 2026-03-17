import type { Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema/messages.js";
import { summarizeThread } from "../../services/ai.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ module: "thread-summary" });

interface ThreadSummaryJobData {
  parentId: string;
}

export default async function processThreadSummary(job: Job<ThreadSummaryJobData>) {
  const { parentId } = job.data;

  try {
    const summary = await summarizeThread(parentId);

    if (!summary || summary.startsWith("Not enough")) {
      log.info({ parentId }, "Skipping thread summary — not enough messages");
      return;
    }

    // Update parent message payload with thread summary
    const [parent] = await db
      .select({ payload: messages.payload })
      .from(messages)
      .where(eq(messages.id, parentId))
      .limit(1);

    const existingPayload = (parent?.payload as Record<string, unknown>) ?? {};

    await db
      .update(messages)
      .set({
        payload: {
          ...existingPayload,
          threadSummary: summary,
          summaryUpdatedAt: new Date().toISOString(),
        },
        payloadVersion: sql`${messages.payloadVersion} + 1`,
      })
      .where(eq(messages.id, parentId));

    log.info({ parentId }, "Thread summary updated");
  } catch (err) {
    log.error({ err, parentId }, "Thread summary generation failed");
    throw err;
  }
}

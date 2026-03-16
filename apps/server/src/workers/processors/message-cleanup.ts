import type { Job } from "bullmq";
import { lt, isNull, and, isNotNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema/index.js";
import logger from "../../lib/logger.js";

const log = logger.child({ module: "message-cleanup-worker" });

export default async function processMessageCleanup(_job: Job) {
  const now = new Date();

  const result = await db
    .update(messages)
    .set({ deletedAt: now })
    .where(
      and(
        isNotNull(messages.expiresAt),
        lt(messages.expiresAt, now),
        isNull(messages.deletedAt)
      )
    )
    .returning({ id: messages.id });

  if (result.length > 0) {
    log.info({ count: result.length }, "Soft-deleted expired messages");
  }
}

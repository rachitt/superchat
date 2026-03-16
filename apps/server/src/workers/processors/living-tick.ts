import type { Job } from "bullmq";
import { eq, and, isNull, isNotNull, lt, sql, inArray } from "drizzle-orm";
import { Emitter } from "@socket.io/redis-emitter";
import Redis from "ioredis";
import type { ServerToClientEvents } from "@superchat/shared";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema/index.js";
import logger from "../../lib/logger.js";

const log = logger.child({ module: "living-tick-worker" });

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const emitterRedis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
const emitter = new Emitter<ServerToClientEvents>(emitterRedis);

export default async function processLivingTick(_job: Job) {
  const now = new Date();

  // ── 1. Handle expired countdowns: mark as "finished" ──
  await handleCountdownExpiry(now);

  // ── 2. Handle self-destruct expiry: broadcast deletion ──
  await handleSelfDestructExpiry(now);
}

async function handleCountdownExpiry(now: Date) {
  // Find active countdowns whose targetTime has passed
  const rows = await db
    .select({ id: messages.id, channelId: messages.channelId, payload: messages.payload })
    .from(messages)
    .where(
      and(
        eq(messages.type, "countdown"),
        isNull(messages.deletedAt)
      )
    );

  for (const row of rows) {
    const payload = row.payload as { label: string; targetTime: string; status: string };
    if (payload.status === "finished") continue;

    const targetTime = new Date(payload.targetTime);
    if (targetTime > now) continue;

    // Mark as finished
    payload.status = "finished";
    const [updated] = await db
      .update(messages)
      .set({
        payload,
        payloadVersion: sql`${messages.payloadVersion} + 1`,
      })
      .where(eq(messages.id, row.id))
      .returning();

    if (updated) {
      emitter.to(`channel:${row.channelId}`).emit("living:update", {
        messageId: row.id,
        payload: updated.payload as Record<string, unknown>,
        version: updated.payloadVersion,
      });
      log.info({ messageId: row.id }, "Countdown finished");
    }
  }
}

async function handleSelfDestructExpiry(now: Date) {
  // Find self-destruct messages that have expired but haven't been deleted yet
  const expired = await db
    .select({ id: messages.id, channelId: messages.channelId })
    .from(messages)
    .where(
      and(
        eq(messages.type, "self_destruct"),
        isNotNull(messages.expiresAt),
        lt(messages.expiresAt, now),
        isNull(messages.deletedAt)
      )
    );

  if (expired.length === 0) return;

  // Soft-delete them
  const ids = expired.map((m) => m.id);
  await db
    .update(messages)
    .set({ deletedAt: now })
    .where(inArray(messages.id, ids));

  // Broadcast deletion to each channel
  for (const msg of expired) {
    emitter.to(`channel:${msg.channelId}`).emit("message:deleted", {
      messageId: msg.id,
      channelId: msg.channelId,
    });
  }

  log.info({ count: expired.length }, "Self-destruct messages deleted");
}

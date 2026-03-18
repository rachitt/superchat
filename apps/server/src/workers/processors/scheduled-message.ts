import type { Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema/messages.js";
import { scheduledMessages } from "../../db/schema/scheduled-messages.js";
import { getIO } from "../../socket/index.js";

interface ScheduledMessageJobData {
  scheduledMessageId: string;
  userId: string;
  channelId: string;
  content: string;
}

export default async function processScheduledMessage(job: Job<ScheduledMessageJobData>) {
  const { scheduledMessageId, userId, channelId, content } = job.data;

  // Insert the actual message
  const [msg] = await db
    .insert(messages)
    .values({
      channelId,
      authorId: userId,
      type: "text",
      content,
      createdAt: sql`now()`,
    })
    .returning();

  // Mark scheduled message as sent
  await db
    .update(scheduledMessages)
    .set({ status: "sent" })
    .where(eq(scheduledMessages.id, scheduledMessageId));

  // Emit via Socket.IO
  const io = getIO();
  io.to(`channel:${channelId}`).emit("message:new", {
    id: msg.id,
    channelId: msg.channelId,
    authorId: msg.authorId,
    type: msg.type as any,
    content: msg.content,
    payload: msg.payload as Record<string, unknown> | undefined,
    payloadVersion: msg.payloadVersion,
    parentId: msg.parentId,
    createdAt: msg.createdAt.toISOString(),
  });
}

import type { Job } from "bullmq";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema/messages.js";
import { createNotification } from "../../services/notifications.js";

interface ReminderJobData {
  userId: string;
  channelId: string;
  text: string;
}

export default async function processReminder(job: Job<ReminderJobData>) {
  const { userId, channelId, text } = job.data;

  // Send a notification to the user
  await createNotification({
    userId,
    type: "reminder",
    title: "Reminder",
    body: text,
    data: { channelId },
  });

  // Also post a system message in the channel as a visible reminder
  const [msg] = await db
    .insert(messages)
    .values({
      channelId,
      authorId: userId,
      type: "system",
      content: `**Reminder:** ${text}`,
      createdAt: sql`now()`,
    })
    .returning();

  // Note: The notification system already emits to the user's socket room.
  // The message will be picked up by any connected clients via polling or
  // we could emit here if we had io access. For now, the notification handles it.
}

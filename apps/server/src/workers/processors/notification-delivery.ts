import type { Job } from "bullmq";
import { createNotification } from "../../services/notifications.js";

interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface BatchedNotificationJob {
  notifications: NotificationJob[];
}

/**
 * BullMQ processor for batched notification delivery.
 * Groups notifications within a short window and delivers them together.
 */
export async function processNotificationDelivery(job: Job<BatchedNotificationJob>) {
  const { notifications } = job.data;

  for (const notification of notifications) {
    await createNotification(notification);
  }

  return { delivered: notifications.length };
}

/**
 * Process a single notification job.
 */
export async function processSingleNotification(job: Job<NotificationJob>) {
  await createNotification(job.data);
  return { delivered: 1 };
}

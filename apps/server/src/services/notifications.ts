import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema/index.js";

/** Socket.IO server instance, set during startup */
let ioInstance: any = null;

export function setNotificationIO(io: any) {
  ioInstance = io;
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data,
    })
    .returning();

  if (ioInstance) {
    ioInstance.to(`user:${params.userId}`).emit("notification:new", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data as Record<string, unknown> | undefined,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return notification;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return result?.count ?? 0;
}

export async function markAsRead(notificationId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, notificationId));
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

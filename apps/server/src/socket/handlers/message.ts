import type { Server, Socket } from "socket.io";
import { eq, and, or } from "drizzle-orm";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { sendMessageSchema } from "@superchat/shared";
import { db } from "../../db/index.js";
import { messages, user as users, reactions } from "../../db/schema/index.js";
import { autoModerate } from "../../services/moderation.js";
import { createNotification } from "../../services/notifications.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerMessageHandlers(io: IOServer, socket: IOSocket) {
  const userId = socket.data.userId as string;

  socket.on("message:send", async (data) => {
    const parsed = sendMessageSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit("error", { message: "Invalid message data", code: "VALIDATION_ERROR" });
      return;
    }

    // Auto-moderation check
    const flagReason = await autoModerate(parsed.data.content);
    if (flagReason) {
      socket.emit("error", { message: `Message blocked: ${flagReason}`, code: "MODERATION_ERROR" });
      return;
    }

    const [message] = await db
      .insert(messages)
      .values({
        channelId: parsed.data.channelId,
        authorId: userId,
        type: parsed.data.type ?? "text",
        content: parsed.data.content,
        payload: parsed.data.payload,
        parentId: parsed.data.parentId,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      })
      .returning();

    const [author] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, userId));

    const messageData = {
      id: message.id,
      channelId: message.channelId,
      authorId: message.authorId,
      type: message.type as any,
      content: message.content,
      payload: message.payload as Record<string, unknown> | undefined,
      payloadVersion: message.payloadVersion,
      parentId: message.parentId,
      expiresAt: message.expiresAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };

    io.to(`channel:${message.channelId}`).emit("message:new", messageData);

    // Parse @mentions and create notifications
    const mentionRegex = /@(\w+)/g;
    let match: RegExpExecArray | null;
    const mentionedUsernames = new Set<string>();
    while ((match = mentionRegex.exec(parsed.data.content)) !== null) {
      mentionedUsernames.add(match[1]);
    }

    if (mentionedUsernames.size > 0) {
      const mentionedUsers = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(
          or(
            ...Array.from(mentionedUsernames).map((u) => eq(users.username, u))
          )
        );

      const authorName = author?.name ?? author?.username ?? "Someone";
      for (const mentioned of mentionedUsers) {
        if (mentioned.id !== userId) {
          createNotification({
            userId: mentioned.id,
            type: "mention",
            title: `${authorName} mentioned you`,
            body: parsed.data.content.slice(0, 200),
            data: { channelId: message.channelId, messageId: message.id },
          }).catch(() => {});
        }
      }
    }

    // Notify parent message author on replies
    if (parsed.data.parentId) {
      const [parent] = await db
        .select({ authorId: messages.authorId })
        .from(messages)
        .where(eq(messages.id, parsed.data.parentId))
        .limit(1);

      if (parent && parent.authorId !== userId) {
        const authorName = author?.name ?? author?.username ?? "Someone";
        createNotification({
          userId: parent.authorId,
          type: "reply",
          title: `${authorName} replied to your message`,
          body: parsed.data.content.slice(0, 200),
          data: { channelId: message.channelId, messageId: message.id, parentId: parsed.data.parentId },
        }).catch(() => {});
      }
    }
  });

  socket.on("message:edit", async (data) => {
    await db
      .update(messages)
      .set({ content: data.content, editedAt: new Date() })
      .where(eq(messages.id, data.messageId));

    const [updated] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, data.messageId));

    if (updated) {
      io.to(`channel:${updated.channelId}`).emit("message:updated", {
        id: updated.id,
        channelId: updated.channelId,
        authorId: updated.authorId,
        type: updated.type as any,
        content: updated.content,
        payload: updated.payload as Record<string, unknown> | undefined,
        payloadVersion: updated.payloadVersion,
        parentId: updated.parentId,
        createdAt: updated.createdAt.toISOString(),
      });
    }
  });

  socket.on("message:delete", async (data) => {
    const [deleted] = await db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, data.messageId))
      .returning();

    if (deleted) {
      io.to(`channel:${deleted.channelId}`).emit("message:deleted", {
        messageId: deleted.id,
        channelId: deleted.channelId,
      });
    }
  });

  socket.on("message:react", async ({ messageId, emoji }) => {
    const existing = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.userId, userId),
          eq(reactions.emoji, emoji)
        )
      )
      .limit(1);

    let action: "add" | "remove";
    if (existing.length > 0) {
      await db
        .delete(reactions)
        .where(
          and(
            eq(reactions.messageId, messageId),
            eq(reactions.userId, userId),
            eq(reactions.emoji, emoji)
          )
        );
      action = "remove";
    } else {
      await db.insert(reactions).values({ messageId, userId, emoji });
      action = "add";
    }

    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (msg) {
      io.to(`channel:${msg.channelId}`).emit("message:reaction", {
        messageId,
        userId,
        emoji,
        action,
      });
    }
  });
}

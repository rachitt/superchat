import type { Server, Socket } from "socket.io";
import { eq } from "drizzle-orm";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";
import { sendMessageSchema } from "@superchat/shared";
import { db } from "../../db/index.js";
import { messages, users } from "../../db/schema/index.js";

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

    const [message] = await db
      .insert(messages)
      .values({
        channelId: parsed.data.channelId,
        authorId: userId,
        type: parsed.data.type ?? "text",
        content: parsed.data.content,
        payload: parsed.data.payload,
        parentId: parsed.data.parentId,
      })
      .returning();

    const [author] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
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
      parentId: message.parentId,
      createdAt: message.createdAt.toISOString(),
    };

    io.to(`channel:${message.channelId}`).emit("message:new", messageData);
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
}

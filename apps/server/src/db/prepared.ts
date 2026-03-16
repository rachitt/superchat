import { eq, desc, isNull, and, sql } from "drizzle-orm";
import { db } from "./index.js";
import { messages, user, channelMembers } from "./schema/index.js";

export const getMessagesByChannel = db
  .select()
  .from(messages)
  .where(
    and(
      eq(messages.channelId, sql.placeholder("channelId")),
      isNull(messages.deletedAt)
    )
  )
  .orderBy(desc(messages.createdAt))
  .limit(sql.placeholder("limit"))
  .prepare("get_messages_by_channel");

export const getUserById = db
  .select({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    image: user.image,
  })
  .from(user)
  .where(eq(user.id, sql.placeholder("userId")))
  .limit(1)
  .prepare("get_user_by_id");

export const getChannelMembers = db
  .select({
    channelId: channelMembers.channelId,
    userId: channelMembers.userId,
    lastReadAt: channelMembers.lastReadAt,
    name: user.name,
    username: user.username,
    image: user.image,
  })
  .from(channelMembers)
  .innerJoin(user, eq(user.id, channelMembers.userId))
  .where(eq(channelMembers.channelId, sql.placeholder("channelId")))
  .prepare("get_channel_members");

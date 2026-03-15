import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { channels } from "./channels.js";
import { users } from "./users.js";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 30 }).notNull().default("text"),
    content: text("content").notNull(),
    payload: jsonb("payload"),
    payloadVersion: integer("payload_version").notNull().default(0),
    parentId: uuid("parent_id"),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    isPinned: boolean("is_pinned").notNull().default(false),
    editedAt: timestamp("edited_at", { mode: "date" }),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_channel_created_idx").on(table.channelId, table.createdAt),
    index("messages_parent_idx").on(table.parentId),
  ]
);

export const reactions = pgTable("reactions", {
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
});

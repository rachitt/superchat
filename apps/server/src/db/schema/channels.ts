import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces.js";
import { users } from "./users.js";

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull().default("public"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const channelMembers = pgTable("channel_members", {
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at", { mode: "date" }),
});

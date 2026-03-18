import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { channels } from "./channels";

export const workspacePrompts = pgTable("workspace_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  systemPrompt: text("system_prompt").notNull(),
  botName: varchar("bot_name", { length: 100 }),
  personality: text("personality"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const channelPrompts = pgTable("channel_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id")
    .notNull()
    .unique()
    .references(() => channels.id, { onDelete: "cascade" }),
  persona: varchar("persona", { length: 50 }),
  customPrompt: text("custom_prompt"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

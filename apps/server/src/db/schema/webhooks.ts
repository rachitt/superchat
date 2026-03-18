import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { channels } from "./channels";
import { user } from "./auth";

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 20 }).notNull().default("generic"),
    config: jsonb("config").default({}),
    enabled: boolean("enabled").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("webhooks_token_idx").on(table.token),
    index("webhooks_channel_idx").on(table.channelId),
  ],
);

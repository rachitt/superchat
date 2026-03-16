import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { workspaces } from "./workspaces";

export const aiUserMemory = pgTable(
  "ai_user_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 255 }).notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("ai_user_memory_user_ws_key_uniq").on(
      table.userId,
      table.workspaceId,
      table.key
    ),
  ]
);

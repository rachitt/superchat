import {
  pgTable,
  uuid,
  timestamp,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { messages } from "./messages";
import { channels } from "./channels";

const vector = customType<{ data: number[]; dpiverName: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown) {
    if (typeof value === "string") {
      return value
        .slice(1, -1)
        .split(",")
        .map(Number) as number[];
    }
    return value as number[];
  },
});

export const messageEmbeddings = pgTable(
  "message_embeddings",
  {
    messageId: uuid("message_id")
      .primaryKey()
      .references(() => messages.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("message_embeddings_channel_idx").on(table.channelId),
    // HNSW index for cosine similarity search
    index("message_embeddings_hnsw_idx").using(
      "hnsw",
      sql`${table.embedding} vector_cosine_ops`
    ),
  ]
);

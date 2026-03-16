import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { channels } from "./channels";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    gameType: varchar("game_type", { length: 30 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("waiting"),
    config: jsonb("config").notNull(),
    state: jsonb("state").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    startedAt: timestamp("started_at", { mode: "date" }),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("games_channel_status_idx").on(table.channelId, table.status),
    index("games_workspace_idx").on(table.workspaceId),
  ]
);

export const gamePlayers = pgTable(
  "game_players",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    data: jsonb("data").default({}),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("game_players_game_idx").on(table.gameId),
    index("game_players_user_idx").on(table.userId),
  ]
);

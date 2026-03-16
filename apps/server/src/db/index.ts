import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import logger from "../lib/logger.js";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: (notice) => {
    logger.info({ notice: notice.message }, "Postgres notice");
  },
});

export const db = drizzle(client, { schema });
export type Database = typeof db;

export function getPoolStats() {
  return {
    // postgres.js doesn't expose detailed pool stats directly,
    // but we can return the configured values
    maxConnections: 20,
    idleTimeout: 30,
    connectTimeout: 10,
  };
}

export async function closeDb() {
  await client.end();
}

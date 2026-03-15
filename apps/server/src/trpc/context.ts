import type { FastifyRequest, FastifyReply } from "fastify";
import type { Database } from "../db/index.js";

export interface TRPCContext {
  req: FastifyRequest;
  res: FastifyReply;
  db: Database;
  userId: string | null;
}

export function createContext(db: Database) {
  return async ({ req, res }: { req: FastifyRequest; res: FastifyReply }): Promise<TRPCContext> => {
    // TODO: Extract userId from Better Auth session
    const userId = null;
    return { req, res, db, userId };
  };
}

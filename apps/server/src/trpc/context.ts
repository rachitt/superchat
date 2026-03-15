import type { FastifyRequest, FastifyReply } from "fastify";
import type { Database } from "../db/index.js";
import type { auth as Auth } from "../lib/auth.js";

export interface TRPCContext {
  req: FastifyRequest;
  res: FastifyReply;
  db: Database;
  userId: string | null;
  user: { id: string; email: string; name: string; username?: string | null } | null;
}

export function createContext(db: Database, auth: typeof Auth) {
  return async ({ req, res }: { req: FastifyRequest; res: FastifyReply }): Promise<TRPCContext> => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const session = await auth.api.getSession({ headers });

    return {
      req,
      res,
      db,
      userId: session?.user?.id ?? null,
      user: session?.user ?? null,
    };
  };
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.FRONTEND_URL!],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    additionalFields: {
      bio: { type: "string", required: false },
      status: { type: "string", required: false },
      xp: { type: "number", required: false, defaultValue: 0 },
      level: { type: "number", required: false, defaultValue: 1 },
      streakDays: { type: "number", required: false, defaultValue: 0 },
      lastActiveAt: { type: "string", required: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

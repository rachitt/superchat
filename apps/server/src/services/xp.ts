import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { user as users } from "../db/schema/index.js";

/** XP award rates */
export const XP_RATES = {
  message_sent: 1,
  reaction_received: 2,
  ai_interaction: 3,
  game_won: 10,
  poll_created: 5,
  daily_streak: 5,
} as const;

export type XpReason = keyof typeof XP_RATES;

/** Level formula: level = floor(sqrt(xp / 100)) + 1 */
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/** XP required to reach a given level */
export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

/** Socket.IO server instance for emitting level-up events */
let ioInstance: any = null;

export function setXpIO(io: any) {
  ioInstance = io;
}

/**
 * Atomically award XP to a user, check level-up, handle daily streak.
 */
export async function awardXP(
  userId: string,
  amount: number,
  reason: XpReason
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  // Atomically increment XP and return updated row
  const [updated] = await db
    .update(users)
    .set({
      xp: sql`${users.xp} + ${amount}`,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      xp: users.xp,
      level: users.level,
    });

  if (!updated) return { newXp: 0, newLevel: 1, leveledUp: false };

  const newLevel = calculateLevel(updated.xp);
  const leveledUp = newLevel > updated.level;

  if (leveledUp) {
    await db
      .update(users)
      .set({ level: newLevel })
      .where(eq(users.id, userId));

    // Emit level-up event
    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit("user:levelup", {
        userId,
        newLevel,
        xp: updated.xp,
      });
    }
  }

  return { newXp: updated.xp, newLevel, leveledUp };
}

/**
 * Check and award daily streak XP. Call on message send.
 * Returns bonus XP awarded (0 if no streak bonus).
 */
export async function checkDailyStreak(userId: string): Promise<number> {
  const [u] = await db
    .select({
      lastActiveAt: users.lastActiveAt,
      streakDays: users.streakDays,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!u.lastActiveAt) {
    // First activity ever — start streak at 1
    await db
      .update(users)
      .set({ streakDays: 1 })
      .where(eq(users.id, userId));
    return XP_RATES.daily_streak;
  }

  const lastActive = new Date(u.lastActiveAt);
  const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

  const diffDays = Math.floor((today.getTime() - lastActiveDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already active today, no streak bonus
    return 0;
  } else if (diffDays === 1) {
    // Consecutive day — increment streak
    const newStreak = u.streakDays + 1;
    await db
      .update(users)
      .set({ streakDays: newStreak })
      .where(eq(users.id, userId));
    return XP_RATES.daily_streak;
  } else {
    // Gap > 1 day — reset streak
    await db
      .update(users)
      .set({ streakDays: 1 })
      .where(eq(users.id, userId));
    return XP_RATES.daily_streak;
  }
}

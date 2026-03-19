import { describe, it, expect } from "vitest";
import { calculateLevel, xpForLevel, XP_RATES } from "./xp.js";

describe("XP System", () => {
  describe("calculateLevel", () => {
    it("returns level 1 for 0 XP", () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it("returns level 1 for 99 XP", () => {
      expect(calculateLevel(99)).toBe(1);
    });

    it("returns level 2 at 100 XP", () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it("returns level 3 at 400 XP", () => {
      expect(calculateLevel(400)).toBe(3);
    });

    it("returns level 4 at 900 XP", () => {
      expect(calculateLevel(900)).toBe(4);
    });

    it("returns level 10 at 8100 XP", () => {
      expect(calculateLevel(8100)).toBe(10);
    });

    it("handles large XP values", () => {
      expect(calculateLevel(1000000)).toBeGreaterThan(50);
    });
  });

  describe("xpForLevel", () => {
    it("requires 0 XP for level 1", () => {
      expect(xpForLevel(1)).toBe(0);
    });

    it("requires 100 XP for level 2", () => {
      expect(xpForLevel(2)).toBe(100);
    });

    it("requires 400 XP for level 3", () => {
      expect(xpForLevel(3)).toBe(400);
    });

    it("is inverse of calculateLevel", () => {
      for (let level = 1; level <= 20; level++) {
        const xp = xpForLevel(level);
        expect(calculateLevel(xp)).toBe(level);
      }
    });
  });

  describe("XP_RATES", () => {
    it("has all expected rate keys", () => {
      expect(XP_RATES).toHaveProperty("message_sent");
      expect(XP_RATES).toHaveProperty("reaction_received");
      expect(XP_RATES).toHaveProperty("ai_interaction");
      expect(XP_RATES).toHaveProperty("game_won");
      expect(XP_RATES).toHaveProperty("poll_created");
      expect(XP_RATES).toHaveProperty("daily_streak");
    });

    it("game_won gives more XP than message_sent", () => {
      expect(XP_RATES.game_won).toBeGreaterThan(XP_RATES.message_sent);
    });

    it("all rates are positive integers", () => {
      for (const [, rate] of Object.entries(XP_RATES)) {
        expect(rate).toBeGreaterThan(0);
        expect(Number.isInteger(rate)).toBe(true);
      }
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  MESSAGE_TYPES,
  CHANNEL_TYPES,
  GAME_TYPES,
  GAME_STATUSES,
  MAX_MESSAGE_LENGTH,
  AI_BOT_NAME,
  AI_PERSONAS,
  AI_MAX_AGENT_STEPS,
  WORKSPACE_ROLES,
} from "./constants";

describe("Constants", () => {
  describe("MESSAGE_TYPES", () => {
    it("includes core types", () => {
      expect(MESSAGE_TYPES).toContain("text");
      expect(MESSAGE_TYPES).toContain("system");
      expect(MESSAGE_TYPES).toContain("poll");
    });

    it("includes living message types", () => {
      expect(MESSAGE_TYPES).toContain("countdown");
      expect(MESSAGE_TYPES).toContain("live_score");
      expect(MESSAGE_TYPES).toContain("self_destruct");
      expect(MESSAGE_TYPES).toContain("dynamic_card");
    });

    it("includes whiteboard type", () => {
      expect(MESSAGE_TYPES).toContain("whiteboard");
    });

    it("has no duplicates", () => {
      const unique = new Set(MESSAGE_TYPES);
      expect(unique.size).toBe(MESSAGE_TYPES.length);
    });
  });

  describe("CHANNEL_TYPES", () => {
    it("includes public, private, and dm", () => {
      expect(CHANNEL_TYPES).toContain("public");
      expect(CHANNEL_TYPES).toContain("private");
      expect(CHANNEL_TYPES).toContain("dm");
    });
  });

  describe("GAME_TYPES", () => {
    it("includes all game types", () => {
      expect(GAME_TYPES).toContain("trivia");
      expect(GAME_TYPES).toContain("wordle");
      expect(GAME_TYPES).toContain("tic_tac_toe");
      expect(GAME_TYPES).toContain("cards");
    });
  });

  describe("WORKSPACE_ROLES", () => {
    it("has owner, admin, member in order", () => {
      expect(WORKSPACE_ROLES[0]).toBe("owner");
      expect(WORKSPACE_ROLES[1]).toBe("admin");
      expect(WORKSPACE_ROLES[2]).toBe("member");
    });
  });

  describe("AI configuration", () => {
    it("has a bot name", () => {
      expect(AI_BOT_NAME).toBe("SuperBot");
    });

    it("allows multi-step agent", () => {
      expect(AI_MAX_AGENT_STEPS).toBeGreaterThanOrEqual(2);
    });

    it("has at least 3 personas", () => {
      expect(AI_PERSONAS.length).toBeGreaterThanOrEqual(3);
    });

    it("each persona has id, label, description", () => {
      for (const persona of AI_PERSONAS) {
        expect(persona).toHaveProperty("id");
        expect(persona).toHaveProperty("label");
        expect(persona).toHaveProperty("description");
        expect(persona.id.length).toBeGreaterThan(0);
      }
    });

    it("persona ids are unique", () => {
      const ids = AI_PERSONAS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("Limits", () => {
    it("max message length is 4000", () => {
      expect(MAX_MESSAGE_LENGTH).toBe(4000);
    });

    it("game statuses cover full lifecycle", () => {
      expect(GAME_STATUSES).toContain("waiting");
      expect(GAME_STATUSES).toContain("in_progress");
      expect(GAME_STATUSES).toContain("finished");
    });
  });
});

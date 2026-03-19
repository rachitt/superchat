import { describe, it, expect } from "vitest";
import { sendMessageSchema, editMessageSchema } from "./message";

describe("Message Validators", () => {
  describe("sendMessageSchema", () => {
    it("validates a minimal message", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        content: "Hello!",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("text");
      }
    });

    it("validates a message with all fields", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        content: "Hello!",
        type: "poll",
        payload: { question: "Favorite color?", options: ["Red", "Blue"] },
        parentId: "660e8400-e29b-41d4-a716-446655440000",
        expiresAt: "2026-12-31T23:59:59Z",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty content", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        content: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects content over max length", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        content: "a".repeat(4001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid channelId format", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "not-a-uuid",
        content: "Hello!",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid message type", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        content: "Hello!",
        type: "invalid_type",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid message types", () => {
      const types = ["text", "system", "poll", "countdown", "live_score", "self_destruct", "whiteboard"] as const;
      for (const type of types) {
        const result = sendMessageSchema.safeParse({
          channelId: "550e8400-e29b-41d4-a716-446655440000",
          content: "test",
          type,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts content at exactly max length", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        content: "a".repeat(4000),
      });
      expect(result.success).toBe(true);
    });

    it("allows null parentId", () => {
      const result = sendMessageSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        content: "reply",
        parentId: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("editMessageSchema", () => {
    it("validates a valid edit", () => {
      const result = editMessageSchema.safeParse({
        messageId: "550e8400-e29b-41d4-a716-446655440000",
        content: "Updated content",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty content", () => {
      const result = editMessageSchema.safeParse({
        messageId: "550e8400-e29b-41d4-a716-446655440000",
        content: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid messageId", () => {
      const result = editMessageSchema.safeParse({
        messageId: "not-uuid",
        content: "Updated",
      });
      expect(result.success).toBe(false);
    });
  });
});

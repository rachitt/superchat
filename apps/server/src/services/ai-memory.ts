import { eq, and } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "../db/index.js";
import { aiUserMemory } from "../db/schema/ai-memory.js";
import { getLightModel } from "../lib/ai.js";

/**
 * Get all memories for a user in a workspace.
 */
export async function getMemories(
  userId: string,
  workspaceId: string
): Promise<{ key: string; value: string }[]> {
  return db
    .select({ key: aiUserMemory.key, value: aiUserMemory.value })
    .from(aiUserMemory)
    .where(
      and(
        eq(aiUserMemory.userId, userId),
        eq(aiUserMemory.workspaceId, workspaceId)
      )
    );
}

/**
 * Save (upsert) a memory for a user in a workspace.
 */
export async function saveMemory(
  userId: string,
  workspaceId: string,
  key: string,
  value: string
): Promise<void> {
  await db
    .insert(aiUserMemory)
    .values({ userId, workspaceId, key, value })
    .onConflictDoUpdate({
      target: [aiUserMemory.userId, aiUserMemory.workspaceId, aiUserMemory.key],
      set: { value, updatedAt: new Date() },
    });
}

/**
 * Extract key facts from a conversation using a light model, then store them.
 */
export async function extractMemories(
  conversationText: string,
  userId: string,
  workspaceId: string
): Promise<void> {
  const { object } = await generateObject({
    model: getLightModel(),
    schema: z.object({
      facts: z.array(
        z.object({
          key: z.string().describe("Short key like 'name', 'role', 'preference_language'"),
          value: z.string().describe("The extracted fact"),
        })
      ),
    }),
    prompt: `Extract key facts about the user from this conversation that would be useful to remember for future interactions. Focus on: name, role, preferences, expertise, current projects, timezone. Only include clearly stated facts, not assumptions.

Conversation:
${conversationText.slice(0, 3000)}

Return an array of key-value facts. Return an empty array if no notable facts are found.`,
  });

  for (const fact of object.facts) {
    await saveMemory(userId, workspaceId, fact.key, fact.value);
  }
}

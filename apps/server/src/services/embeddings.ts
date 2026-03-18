import { embed } from "ai";
import { sql, eq, and } from "drizzle-orm";
import { google } from "../lib/ai.js";
import { db } from "../db/index.js";
import { messageEmbeddings } from "../db/schema/embeddings.js";
import { messages, user as users } from "../db/schema/index.js";
import { withSpan } from "../lib/tracing.js";

/**
 * Generate an embedding vector for the given text using Gemini's text-embedding-004.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return withSpan("embeddings.generate", async () => {
    if (!google) {
      throw new Error("GEMINI_API_KEY is required for embeddings");
    }

    const { embedding } = await embed({
      model: google.textEmbeddingModel("text-embedding-004"),
      value: text,
    });

    return embedding;
  }, { "embedding.textLength": text.length });
}

/**
 * Generate and store an embedding for a message.
 */
export async function embedAndStore(
  messageId: string,
  channelId: string,
  content: string
): Promise<void> {
  if (!content || content.trim().length < 5) return;

  const embedding = await generateEmbedding(content);

  await db
    .insert(messageEmbeddings)
    .values({ messageId, channelId, embedding })
    .onConflictDoUpdate({
      target: messageEmbeddings.messageId,
      set: { embedding, createdAt: new Date() },
    });
}

/**
 * Find the most similar messages in a channel using cosine similarity.
 */
export async function findSimilar(
  channelId: string,
  query: string,
  limit: number = 10
): Promise<{ messageId: string; content: string; authorName: string; similarity: number }[]> {
  return withSpan("embeddings.findSimilar", async () => {
    return _findSimilarInner(channelId, query, limit);
  }, { "embedding.channelId": channelId, "embedding.limit": limit });
}

async function _findSimilarInner(
  channelId: string,
  query: string,
  limit: number,
): Promise<{ messageId: string; content: string; authorName: string; similarity: number }[]> {
  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const results = await db
    .select({
      messageId: messageEmbeddings.messageId,
      content: messages.content,
      authorName: users.name,
      username: users.username,
      similarity: sql<number>`1 - (${messageEmbeddings.embedding} <=> ${vectorStr}::vector)`,
    })
    .from(messageEmbeddings)
    .innerJoin(messages, eq(messages.id, messageEmbeddings.messageId))
    .innerJoin(users, eq(users.id, messages.authorId))
    .where(and(eq(messageEmbeddings.channelId, channelId), sql`${messages.deletedAt} IS NULL`))
    .orderBy(sql`${messageEmbeddings.embedding} <=> ${vectorStr}::vector`)
    .limit(limit);

  return results.map((r) => ({
    messageId: r.messageId,
    content: r.content,
    authorName: r.authorName ?? r.username ?? "User",
    similarity: r.similarity,
  }));
}

import { eq, and, isNull, sql } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "../db/index.js";
import { messages, user as users } from "../db/schema/index.js";
import { channels } from "../db/schema/channels.js";
import { messageEmbeddings } from "../db/schema/embeddings.js";
import { generateEmbedding } from "./embeddings.js";
import { getLightModel } from "../lib/ai.js";
import { createChildLogger } from "../lib/logger.js";

const log = createChildLogger({ module: "hybrid-search" });

export type SearchMode = "keyword" | "semantic" | "hybrid";

interface SearchResult {
  messageId: string;
  content: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  authorUsername: string;
  createdAt: Date;
  headline: string;
  score: number;
}

interface HybridSearchOptions {
  query: string;
  workspaceId: string;
  channelId?: string;
  limit?: number;
  mode?: SearchMode;
  rerank?: boolean;
}

/**
 * Reciprocal Rank Fusion: merges two ranked lists into a single scored list.
 * score = sum(1 / (k + rank)) across all lists where the item appears.
 */
function reciprocalRankFusion<T>(
  lists: { items: T[]; getId: (item: T) => string }[],
  k: number = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const list of lists) {
    list.items.forEach((item, index) => {
      const id = list.getId(item);
      const current = scores.get(id) ?? 0;
      scores.set(id, current + 1 / (k + index + 1));
    });
  }

  return scores;
}

/**
 * Run keyword (tsvector) search.
 */
async function keywordSearch(opts: { query: string; workspaceId: string; channelId?: string; limit: number }) {
  const tsquery = sql`plainto_tsquery('english', ${opts.query})`;
  const likePattern = `%${opts.query}%`;

  const conditions = [
    eq(channels.workspaceId, opts.workspaceId),
    isNull(messages.deletedAt),
    sql`(${messages.searchVector} @@ ${tsquery} OR ${messages.content} ILIKE ${likePattern})`,
  ];

  if (opts.channelId) {
    conditions.push(eq(messages.channelId, opts.channelId));
  }

  return db
    .select({
      messageId: messages.id,
      content: messages.content,
      channelId: messages.channelId,
      channelName: channels.name,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
      authorUsername: users.username,
      createdAt: messages.createdAt,
      headline: sql<string>`ts_headline('english', ${messages.content}, ${tsquery})`.as("headline"),
      rank: sql<number>`COALESCE(ts_rank(${messages.searchVector}, ${tsquery}), 0)`.as("rank"),
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.authorId))
    .innerJoin(channels, eq(channels.id, messages.channelId))
    .where(and(...conditions))
    .orderBy(sql`COALESCE(ts_rank(${messages.searchVector}, ${tsquery}), 0) DESC`)
    .limit(opts.limit);
}

/**
 * Run semantic (pgvector) search.
 */
async function semanticSearch(opts: { query: string; workspaceId: string; channelId?: string; limit: number }) {
  const queryEmbedding = await generateEmbedding(opts.query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const conditions = [
    eq(channels.workspaceId, opts.workspaceId),
    sql`${messages.deletedAt} IS NULL`,
  ];

  if (opts.channelId) {
    conditions.push(eq(messageEmbeddings.channelId, opts.channelId));
  }

  return db
    .select({
      messageId: messageEmbeddings.messageId,
      content: messages.content,
      channelId: messageEmbeddings.channelId,
      channelName: channels.name,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
      authorUsername: users.username,
      createdAt: messages.createdAt,
      similarity: sql<number>`1 - (${messageEmbeddings.embedding} <=> ${vectorStr}::vector)`.as("similarity"),
    })
    .from(messageEmbeddings)
    .innerJoin(messages, eq(messages.id, messageEmbeddings.messageId))
    .innerJoin(users, eq(users.id, messages.authorId))
    .innerJoin(channels, eq(channels.id, messageEmbeddings.channelId))
    .where(and(...conditions))
    .orderBy(sql`${messageEmbeddings.embedding} <=> ${vectorStr}::vector`)
    .limit(opts.limit);
}

/**
 * Optionally re-rank results using an LLM cross-encoder.
 */
async function llmRerank(query: string, results: SearchResult[], topN: number = 10): Promise<SearchResult[]> {
  if (results.length <= 3) return results;

  try {
    const candidates = results.slice(0, 20).map((r, i) => `[${i}] ${r.authorName}: ${r.content.slice(0, 200)}`).join("\n");

    const { object } = await generateObject({
      model: getLightModel(),
      schema: z.object({
        rankedIndices: z.array(z.number()).describe("Indices of results ranked by relevance, most relevant first"),
      }),
      prompt: `Given the search query: "${query}"\n\nRank these chat messages by relevance to the query. Return the indices of the top ${topN} most relevant results, most relevant first.\n\n${candidates}`,
    });

    return object.rankedIndices
      .filter((i: number) => i >= 0 && i < results.length)
      .slice(0, topN)
      .map((i: number, rank: number) => ({ ...results[i], score: 1 / (1 + rank) }));
  } catch (err) {
    log.warn({ err }, "LLM rerank failed, using RRF scores");
    return results.slice(0, topN);
  }
}

/**
 * Hybrid search: runs keyword + semantic in parallel, fuses with RRF, optionally re-ranks.
 */
export async function hybridSearch(opts: HybridSearchOptions): Promise<SearchResult[]> {
  const { query, workspaceId, channelId, limit = 20, mode = "hybrid", rerank = false } = opts;

  if (mode === "keyword") {
    const results = await keywordSearch({ query, workspaceId, channelId, limit });
    return results.map((r) => ({
      messageId: r.messageId,
      content: r.content,
      channelId: r.channelId,
      channelName: r.channelName,
      authorId: r.authorId,
      authorName: r.authorName ?? r.authorUsername ?? "User",
      authorImage: r.authorImage,
      authorUsername: r.authorUsername ?? "user",
      createdAt: r.createdAt,
      headline: r.headline,
      score: r.rank,
    }));
  }

  if (mode === "semantic") {
    try {
      const results = await semanticSearch({ query, workspaceId, channelId, limit });
      return results.map((r) => ({
        messageId: r.messageId,
        content: r.content,
        channelId: r.channelId,
        channelName: r.channelName,
        authorId: r.authorId,
        authorName: r.authorName ?? r.authorUsername ?? "User",
        authorImage: r.authorImage,
        authorUsername: r.authorUsername ?? "user",
        createdAt: r.createdAt,
        headline: r.content,
        score: r.similarity,
      }));
    } catch {
      // Fall back to keyword if embeddings unavailable
      return hybridSearch({ ...opts, mode: "keyword" });
    }
  }

  // Hybrid mode: parallel keyword + semantic, fuse with RRF
  const fetchLimit = Math.min(limit * 2, 50);

  let keywordResults: Awaited<ReturnType<typeof keywordSearch>> = [];
  let semanticResults: Awaited<ReturnType<typeof semanticSearch>> = [];

  try {
    [keywordResults, semanticResults] = await Promise.all([
      keywordSearch({ query, workspaceId, channelId, limit: fetchLimit }),
      semanticSearch({ query, workspaceId, channelId, limit: fetchLimit }),
    ]);
  } catch {
    // Semantic failed, fall back to keyword only
    keywordResults = await keywordSearch({ query, workspaceId, channelId, limit });
  }

  // Build a merged map of all results by messageId
  const resultMap = new Map<string, SearchResult>();

  for (const r of keywordResults) {
    resultMap.set(r.messageId, {
      messageId: r.messageId,
      content: r.content,
      channelId: r.channelId,
      channelName: r.channelName,
      authorId: r.authorId,
      authorName: r.authorName ?? r.authorUsername ?? "User",
      authorImage: r.authorImage,
      authorUsername: r.authorUsername ?? "user",
      createdAt: r.createdAt,
      headline: r.headline,
      score: 0,
    });
  }

  for (const r of semanticResults) {
    if (!resultMap.has(r.messageId)) {
      resultMap.set(r.messageId, {
        messageId: r.messageId,
        content: r.content,
        channelId: r.channelId,
        channelName: r.channelName,
        authorId: r.authorId,
        authorName: r.authorName ?? r.authorUsername ?? "User",
        authorImage: r.authorImage,
        authorUsername: r.authorUsername ?? "user",
        createdAt: r.createdAt,
        headline: r.content,
        score: 0,
      });
    }
  }

  // Compute RRF scores
  const keywordIds = keywordResults.map((r) => r.messageId);
  const semanticIds = semanticResults.map((r) => r.messageId);
  const rrfScores = reciprocalRankFusion([
    { items: keywordIds, getId: (id) => id },
    { items: semanticIds, getId: (id) => id },
  ]);

  // Apply scores and sort
  const merged: SearchResult[] = [];
  for (const [id, score] of rrfScores) {
    const result = resultMap.get(id);
    if (result) {
      merged.push({ ...result, score });
    }
  }

  merged.sort((a, b) => b.score - a.score);
  const topResults = merged.slice(0, limit);

  if (rerank && topResults.length > 3) {
    return llmRerank(query, topResults, limit);
  }

  return topResults;
}

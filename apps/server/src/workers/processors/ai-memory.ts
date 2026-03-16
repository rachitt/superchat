import type { Job } from "bullmq";
import { extractMemories } from "../../services/ai-memory.js";

export interface MemoryJobData {
  conversationText: string;
  userId: string;
  workspaceId: string;
}

/**
 * BullMQ processor: extracts and stores user memories after an AI conversation.
 */
export async function processMemoryJob(job: Job<MemoryJobData>): Promise<void> {
  const { conversationText, userId, workspaceId } = job.data;
  await extractMemories(conversationText, userId, workspaceId);
}

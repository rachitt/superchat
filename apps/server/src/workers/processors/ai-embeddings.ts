import type { Job } from "bullmq";
import { embedAndStore } from "../../services/embeddings.js";

export interface EmbeddingJobData {
  messageId: string;
  channelId: string;
  content: string;
}

/**
 * BullMQ processor: generates and stores an embedding for a message.
 */
export async function processEmbeddingJob(job: Job<EmbeddingJobData>): Promise<void> {
  const { messageId, channelId, content } = job.data;
  await embedAndStore(messageId, channelId, content);
}

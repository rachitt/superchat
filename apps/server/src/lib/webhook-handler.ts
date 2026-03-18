import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { webhooks } from "../db/schema/webhooks.js";
import { messages } from "../db/schema/messages.js";
import { getIO } from "../socket/index.js";
import { formatGitHubEvent } from "./github-formatter.js";
import logger from "./logger.js";

const log = logger.child({ module: "webhook-handler" });

export function registerWebhookRoute(fastify: FastifyInstance) {
  fastify.post<{ Params: { token: string } }>(
    "/webhooks/:token",
    { config: { rawBody: true } },
    async (request, reply) => {
      const { token } = request.params;

      const [webhook] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.token, token))
        .limit(1);

      if (!webhook || !webhook.enabled) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      // Update lastUsedAt
      await db
        .update(webhooks)
        .set({ lastUsedAt: new Date() })
        .where(eq(webhooks.id, webhook.id));

      let content: string;

      if (webhook.type === "github") {
        const eventType = (request.headers["x-github-event"] as string) ?? "unknown";
        content = formatGitHubEvent(eventType, request.body as any);
      } else {
        // Generic webhook — expect { text: "..." } or use raw body
        const body = request.body as Record<string, unknown>;
        content = (body.text as string) ?? (body.message as string) ?? JSON.stringify(body);
      }

      // Insert message into channel
      const [msg] = await db
        .insert(messages)
        .values({
          channelId: webhook.channelId,
          authorId: webhook.createdBy,
          type: "system",
          content: `**[${webhook.name}]** ${content}`,
        })
        .returning();

      // Emit via Socket.IO
      try {
        const io = getIO();
        io.to(`channel:${webhook.channelId}`).emit("message:new", {
          id: msg.id,
          channelId: msg.channelId,
          authorId: msg.authorId,
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt.toISOString(),
          author: { id: msg.authorId, name: webhook.name, username: webhook.name, image: null },
        } as any);
      } catch {
        log.warn("Socket.IO not available for webhook broadcast");
      }

      log.info({ webhookId: webhook.id, channelId: webhook.channelId }, "Webhook processed");
      return reply.status(200).send({ ok: true });
    },
  );
}

import pino from "pino";
import { trace, context } from "@opentelemetry/api";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const ctx = span.spanContext();
      return { traceId: ctx.traceId, spanId: ctx.spanId };
    }
    return {};
  },
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;

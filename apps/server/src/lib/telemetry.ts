// Only initialize OpenTelemetry when OTEL_ENABLED=true or an OTLP endpoint is set.
// Auto-instrumentation patches every HTTP/DB/Redis call and significantly increases
// memory usage + prevents clean process shutdown, so it's opt-in only.

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const otelEnabled = process.env.OTEL_ENABLED === "true" || !!otlpEndpoint;

if (otelEnabled) {
  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");
  const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
  const { ConsoleSpanExporter } = await import("@opentelemetry/sdk-trace-base");

  const exporter = otlpEndpoint
    ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
    : new ConsoleSpanExporter();

  const sdk = new NodeSDK({
    serviceName: "superchat-server",
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => sdk.shutdown());
  process.on("SIGINT", () => sdk.shutdown());
}

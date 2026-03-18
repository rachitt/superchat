import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

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

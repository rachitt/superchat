type Labels = Record<string, string>;

function labelsToKey(labels: Labels): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
}

class Counter {
  private values = new Map<string, number>();
  constructor(
    public readonly name: string,
    public readonly help: string
  ) {}

  inc(labels: Labels = {}, value = 1) {
    const key = labelsToKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  format(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [key, value] of this.values) {
      const labelStr = key ? `{${key}}` : "";
      lines.push(`${this.name}${labelStr} ${value}`);
    }
    return lines.join("\n");
  }
}

class Gauge {
  private values = new Map<string, number>();
  constructor(
    public readonly name: string,
    public readonly help: string
  ) {}

  set(labels: Labels, value: number) {
    this.values.set(labelsToKey(labels), value);
  }

  inc(labels: Labels = {}, value = 1) {
    const key = labelsToKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  dec(labels: Labels = {}, value = 1) {
    const key = labelsToKey(labels);
    this.values.set(key, (this.values.get(key) || 0) - value);
  }

  format(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [key, value] of this.values) {
      const labelStr = key ? `{${key}}` : "";
      lines.push(`${this.name}${labelStr} ${value}`);
    }
    return lines.join("\n");
  }
}

class Histogram {
  private sums = new Map<string, number>();
  private counts = new Map<string, number>();
  constructor(
    public readonly name: string,
    public readonly help: string
  ) {}

  observe(labels: Labels, value: number) {
    const key = labelsToKey(labels);
    this.sums.set(key, (this.sums.get(key) || 0) + value);
    this.counts.set(key, (this.counts.get(key) || 0) + 1);
  }

  format(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} summary`];
    for (const [key, sum] of this.sums) {
      const count = this.counts.get(key) || 0;
      const labelStr = key ? `{${key}}` : "";
      lines.push(`${this.name}_sum${labelStr} ${sum}`);
      lines.push(`${this.name}_count${labelStr} ${count}`);
    }
    return lines.join("\n");
  }
}

// ── Metrics instances ──

export const httpRequestsTotal = new Counter(
  "http_requests_total",
  "Total HTTP requests"
);

export const httpRequestDuration = new Histogram(
  "http_request_duration_seconds",
  "HTTP request duration in seconds"
);

export const websocketConnectionsActive = new Gauge(
  "websocket_connections_active",
  "Active WebSocket connections"
);

export const websocketEventsTotal = new Counter(
  "websocket_events_total",
  "Total WebSocket events"
);

export const bullmqJobsProcessedTotal = new Counter(
  "bullmq_jobs_processed_total",
  "Total BullMQ jobs processed"
);

export const bullmqJobsDuration = new Histogram(
  "bullmq_jobs_duration_seconds",
  "BullMQ job processing duration in seconds"
);

export const aiRequestsTotal = new Counter(
  "ai_requests_total",
  "Total AI requests"
);

export const aiRequestDuration = new Histogram(
  "ai_request_duration_seconds",
  "AI request duration in seconds"
);

const allMetrics = [
  httpRequestsTotal,
  httpRequestDuration,
  websocketConnectionsActive,
  websocketEventsTotal,
  bullmqJobsProcessedTotal,
  bullmqJobsDuration,
  aiRequestsTotal,
  aiRequestDuration,
];

export function getMetrics(): string {
  return allMetrics.map((m) => m.format()).join("\n\n") + "\n";
}

"use client";

interface DynamicCardPayload {
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  color?: string;
  fields?: { label: string; value: string }[];
}

interface DynamicCardWidgetProps {
  messageId: string;
  payload: DynamicCardPayload;
}

export function DynamicCardWidget({ messageId, payload }: DynamicCardWidgetProps) {
  const accentColor = payload.color || "#6366f1";

  return (
    <div
      className="my-1 max-w-md overflow-hidden rounded-lg border border-border bg-muted/80"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      {payload.imageUrl && (
        <div className="h-36 w-full overflow-hidden bg-card">
          <img
            src={payload.imageUrl}
            alt={payload.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground">{payload.title}</p>
        {payload.description && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{payload.description}</p>
        )}

        {payload.fields && payload.fields.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {payload.fields.map((field, i) => (
              <div key={i} className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </span>
                <p className="truncate text-xs text-secondary-foreground">{field.value}</p>
              </div>
            ))}
          </div>
        )}

        {payload.linkUrl && (
          <a
            href={payload.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-medium text-teal-700 dark:text-teal-400 hover:text-teal-600 dark:text-teal-300 hover:underline"
          >
            {payload.linkLabel || "Open link"} →
          </a>
        )}
      </div>
    </div>
  );
}

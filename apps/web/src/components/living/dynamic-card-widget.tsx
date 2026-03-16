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
      className="my-1 max-w-md overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800/80"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      {payload.imageUrl && (
        <div className="h-36 w-full overflow-hidden bg-zinc-900">
          <img
            src={payload.imageUrl}
            alt={payload.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-zinc-100">{payload.title}</p>
        {payload.description && (
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{payload.description}</p>
        )}

        {payload.fields && payload.fields.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {payload.fields.map((field, i) => (
              <div key={i} className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {field.label}
                </span>
                <p className="truncate text-xs text-zinc-300">{field.value}</p>
              </div>
            ))}
          </div>
        )}

        {payload.linkUrl && (
          <a
            href={payload.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            {payload.linkLabel || "Open link"} →
          </a>
        )}
      </div>
    </div>
  );
}

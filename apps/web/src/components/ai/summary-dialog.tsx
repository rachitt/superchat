"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStore } from "@/stores/ai-store";
import { Sparkles, X, Copy, Check, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MESSAGE_COUNT_OPTIONS = [10, 25, 50, 100] as const;

interface SummaryDialogProps {
  onClose: () => void;
  onSummarize: (messageCount: number) => void;
}

export function SummaryDialog({ onClose, onSummarize }: SummaryDialogProps) {
  const summary = useAiStore((s) => s.summary);
  const isSummarizing = useAiStore((s) => s.isSummarizing);
  const [messageCount, setMessageCount] = useState<number>(50);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [summary]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-border bg-popover p-6 shadow-2xl animate-float-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Channel Summary</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Summarize last</label>
          <select
            value={messageCount}
            onChange={(e) => setMessageCount(Number(e.target.value))}
            className="rounded-lg border border-border bg-input px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          >
            {MESSAGE_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} messages</option>
            ))}
          </select>
          <button
            onClick={() => onSummarize(messageCount)}
            disabled={isSummarizing}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {isSummarizing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSummarizing ? "Summarizing..." : "Generate"}
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-background/50 p-4 text-sm text-secondary-foreground leading-relaxed">
          {isSummarizing ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/6" />
            </div>
          ) : summary ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">
              Select a message count and click Generate to create a summary.
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {summary && !isSummarizing && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

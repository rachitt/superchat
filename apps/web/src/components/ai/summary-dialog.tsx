"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStore } from "@/stores/ai-store";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Channel Summary</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300"
          >
            &times;
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-zinc-400">Summarize last</label>
          <select
            value={messageCount}
            onChange={(e) => setMessageCount(Number(e.target.value))}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300 outline-none focus:border-indigo-500"
          >
            {MESSAGE_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} messages
              </option>
            ))}
          </select>
          <button
            onClick={() => onSummarize(messageCount)}
            disabled={isSummarizing}
            className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSummarizing ? "Summarizing..." : "Generate"}
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto text-sm text-zinc-300 leading-relaxed">
          {isSummarizing ? (
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-3/6 animate-pulse rounded bg-zinc-800" />
            </div>
          ) : summary ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
          ) : (
            <p className="text-zinc-500">Select a message count and click Generate to create a summary.</p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {summary && !isSummarizing && (
            <button
              onClick={handleCopy}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

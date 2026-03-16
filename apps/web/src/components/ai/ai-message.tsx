"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStore } from "@/stores/ai-store";
import { AI_BOT_NAME } from "@superchat/shared";

interface AiMessageProps {
  messageId: string;
  /** Persisted content from the database (used when stream is done) */
  persistedContent: string;
}

export function AiMessage({ messageId, persistedContent }: AiMessageProps) {
  const stream = useAiStore((s) => s.streams.get(messageId));

  const content = stream?.content || persistedContent;
  const isStreaming = stream?.isStreaming ?? false;

  const markdownComponents = useMemo(
    () => ({
      pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
        <pre className="my-2 overflow-x-auto rounded-md bg-zinc-900 p-3 text-sm" {...props}>
          {children}
        </pre>
      ),
      code: ({ children, className, ...props }: React.ComponentProps<"code">) => {
        const isInline = !className;
        return isInline ? (
          <code className="rounded bg-zinc-700 px-1 py-0.5 text-sm text-indigo-300" {...props}>
            {children}
          </code>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      p: ({ children, ...props }: React.ComponentProps<"p">) => (
        <p className="mb-2 last:mb-0" {...props}>
          {children}
        </p>
      ),
      ul: ({ children, ...props }: React.ComponentProps<"ul">) => (
        <ul className="mb-2 ml-4 list-disc last:mb-0" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }: React.ComponentProps<"ol">) => (
        <ol className="mb-2 ml-4 list-decimal last:mb-0" {...props}>
          {children}
        </ol>
      ),
      a: ({ children, ...props }: React.ComponentProps<"a">) => (
        <a className="text-indigo-400 underline hover:text-indigo-300" target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      ),
    }),
    []
  );

  return (
    <div className="group relative flex gap-3 px-4 py-1.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white">
        AI
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-violet-400">{AI_BOT_NAME}</span>
          <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
            AI
          </span>
        </div>

        <div className="mt-0.5 text-sm text-zinc-300 leading-relaxed">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          ) : isStreaming ? (
            <span className="text-zinc-500">Thinking...</span>
          ) : null}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-violet-400" />
          )}
        </div>
      </div>
    </div>
  );
}

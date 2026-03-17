"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStore } from "@/stores/ai-store";
import { AI_BOT_NAME } from "@superchat/shared";
import { ToolCallDisplay } from "./tool-call-display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

interface AiMessageProps {
  messageId: string;
  persistedContent: string;
}

export function AiMessage({ messageId, persistedContent }: AiMessageProps) {
  const stream = useAiStore((s) => s.streams.get(messageId));

  const content = stream?.content || persistedContent;
  const isStreaming = stream?.isStreaming ?? false;

  const markdownComponents = useMemo(
    () => ({
      pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
        <pre className="my-2.5 overflow-x-auto rounded-lg bg-background/80 p-3.5 text-[13px] font-mono border border-border/50" {...props}>
          {children}
        </pre>
      ),
      code: ({ children, className, ...props }: React.ComponentProps<"code">) => {
        const isInline = !className;
        return isInline ? (
          <code className="rounded-md bg-teal-500/10 px-1.5 py-0.5 text-[13px] font-mono text-teal-600 dark:text-teal-300" {...props}>
            {children}
          </code>
        ) : (
          <code className={className} {...props}>{children}</code>
        );
      },
      p: ({ children, ...props }: React.ComponentProps<"p">) => (
        <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>
      ),
      ul: ({ children, ...props }: React.ComponentProps<"ul">) => (
        <ul className="mb-2 ml-4 list-disc last:mb-0 marker:text-teal-700 dark:text-teal-400/50" {...props}>{children}</ul>
      ),
      ol: ({ children, ...props }: React.ComponentProps<"ol">) => (
        <ol className="mb-2 ml-4 list-decimal last:mb-0 marker:text-teal-700 dark:text-teal-400/50" {...props}>{children}</ol>
      ),
      a: ({ children, ...props }: React.ComponentProps<"a">) => (
        <a className="text-teal-700 dark:text-teal-400 underline decoration-teal-400/30 hover:decoration-teal-400 transition-colors" target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      ),
      strong: ({ children, ...props }: React.ComponentProps<"strong">) => (
        <strong className="font-semibold text-foreground" {...props}>{children}</strong>
      ),
      blockquote: ({ children, ...props }: React.ComponentProps<"blockquote">) => (
        <blockquote className="my-2 border-l-2 border-teal-500/40 pl-3 text-muted-foreground italic" {...props}>
          {children}
        </blockquote>
      ),
    }),
    []
  );

  return (
    <div className="group relative flex gap-3 px-5 py-2">
      {/* Subtle gradient left border */}
      <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-teal-500/60 via-teal-500/40 to-transparent" />

      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-teal-600 to-emerald-600 text-white">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-teal-700 dark:text-teal-400">{AI_BOT_NAME}</span>
          <Badge variant="secondary" className="h-4.5 bg-teal-600/10 px-1.5 text-[10px] font-medium text-teal-700 dark:text-teal-400 border-teal-600/20">
            AI
          </Badge>
        </div>

        <div className="mt-1 text-[14px] text-secondary-foreground leading-relaxed">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex gap-1">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-teal-400" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-teal-400" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-teal-400" />
              </div>
              <span className="text-xs">Thinking...</span>
            </div>
          ) : null}
          {isStreaming && content && (
            <span className="ml-0.5 inline-block h-4 w-[3px] rounded-sm bg-teal-400 animate-cursor-blink" />
          )}
        </div>
        <ToolCallDisplay messageId={messageId} />
      </div>
    </div>
  );
}

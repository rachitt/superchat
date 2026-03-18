"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { codeToHtml } from "shiki";
import { Check, Copy, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectLanguage } from "@/lib/detect-language";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resolvedLang = language || detectLanguage(code) || "text";
  const displayLang = resolvedLang === "text" ? "plain" : resolvedLang;

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, {
      lang: resolvedLang,
      themes: {
        light: "vitesse-light",
        dark: "vitesse-dark",
      },
    })
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        // Fallback: try as plain text
        if (!cancelled) {
          codeToHtml(code, {
            lang: "text",
            themes: { light: "vitesse-light", dark: "vitesse-dark" },
          }).then((r) => { if (!cancelled) setHtml(r); }).catch(() => {});
        }
      });
    return () => { cancelled = true; };
  }, [code, resolvedLang]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="group/code relative my-2 overflow-hidden rounded-xl border border-border/70 bg-background/60 shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-3.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <Code2 className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wide">
            {displayLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
            copied
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/60"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      {html ? (
        <div
          className="overflow-x-auto p-4 text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_code]:!bg-transparent [&_.shiki]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-foreground/80">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
});

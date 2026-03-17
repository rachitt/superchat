"use client";

import { useEffect, useRef } from "react";
import { SLASH_COMMANDS } from "@superchat/shared";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommandPopoverProps {
  filter: string;
  selectedIndex: number;
  onSelect: (commandName: string) => void;
  onClose: () => void;
}

export function SlashCommandPopover({
  filter,
  selectedIndex,
  onSelect,
  onClose,
}: SlashCommandPopoverProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = SLASH_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(filter.toLowerCase())
  );

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-slide-up">
      <div className="border-b border-border/50 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Commands
        </span>
      </div>
      <div ref={listRef} className="max-h-56 overflow-y-auto py-1">
        {filtered.map((cmd, i) => (
          <button
            key={cmd.name}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(cmd.name);
            }}
            className={cn(
              "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
              i === selectedIndex
                ? "bg-accent text-foreground"
                : "text-secondary-foreground hover:bg-accent/50"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                i === selectedIndex
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Terminal className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold">/{cmd.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {cmd.description}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] font-mono text-muted-foreground/60">
                {cmd.usage}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

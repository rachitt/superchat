"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { useChatStore } from "@/stores/chat-store";
import { Search, Loader2, Hash, User, Sparkles, Type, Layers } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type SearchMode = "hybrid" | "keyword" | "semantic";

interface SearchDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

const SEARCH_MODES: { id: SearchMode; label: string; icon: React.ReactNode }[] = [
  { id: "hybrid", label: "Hybrid", icon: <Layers className="h-3 w-3" /> },
  { id: "keyword", label: "Keyword", icon: <Type className="h-3 w-3" /> },
  { id: "semantic", label: "Semantic", icon: <Sparkles className="h-3 w-3" /> },
];

export function SearchDialog({ workspaceId, open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentChannelOnly, setCurrentChannelOnly] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const inputRef = useRef<HTMLInputElement>(null);
  const params = useParams<{ workspaceSlug: string; channelId?: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const setHighlightedMessage = useChatStore((s) => s.setHighlightedMessage);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const { data, isFetching } = useQuery({
    ...trpc.search.search.queryOptions({
      query: debouncedQuery,
      workspaceId,
      channelId: currentChannelOnly ? params.channelId : undefined,
      mode: searchMode,
    }),
    enabled: debouncedQuery.length > 0,
  });

  const handleResultClick = useCallback(
    (channelId: string, messageId: string) => {
      setHighlightedMessage(messageId);
      router.push(`/${params.workspaceSlug}/${channelId}`);
      onClose();
    },
    [router, params.workspaceSlug, onClose, setHighlightedMessage]
  );

  if (!open) return null;

  const resultCount = data?.results.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-foreground/15 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-xl border border-border bg-popover shadow-2xl animate-float-up">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          {isFetching ? (
            <Loader2 className="h-4.5 w-4.5 shrink-0 animate-spin text-primary" />
          ) : (
            <Search className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground/60 outline-none"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
          {/* Search mode toggle */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5">
            {SEARCH_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSearchMode(mode.id)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  searchMode === mode.id
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode.icon}
                {mode.label}
              </button>
            ))}
          </div>

          {params.channelId && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={currentChannelOnly}
                onChange={(e) => setCurrentChannelOnly(e.target.checked)}
                className="rounded border-border accent-primary"
              />
              Current channel only
            </label>
          )}
          {debouncedQuery && !isFetching && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              {resultCount} result{resultCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-1.5">
          {!debouncedQuery && (
            <div className="flex flex-col items-center py-10">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                Type to search messages
              </p>
            </div>
          )}

          {debouncedQuery && !isFetching && data?.results.length === 0 && (
            <div className="flex flex-col items-center py-10">
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Try a different search term
              </p>
            </div>
          )}

          {data?.results.map((result) => (
            <button
              key={result.message.id}
              onClick={() => handleResultClick(result.message.channelId, result.message.id)}
              className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="bg-primary text-[7px] text-primary-foreground">
                      {(result.author.name ?? "?").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground/80">
                    {result.author.name ?? result.author.username}
                  </span>
                </div>
                <span className="flex items-center gap-0.5">
                  <Hash className="h-2.5 w-2.5" />
                  {result.channel.name}
                </span>
                {"score" in result && typeof result.score === "number" && result.score > 0 && (
                  <span className="rounded-md bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-mono text-teal-700 dark:text-teal-400">
                    {(result.score * 100).toFixed(0)}%
                  </span>
                )}
                <span className="ml-auto font-mono">
                  {new Date(result.message.createdAt).toLocaleDateString()}
                </span>
              </div>
              {"headline" in result && result.headline ? (
                <p
                  className="search-headline mt-1.5 line-clamp-2 text-[13px] text-secondary-foreground"
                  dangerouslySetInnerHTML={{ __html: result.headline as string }}
                />
              ) : (
                <p className="mt-1.5 line-clamp-2 text-[13px] text-secondary-foreground">
                  {result.message.content}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);
}

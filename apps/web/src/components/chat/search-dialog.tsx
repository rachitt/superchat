"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { useChatStore } from "@/stores/chat-store";

interface SearchDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ workspaceId, open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const params = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const setHighlightedMessage = useChatStore((s) => s.setHighlightedMessage);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const { data, isFetching } = useQuery({
    ...trpc.search.search.queryOptions({
      query: debouncedQuery,
      workspaceId,
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-zinc-700 px-4 py-3">
          <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <kbd className="hidden rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {!debouncedQuery && (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              Type to search messages
            </p>
          )}

          {debouncedQuery && isFetching && (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              Searching...
            </p>
          )}

          {debouncedQuery && !isFetching && data?.results.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              No results found
            </p>
          )}

          {data?.results.map((result) => (
            <button
              key={result.message.id}
              onClick={() => handleResultClick(result.message.channelId, result.message.id)}
              className="w-full rounded-md px-3 py-2 text-left hover:bg-zinc-800"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">
                  {result.author.name ?? result.author.username}
                </span>
                <span>in #{result.channel.name}</span>
                <span className="ml-auto">
                  {new Date(result.message.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-200">
                {result.message.content}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Hook to open search with Cmd+K / Ctrl+K */
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

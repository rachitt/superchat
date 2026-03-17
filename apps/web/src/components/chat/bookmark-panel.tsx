"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { X, Bookmark, MessageSquare, Pencil, Check, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BookmarkPanelProps {
  onClose: () => void;
}

export function BookmarkPanel({ onClose }: BookmarkPanelProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const params = useParams<{ workspaceSlug: string }>();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const { data, isLoading } = useQuery(
    trpc.bookmark.list.queryOptions({ limit: 50 })
  );

  const toggleMutation = useMutation({
    ...trpc.bookmark.toggle.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.bookmark.list.queryKey() });
    },
  });

  const updateMutation = useMutation({
    ...trpc.bookmark.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.bookmark.list.queryKey() });
      setEditingId(null);
    },
  });

  const handleNavigate = (channelId: string) => {
    router.push(`/${params.workspaceSlug}/${channelId}`);
    onClose();
  };

  const startEdit = (messageId: string, currentNote: string | null) => {
    setEditingId(messageId);
    setEditNote(currentNote ?? "");
  };

  const saveNote = (messageId: string) => {
    updateMutation.mutate({ messageId, note: editNote || null });
  };

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Saved Messages</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-lg bg-accent/30 p-3">
                <div className="h-3 w-24 rounded bg-accent/60" />
                <div className="h-3 w-full rounded bg-accent/40" />
                <div className="h-3 w-3/4 rounded bg-accent/40" />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Bookmark className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No saved messages</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bookmark messages to find them here later
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {data.items.map(({ bookmark, message, author, channel }) => (
              <div
                key={bookmark.id}
                className="group rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-accent/30"
              >
                {/* Channel + Timestamp */}
                <div className="mb-1.5 flex items-center justify-between">
                  <button
                    onClick={() => handleNavigate(message.channelId)}
                    className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span className="font-medium">#{channel.name}</span>
                  </button>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(message.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Author + Content */}
                <div className="flex gap-2">
                  <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                    <AvatarImage src={author.image ?? undefined} />
                    <AvatarFallback className="bg-primary text-[8px] font-semibold text-primary-foreground">
                      {author.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-foreground">
                      {author.name}
                    </span>
                    <p className="mt-0.5 text-xs text-secondary-foreground line-clamp-2 leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>

                {/* Note */}
                {editingId === message.id ? (
                  <div className="mt-2 flex gap-1.5">
                    <input
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveNote(message.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      placeholder="Add a note..."
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50"
                      autoFocus
                    />
                    <button
                      onClick={() => saveNote(message.id)}
                      className="rounded-md p-1 text-primary hover:bg-primary/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : bookmark.note ? (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/5 border border-amber-500/10 px-2.5 py-1.5">
                    <p className="flex-1 text-[11px] text-amber-300/80 leading-relaxed">{bookmark.note}</p>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => startEdit(message.id, bookmark.note)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Edit note</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleMutation.mutate({ messageId: message.id })}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Remove bookmark</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

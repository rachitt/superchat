"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { useChatStore } from "@/stores/chat-store";
import { X, Pin, PinOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PinnedPanelProps {
  channelId: string;
  onClose: () => void;
}

export function PinnedPanel({ channelId, onClose }: PinnedPanelProps) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const setHighlightedMessage = useChatStore((s) => s.setHighlightedMessage);

  const { data, isLoading } = useQuery(
    trpc.message.getPinned.queryOptions({ channelId })
  );

  const unpinMutation = useMutation({
    ...trpc.message.pin.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.message.getPinned.queryKey({ channelId }),
      });
    },
  });

  const handleJumpToMessage = (messageId: string) => {
    setHighlightedMessage(messageId);
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">Pinned Messages</h3>
          {data && data.length > 0 && (
            <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
              {data.length}
            </span>
          )}
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
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Pin className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No pinned messages</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pin important messages to keep them visible
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {data.map(({ message, author }) => {
              const time = new Date(message.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const isOwn = session?.user?.id === message.authorId;

              return (
                <div
                  key={message.id}
                  className="group rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-accent/30"
                >
                  {/* Author + Timestamp */}
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={author.image ?? undefined} />
                        <AvatarFallback className="bg-primary text-[7px] font-semibold text-primary-foreground">
                          {author.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground">
                        {author.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{time}</span>
                  </div>

                  {/* Content */}
                  <button
                    onClick={() => handleJumpToMessage(message.id)}
                    className="w-full text-left"
                  >
                    <p className="text-xs text-secondary-foreground line-clamp-3 leading-relaxed hover:text-foreground transition-colors">
                      {message.content}
                    </p>
                  </button>

                  {/* Unpin action */}
                  {isOwn && (
                    <div className="mt-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              unpinMutation.mutate({
                                messageId: message.id,
                                pinned: false,
                              })
                            }
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                          >
                            <PinOff className="h-3 w-3" />
                            Unpin
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Unpin this message</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { CalendarClock, X, Trash2, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScheduledMessagesPanelProps {
  channelId: string;
  onClose: () => void;
}

export function ScheduledMessagesPanel({ channelId, onClose }: ScheduledMessagesPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: scheduled, isLoading } = useQuery(
    trpc.scheduled.list.queryOptions({ channelId })
  );

  const cancelMutation = useMutation({
    ...trpc.scheduled.cancel.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.scheduled.list.queryKey({ channelId }) });
    },
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today at ${time}`;
    if (isTomorrow) return `Tomorrow at ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
  };

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-foreground">Scheduled Messages</h3>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Close</TooltipContent>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !scheduled || scheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-6">
            <CalendarClock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No scheduled messages</p>
            <p className="text-xs text-muted-foreground/60">
              Use the schedule button in the message input to send messages later
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {scheduled.map((msg) => (
              <div
                key={msg.id}
                className="group relative rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-[13px] text-foreground leading-relaxed line-clamp-3">
                    {msg.content}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => cancelMutation.mutate({ id: msg.id })}
                        disabled={cancelMutation.isPending}
                        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
                    {formatTime(msg.scheduledFor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

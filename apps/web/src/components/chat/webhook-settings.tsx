"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { Copy, Plus, Trash2, RefreshCw, Webhook } from "lucide-react";
import { toast } from "sonner";

interface Props {
  channelId: string;
  onClose: () => void;
}

export function WebhookSettings({ channelId, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"generic" | "github">("generic");

  const { data: webhooks } = useQuery(
    trpc.webhook.list.queryOptions({ channelId }),
  );

  const createMutation = useMutation({
    ...trpc.webhook.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.webhook.list.queryKey({ channelId }) });
      setName("");
      toast.success("Webhook created");
    },
  });

  const deleteMutation = useMutation({
    ...trpc.webhook.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.webhook.list.queryKey({ channelId }) });
      toast.success("Webhook deleted");
    },
  });

  const regenerateMutation = useMutation({
    ...trpc.webhook.regenerateToken.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.webhook.list.queryKey({ channelId }) });
      toast.success("Token regenerated");
    },
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin.replace(/:\d+$/, ":4000") : "";

  function copyUrl(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/webhooks/${token}`);
    toast.success("Webhook URL copied");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Webhook className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Webhooks</h2>
            <p className="text-xs text-muted-foreground">Receive external messages in this channel</p>
          </div>
        </div>

        {/* Create form */}
        <div className="mb-5 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Webhook name..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "generic" | "github")}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
          >
            <option value="generic">Generic</option>
            <option value="github">GitHub</option>
          </select>
          <button
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ channelId, name: name.trim(), type })}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {/* List */}
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {(!webhooks || webhooks.length === 0) && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No webhooks yet. Create one to receive external messages.
            </p>
          )}
          {webhooks?.map((wh) => (
            <div
              key={wh.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{wh.name}</p>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {wh.type}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  /webhooks/{wh.token.slice(0, 8)}...
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyUrl(wh.token)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Copy URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => regenerateMutation.mutate({ id: wh.id })}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Regenerate token"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: wh.id })}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* GitHub setup instructions */}
        {webhooks?.some((wh) => wh.type === "github") && (
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-medium text-foreground">GitHub Setup</p>
            <ol className="mt-1.5 list-inside list-decimal space-y-0.5 text-[11px] text-muted-foreground">
              <li>Go to your repo Settings &rarr; Webhooks</li>
              <li>Paste the webhook URL</li>
              <li>Set Content-Type to <code className="rounded bg-background px-1">application/json</code></li>
              <li>Select events: Pushes, Pull requests, Issues, Releases</li>
            </ol>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { Hash, Lock, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateChannelDialogProps {
  workspaceId: string;
  onClose: () => void;
}

export function CreateChannelDialog({ workspaceId, onClose }: CreateChannelDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");

  const createChannel = useMutation(
    trpc.channel.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.channel.listByWorkspace.queryOptions({ workspaceId }).queryKey,
        });
        onClose();
      },
    })
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-popover p-6 shadow-2xl animate-float-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">Create Channel</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createChannel.mutate({
              workspaceId,
              name: name.toLowerCase().replace(/\s+/g, "-"),
              description: description || undefined,
              type,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="general"
              required
              className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("public")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
                type === "public"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <Hash className="h-3.5 w-3.5" /> Public
            </button>
            <button
              type="button"
              onClick={() => setType("private")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
                type === "private"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <Lock className="h-3.5 w-3.5" /> Private
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createChannel.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {createChannel.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {createChannel.isPending ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const { data: workspaces } = useQuery({
    ...trpc.workspace.list.queryOptions(),
    enabled: !!session,
  });

  const createWorkspace = useMutation(
    trpc.workspace.create.mutationOptions({
      onSuccess: (workspace) => {
        queryClient.invalidateQueries({ queryKey: trpc.workspace.list.queryOptions().queryKey });
        setCreating(false);
        setName("");
        setSlug("");
        router.push(`/${workspace.slug}`);
      },
    })
  );

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center animate-float-up">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <MessageSquare className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            SuperChat
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto">
            Real-time chat with AI, games, and living messages
          </p>
          <div className="mt-8">
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-lg shadow-primary/20"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 px-4 animate-float-up">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Your Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a workspace or create a new one
          </p>
        </div>

        <div className="space-y-2">
          {workspaces?.map((ws) => (
            <button
              key={ws.id}
              onClick={() => router.push(`/${ws.slug}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-accent hover:shadow-sm"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                  {ws.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{ws.name}</p>
                <p className="text-xs text-muted-foreground">/{ws.slug}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createWorkspace.mutate({ name, slug });
            }}
            className="space-y-3 rounded-xl border border-border bg-card p-5 animate-slide-up"
          >
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              placeholder="Workspace name"
              required
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="workspace-slug"
              required
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createWorkspace.isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {createWorkspace.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent/30 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Create a workspace
          </button>
        )}
      </div>
    </div>
  );
}

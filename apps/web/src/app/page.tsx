"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">SuperChat</h1>
          <p className="mt-2 text-zinc-400">
            Real-time chat with AI, games, and living messages
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <a
              href="/login"
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Your Workspaces</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Select a workspace or create a new one
          </p>
        </div>

        <div className="space-y-2">
          {workspaces?.map((ws) => (
            <button
              key={ws.id}
              onClick={() => router.push(`/${ws.slug}`)}
              className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                {ws.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">{ws.name}</p>
                <p className="text-xs text-zinc-500">/{ws.slug}</p>
              </div>
            </button>
          ))}
        </div>

        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createWorkspace.mutate({ name, slug });
            }}
            className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              placeholder="Workspace name"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="workspace-slug"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createWorkspace.isPending}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {createWorkspace.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            + Create a workspace
          </button>
        )}
      </div>
    </div>
  );
}

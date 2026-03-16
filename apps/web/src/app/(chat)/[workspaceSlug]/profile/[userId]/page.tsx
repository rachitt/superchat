"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { usePresenceStore } from "@/stores/presence-store";
import { OnlineIndicator } from "@/components/ui/online-indicator";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { useState } from "react";

export default function ProfilePage() {
  const params = useParams<{ workspaceSlug: string; userId: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();
  const [showEdit, setShowEdit] = useState(false);

  const { data: user, isLoading } = useQuery(
    trpc.user.getById.queryOptions({ userId: params.userId })
  );

  const { data: workspace } = useQuery(
    trpc.workspace.getBySlug.queryOptions({ slug: params.workspaceSlug })
  );

  const queryClient = useQueryClient();
  const presence = usePresenceStore((s) => s.users.get(params.userId));
  const isOwnProfile = session?.user?.id === params.userId;

  const dmMutation = useMutation(trpc.dm.findOrCreate.mutationOptions());

  const handleMessage = async () => {
    if (!workspace?.id) return;
    const channel = await dmMutation.mutateAsync({
      workspaceId: workspace.id,
      targetUserId: params.userId,
    });
    queryClient.invalidateQueries({ queryKey: trpc.dm.list.queryKey({ workspaceId: workspace.id }) });
    router.push(`/${params.workspaceSlug}/${channel.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-zinc-400">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-zinc-400">User not found</div>
      </div>
    );
  }

  const initials = (user.name ?? "?").slice(0, 2).toUpperCase();
  const levelProgress = user.xp ? (user.xp % 100) : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header banner */}
      <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />

      <div className="mx-auto w-full max-w-2xl px-6">
        {/* Avatar + actions row */}
        <div className="flex items-end justify-between -mt-12">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-zinc-900 bg-indigo-600 text-2xl font-bold text-white">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? ""}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            {presence && (
              <OnlineIndicator
                status={presence.status}
                className="absolute bottom-1 right-1 h-4 w-4 border-2 border-zinc-900"
              />
            )}
          </div>

          <div className="flex gap-2 pb-2">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEdit(true)}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleMessage}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Message
              </button>
            )}
          </div>
        </div>

        {/* User info */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-zinc-100">{user.name}</h1>
          {user.username && (
            <p className="text-sm text-zinc-400">@{user.username}</p>
          )}
          {user.status && (
            <p className="mt-1 text-sm text-zinc-300">{user.status}</p>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              About
            </h3>
            <p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">
              {user.bio}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-400">{user.level}</p>
            <p className="text-xs text-zinc-500">Level</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-400">{user.xp}</p>
            <p className="text-xs text-zinc-500">XP</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-400">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
            <p className="text-xs text-zinc-500">Joined</p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Level {user.level}</span>
            <span>{levelProgress}/100 XP</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {showEdit && (
        <EditProfileDialog onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}

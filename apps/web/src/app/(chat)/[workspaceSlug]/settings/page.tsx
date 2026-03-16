"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";

export default function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data: user } = useQuery(trpc.user.me.queryOptions());

  const updateMutation = useMutation(trpc.user.updateProfile.mutationOptions());

  const handleStatusClear = async () => {
    await updateMutation.mutateAsync({ status: "" });
    queryClient.invalidateQueries({ queryKey: trpc.user.me.queryKey() });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>

        {/* Profile section */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Profile
          </h2>
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  (user?.name ?? "?").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-100">{user?.name}</p>
                {user?.username && (
                  <p className="text-xs text-zinc-400">@{user.username}</p>
                )}
                {user?.status && (
                  <p className="text-xs text-zinc-500">{user.status}</p>
                )}
              </div>
              <button
                onClick={() => setShowEditProfile(true)}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
              >
                Edit
              </button>
            </div>
          </div>
        </section>

        {/* Status section */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Status
          </h2>
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            {user?.status ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-300">{user.status}</p>
                <button
                  onClick={handleStatusClear}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Clear status
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No status set</p>
            )}
          </div>
        </section>

        {/* Account info */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Account
          </h2>
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="text-sm text-zinc-300">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-zinc-500">Username</p>
                <p className="text-sm text-zinc-300">
                  {user?.username ? `@${user.username}` : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-zinc-500">Member since</p>
                <p className="text-sm text-zinc-300">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Gamification stats */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Stats
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-400">{user?.level ?? 1}</p>
              <p className="text-xs text-zinc-500">Level</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-400">{user?.xp ?? 0}</p>
              <p className="text-xs text-zinc-500">XP</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-400">{user?.streakDays ?? 0}</p>
              <p className="text-xs text-zinc-500">Streak Days</p>
            </div>
          </div>
        </section>
      </div>

      {showEditProfile && (
        <EditProfileDialog onClose={() => setShowEditProfile(false)} />
      )}
    </div>
  );
}

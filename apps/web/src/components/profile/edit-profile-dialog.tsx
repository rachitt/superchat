"use client";

import { useState, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EditProfileDialogProps {
  onClose: () => void;
}

export function EditProfileDialog({ onClose }: EditProfileDialogProps) {
  const { data: session } = useSession();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useQuery(
    trpc.user.me.queryOptions()
  );

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [status, setStatus] = useState(user?.status ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.image ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const updateMutation = useMutation(trpc.user.updateProfile.mutationOptions());
  const avatarUrlMutation = useMutation(trpc.user.getAvatarUploadUrl.mutationOptions());

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await avatarUrlMutation.mutateAsync({
        fileType: file.type,
      });

      // Upload directly to R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      setPendingImageUrl(publicUrl);
    } catch {
      setAvatarPreview(user?.image ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        name: name || undefined,
        bio: bio || undefined,
        status: status || undefined,
        image: pendingImageUrl ?? undefined,
      });
      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: trpc.user.me.queryKey() });
      if (session?.user?.id) {
        queryClient.invalidateQueries({
          queryKey: trpc.user.getById.queryKey({ userId: session.user.id }),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || "?").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>

        {/* Avatar */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white hover:opacity-80"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              initials
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </button>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-teal-400 hover:text-teal-300"
            >
              Change avatar
            </button>
            <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP. Max 5MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Name */}
        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground">Display Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-teal-500"
            maxLength={100}
          />
        </div>

        {/* Status */}
        <div className="mt-3">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="What are you up to?"
            className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-teal-500"
            maxLength={100}
          />
        </div>

        {/* Bio */}
        <div className="mt-3">
          <label className="text-xs font-medium text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="mt-1 w-full resize-none rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-teal-500"
            rows={3}
            maxLength={500}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/500</p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

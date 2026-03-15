"use client";

import { useState } from "react";
import type { MessageData } from "@superchat/shared";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat-store";
import { useSession } from "@/lib/auth-client";

interface MessageItemProps {
  message: MessageData & {
    author?: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
  showThread?: boolean;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "🔥"];

export function MessageItem({ message, showThread = true }: MessageItemProps) {
  const { data: session } = useSession();
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const reactions = useChatStore((s) => s.reactions.get(message.id) ?? []);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwn = session?.user?.id === message.authorId;
  const displayName = message.author?.displayName ?? message.authorId.slice(0, 8);
  const initials = displayName.slice(0, 2).toUpperCase();

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleReact = (emoji: string) => {
    const socket = getSocket();
    socket.emit("message:react", { messageId: message.id, emoji });
    setShowEmojiPicker(false);
  };

  const handleEdit = () => {
    if (!editContent.trim()) return;
    const socket = getSocket();
    socket.emit("message:edit", { messageId: message.id, content: editContent.trim() });
    setIsEditing(false);
  };

  const handleDelete = () => {
    const socket = getSocket();
    socket.emit("message:delete", { messageId: message.id });
  };

  return (
    <div className="group relative flex gap-3 px-4 py-1.5 hover:bg-zinc-800/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
        {message.author?.avatarUrl ? (
          <img
            src={message.author.avatarUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-100">{displayName}</span>
          {message.author?.username && (
            <span className="text-xs text-zinc-500">@{message.author.username}</span>
          )}
          <span className="text-xs text-zinc-500">{time}</span>
        </div>

        {isEditing ? (
          <div className="mt-1 flex gap-2">
            <input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="flex-1 rounded bg-zinc-700 px-2 py-1 text-sm text-zinc-100 outline-none"
              autoFocus
            />
            <button
              onClick={handleEdit}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-zinc-500 hover:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-300 break-words">{message.content}</p>
        )}

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  r.userIds.has(session?.user?.id ?? "")
                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {r.emoji} {r.userIds.size}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons on hover */}
      <div className="absolute -top-3 right-4 hidden gap-0.5 rounded-md border border-zinc-700 bg-zinc-800 p-0.5 group-hover:flex">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="React"
        >
          😀
        </button>
        {showThread && !message.parentId && (
          <button
            onClick={() => setActiveThread(message.id)}
            className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            title="Reply in thread"
          >
            💬
          </button>
        )}
        {isOwn && (
          <>
            <button
              onClick={() => {
                setEditContent(message.content);
                setIsEditing(true);
              }}
              className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              className="rounded p-1 text-xs text-red-400 hover:bg-zinc-700 hover:text-red-300"
              title="Delete"
            >
              🗑️
            </button>
          </>
        )}
      </div>

      {/* Quick emoji picker */}
      {showEmojiPicker && (
        <div className="absolute -top-10 right-4 flex gap-1 rounded-md border border-zinc-700 bg-zinc-800 p-1">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="rounded p-1 text-sm hover:bg-zinc-700"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

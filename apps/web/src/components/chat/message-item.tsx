"use client";

import { useState, useEffect } from "react";
import type { MessageData } from "@superchat/shared";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat-store";
import { useAiStore } from "@/stores/ai-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useMutation } from "@tanstack/react-query";
import { SmartReplyBar } from "../ai/smart-reply-bar";
import { OnlineIndicator } from "../ui/online-indicator";
import { PollWidget } from "../living/poll-widget";

interface MessageItemProps {
  message: MessageData & {
    author?: {
      id: string;
      username: string | null;
      name: string;
      image: string | null;
    };
    expiresAt?: string | null;
  };
  showThread?: boolean;
  highlighted?: boolean;
}

const EMPTY_REACTIONS: never[] = [];
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "🔥"];

function formatCountdown(expiresAt: string): { remaining: string; expired: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { remaining: "0s", expired: true };

  const totalSeconds = Math.ceil(diff / 1000);
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return { remaining: `${h}h ${m}m`, expired: false };
  }
  if (totalSeconds >= 60) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return { remaining: `${m}m ${s}s`, expired: false };
  }
  return { remaining: `${totalSeconds}s`, expired: false };
}

function useCountdown(expiresAt: string | null | undefined): { remaining: string | null; expired: boolean } {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Use tick to force recalculation
  void tick;

  if (!expiresAt) return { remaining: null, expired: false };
  return formatCountdown(expiresAt);
}

export function MessageItem({ message, showThread = true, highlighted = false }: MessageItemProps) {
  const { data: session } = useSession();
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const reactions = useChatStore((s) => s.reactions.get(message.id)) ?? EMPTY_REACTIONS;
  const smartReplies = useAiStore((s) => s.smartReplies.get(message.id));
  const setSmartReplies = useAiStore((s) => s.setSmartReplies);
  const authorPresence = usePresenceStore((s) => s.users.get(message.authorId));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [smartReplyError, setSmartReplyError] = useState(false);
  const { remaining: expiryRemaining, expired } = useCountdown(message.expiresAt);

  const trpc = useTRPC();
  const smartReplyMutation = useMutation(
    trpc.ai.smartReplies.mutationOptions()
  );

  const isOwn = session?.user?.id === message.authorId;
  const isPoll = message.type === "poll";
  const isBot = message.type === "system";
  const displayName = isBot ? "SuperBot" : isPoll ? "SuperBot" : (message.author?.name ?? message.authorId.slice(0, 8));
  const initials = isBot ? "AI" : displayName.slice(0, 2).toUpperCase();

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

  const handleSmartReplies = async () => {
    if (smartReplies || loadingReplies) return;
    setLoadingReplies(true);
    setSmartReplyError(false);
    try {
      const result = await smartReplyMutation.mutateAsync({
        channelId: message.channelId,
        messageId: message.id,
      });
      setSmartReplies(message.id, result.replies);
    } catch {
      setSmartReplyError(true);
      setTimeout(() => setSmartReplyError(false), 3000);
    } finally {
      setLoadingReplies(false);
    }
  };

  return (
    <div
      data-message-id={message.id}
      className={`group relative flex gap-3 px-4 py-2 hover:bg-zinc-800/50 ${highlighted ? "search-highlight" : ""} ${expired ? "message-expired" : ""}`}
    >
      {expired && (
        <style>{`
          .message-expired {
            animation: fade-out 1s ease-out forwards;
          }
          @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0.2; }
          }
        `}</style>
      )}
      {highlighted && (
        <style>{`
          @keyframes highlight-pulse {
            0% { background-color: rgba(99,102,241,0.35); box-shadow: 0 0 0 1px rgba(99,102,241,0.5), 0 0 20px rgba(99,102,241,0.15); }
            50% { background-color: rgba(99,102,241,0.2); box-shadow: 0 0 0 1px rgba(99,102,241,0.3), 0 0 10px rgba(99,102,241,0.1); }
            100% { background-color: transparent; box-shadow: none; }
          }
          .search-highlight {
            animation: highlight-pulse 2.5s ease-out forwards;
            border-radius: 8px;
            border-left: 3px solid #6366f1;
          }
        `}</style>
      )}
      <div className="relative shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
          {message.author?.image ? (
            <img
              src={message.author.image}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        {authorPresence && (
          <OnlineIndicator
            status={authorPresence.status}
            className="absolute -bottom-0.5 -right-0.5"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-100">{displayName}</span>
          {message.author?.username && (
            <span className="text-xs text-zinc-500">@{message.author.username}</span>
          )}
          <span className="text-xs text-zinc-500">{time}</span>
          {expiryRemaining && (
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
              {expiryRemaining}
            </span>
          )}
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
        ) : message.type === "poll" && message.payload ? (
          <PollWidget
            messageId={message.id}
            payload={message.payload as any}
          />
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

        {smartReplies && (
          <SmartReplyBar
            channelId={message.channelId}
            messageId={message.id}
          />
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
        <button
          onClick={handleSmartReplies}
          disabled={loadingReplies}
          className={`rounded p-1 text-xs hover:bg-zinc-700 disabled:opacity-50 ${smartReplyError ? "text-red-400" : "text-zinc-400 hover:text-violet-300"}`}
          title={smartReplyError ? "Smart replies failed" : "Smart replies"}
        >
          {loadingReplies ? "..." : smartReplyError ? "!" : "✨"}
        </button>
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

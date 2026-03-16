"use client";

import { useState, useEffect, useMemo } from "react";
import type { MessageData } from "@superchat/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Smile,
  MessageSquare,
  Sparkles,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  void tick;
  if (!expiresAt) return { remaining: null, expired: false };
  return formatCountdown(expiresAt);
}

const markdownComponents = {
  pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-background/60 p-3 text-[13px] font-mono border border-border" {...props}>
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }: React.ComponentProps<"code">) => {
    const isInline = !className;
    return isInline ? (
      <code className="rounded-md bg-accent px-1.5 py-0.5 text-[13px] font-mono text-primary" {...props}>
        {children}
      </code>
    ) : (
      <code className={className} {...props}>{children}</code>
    );
  },
  p: ({ children, ...props }: React.ComponentProps<"p">) => (
    <p className="mb-1.5 last:mb-0 leading-relaxed" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.ComponentProps<"ul">) => (
    <ul className="mb-2 ml-4 list-disc last:mb-0" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentProps<"ol">) => (
    <ol className="mb-2 ml-4 list-decimal last:mb-0" {...props}>{children}</ol>
  ),
  a: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a className="text-primary underline decoration-primary/30 hover:decoration-primary transition-colors" target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  strong: ({ children, ...props }: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-foreground" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: React.ComponentProps<"em">) => (
    <em className="italic text-foreground/90" {...props}>{children}</em>
  ),
  blockquote: ({ children, ...props }: React.ComponentProps<"blockquote">) => (
    <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground italic" {...props}>
      {children}
    </blockquote>
  ),
};

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
  const smartReplyMutation = useMutation(trpc.ai.smartReplies.mutationOptions());

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

  // Detect if content has markdown formatting
  const hasMarkdown = /[*_`\[\]#>|~]/.test(message.content);

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group relative flex gap-3 px-5 py-1.5 transition-colors duration-200",
        highlighted && "animate-highlight-pulse",
        expired && "animate-fade-out-message",
        "hover:bg-accent/30"
      )}
    >
      {/* Avatar */}
      <div className="relative mt-0.5 shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={message.author?.image ?? undefined} />
          <AvatarFallback className={cn(
            "text-[11px] font-semibold",
            isBot
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
              : "bg-primary text-primary-foreground"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {authorPresence && (
          <OnlineIndicator
            status={authorPresence.status}
            className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground">{displayName}</span>
          {message.author?.username && (
            <span className="text-[11px] text-muted-foreground">@{message.author.username}</span>
          )}
          <span className="text-[11px] text-muted-foreground/70">{time}</span>
          {expiryRemaining && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-400">
              <Clock className="h-2.5 w-2.5" />
              {expiryRemaining}
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1.5 flex gap-2">
            <input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              autoFocus
            />
            <button
              onClick={handleEdit}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : message.type === "poll" && message.payload ? (
          <PollWidget
            messageId={message.id}
            payload={message.payload as any}
          />
        ) : hasMarkdown ? (
          <div className="mt-0.5 text-[14px] text-secondary-foreground leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="mt-0.5 text-[14px] text-secondary-foreground leading-relaxed break-words">
            {message.content}
          </p>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all",
                  r.userIds.has(session?.user?.id ?? "")
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-accent text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                {r.emoji} <span className="font-medium">{r.userIds.size}</span>
              </button>
            ))}
          </div>
        )}

        {smartReplies && (
          <SmartReplyBar channelId={message.channelId} messageId={message.id} />
        )}
      </div>

      {/* Hover action toolbar */}
      <div className="message-actions absolute -top-3.5 right-4 flex items-center gap-px rounded-lg border border-border bg-card p-0.5 shadow-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>React</TooltipContent>
        </Tooltip>

        {showThread && !message.parentId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveThread(message.id)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Reply in thread</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSmartReplies}
              disabled={loadingReplies}
              className={cn(
                "rounded-md p-1.5 transition-colors disabled:opacity-50",
                smartReplyError
                  ? "text-destructive"
                  : "text-muted-foreground hover:bg-accent hover:text-violet-400"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{smartReplyError ? "Failed" : "Smart replies"}</TooltipContent>
        </Tooltip>

        {isOwn && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(true);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDelete}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* Quick emoji picker */}
      {showEmojiPicker && (
        <div className="absolute -top-11 right-4 flex gap-0.5 rounded-lg border border-border bg-card p-1 shadow-lg animate-slide-down">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="rounded-md p-1.5 text-base transition-transform hover:scale-125 hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

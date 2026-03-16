"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import { useTRPC } from "@/lib/trpc";
import { MAX_MESSAGE_LENGTH, AI_BOT_NAME } from "@superchat/shared";
import { FileUpload } from "./file-upload";
import { MentionPopover, type MentionUser } from "./mention-popover";
import { SmartReplyBar } from "../ai/smart-reply-bar";
import { useSmartReplies } from "@/hooks/use-smart-replies";
import { useChatStore } from "@/stores/chat-store";

interface MessageInputProps {
  channelId: string;
}

const AI_MENTION_REGEX = new RegExp(`^@${AI_BOT_NAME}\\s+`, "i");

const EXPIRY_OPTIONS = [
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "30 min", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
];

export function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [expirySeconds, setExpirySeconds] = useState<number | null>(null);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trpc = useTRPC();
  const { data: channelMembers } = useQuery(
    trpc.member.listByChannel.queryOptions({ channelId })
  );

  const { notifyTyping: notifySmartReplyTyping } = useSmartReplies(channelId);

  // Get latest message ID for smart reply bar
  const messages = useChatStore((s) => s.messages.get(channelId));
  const latestMessageId = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    const latest = messages[messages.length - 1];
    return latest.type !== "system" ? latest.id : null;
  }, [messages]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    socket.emit("typing:start", { channelId });
    setIsUserTyping(true);
    notifySmartReplyTyping();

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { channelId });
      setIsUserTyping(false);
    }, 3000);
  }, [channelId, notifySmartReplyTyping]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const socket = getSocket();
    const expiresAt = expirySeconds
      ? new Date(Date.now() + expirySeconds * 1000).toISOString()
      : undefined;

    // Check if the message is directed at the AI bot
    if (AI_MENTION_REGEX.test(trimmed)) {
      const aiMessage = trimmed.replace(AI_MENTION_REGEX, "").trim();
      if (aiMessage) {
        socket.emit("message:send", {
          channelId,
          content: trimmed,
          expiresAt,
        });
        socket.emit("ai:chat", { channelId, message: aiMessage });
      }
    } else {
      socket.emit("message:send", {
        channelId,
        content: trimmed,
        expiresAt,
      });
    }
    socket.emit("typing:stop", { channelId });
    setIsUserTyping(false);

    setContent("");
    setExpirySeconds(null);
    setMentionOpen(false);
  }, [content, channelId, expirySeconds]);

  const handleFileUpload = useCallback(
    (url: string, fileName: string) => {
      const socket = getSocket();
      socket.emit("message:send", {
        channelId,
        content: `\u{1F4CE} [${fileName}](${url})`,
      });
    },
    [channelId]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      handleTyping();

      // Detect @mention trigger
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        // Don't show mention popover when typing @SuperBot — it's the AI trigger
        const isAiMention = mentionMatch[1].length > 0 &&
          AI_BOT_NAME.toLowerCase() === mentionMatch[1].toLowerCase();
        if (isAiMention) {
          setMentionOpen(false);
        } else {
          setMentionOpen(true);
          setMentionFilter(mentionMatch[1]);
          setMentionIndex(0);
        }
      } else {
        setMentionOpen(false);
      }
    },
    [handleTyping]
  );

  const handleMentionSelect = useCallback(
    (user: MentionUser) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        const start = cursorPos - mentionMatch[0].length;
        const username = user.username ?? user.name;
        const newContent = content.slice(0, start) + `@${username} ` + content.slice(cursorPos);
        setContent(newContent);
      }
      setMentionOpen(false);
      textarea.focus();
    },
    [content]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionOpen && channelMembers) {
      const filtered = channelMembers.filter((u) => {
        const q = mentionFilter.toLowerCase();
        return (
          (u.username?.toLowerCase().includes(q) ?? false) ||
          u.name.toLowerCase().includes(q)
        );
      });

      const clampedIndex = Math.min(mentionIndex, Math.max(filtered.length - 1, 0));

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(Math.min(clampedIndex + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(Math.max(clampedIndex - 1, 0));
        return;
      }
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        handleMentionSelect(filtered[clampedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const expiryLabel = expirySeconds
    ? EXPIRY_OPTIONS.find((o) => o.seconds === expirySeconds)?.label
    : null;

  return (
    <div className="border-t border-zinc-800 p-4">
      {!isUserTyping && latestMessageId && (
        <SmartReplyBar channelId={channelId} messageId={latestMessageId} />
      )}
      <div className="relative flex items-end gap-2 rounded-lg bg-zinc-800 p-2">
        {mentionOpen && channelMembers && (
          <MentionPopover
            users={channelMembers}
            filter={mentionFilter}
            selectedIndex={mentionIndex}
            onSelect={handleMentionSelect}
            onClose={() => setMentionOpen(false)}
          />
        )}
        <FileUpload onUpload={handleFileUpload} />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Type a message... (use @${AI_BOT_NAME} to ask AI)`}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
        />

        {/* Expiry timer button */}
        <div className="relative">
          <button
            onClick={() => setShowExpiryPicker(!showExpiryPicker)}
            className={`rounded-md p-1.5 text-sm transition-colors ${
              expirySeconds
                ? "text-orange-400 hover:text-orange-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Self-destruct timer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {showExpiryPicker && (
            <div className="absolute bottom-full right-0 mb-2 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-xl">
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Self-destruct
              </p>
              {EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.seconds}
                  onClick={() => {
                    setExpirySeconds(
                      expirySeconds === option.seconds ? null : option.seconds
                    );
                    setShowExpiryPicker(false);
                  }}
                  className={`block w-full rounded px-3 py-1 text-left text-xs ${
                    expirySeconds === option.seconds
                      ? "bg-orange-500/20 text-orange-300"
                      : "text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {expirySeconds && (
                <button
                  onClick={() => {
                    setExpirySeconds(null);
                    setShowExpiryPicker(false);
                  }}
                  className="block w-full rounded px-3 py-1 text-left text-xs text-zinc-500 hover:bg-zinc-700"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="relative rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
        >
          Send
          {expiryLabel && (
            <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {expiryLabel}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

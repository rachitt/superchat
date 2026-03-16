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

export function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState("");
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

    // Check if the message is directed at the AI bot
    if (AI_MENTION_REGEX.test(trimmed)) {
      const aiMessage = trimmed.replace(AI_MENTION_REGEX, "").trim();
      if (aiMessage) {
        // Send the user's message first as a regular message
        socket.emit("message:send", {
          channelId,
          content: trimmed,
        });
        // Then trigger the AI response
        socket.emit("ai:chat", { channelId, message: aiMessage });
      }
    } else {
      socket.emit("message:send", {
        channelId,
        content: trimmed,
      });
    }
    socket.emit("typing:stop", { channelId });
    setIsUserTyping(false);

    setContent("");
    setMentionOpen(false);
  }, [content, channelId]);

  const handleFileUpload = useCallback(
    (url: string, fileName: string) => {
      const socket = getSocket();
      socket.emit("message:send", {
        channelId,
        content: `📎 [${fileName}](${url})`,
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
        setMentionOpen(true);
        setMentionFilter(mentionMatch[1]);
        setMentionIndex(0);
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

      // Clamp index to the current filtered list length
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
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}

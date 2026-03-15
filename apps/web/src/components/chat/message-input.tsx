"use client";

import { useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { MAX_MESSAGE_LENGTH } from "@superchat/shared";

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    socket.emit("typing:start", { channelId });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { channelId });
    }, 3000);
  }, [channelId]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const socket = getSocket();
    socket.emit("message:send", {
      channelId,
      content: trimmed,
    });
    socket.emit("typing:stop", { channelId });

    setContent("");
  }, [content, channelId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-800 p-4">
      <div className="flex items-end gap-2 rounded-lg bg-zinc-800 p-2">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
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

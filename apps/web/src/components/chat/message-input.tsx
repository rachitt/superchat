"use client";

import { useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { MAX_MESSAGE_LENGTH, AI_BOT_NAME } from "@superchat/shared";
import { FileUpload } from "./file-upload";

interface MessageInputProps {
  channelId: string;
}

const AI_MENTION_REGEX = new RegExp(`^@${AI_BOT_NAME}\\s+`, "i");

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

    setContent("");
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-800 p-4">
      <div className="flex items-end gap-2 rounded-lg bg-zinc-800 p-2">
        <FileUpload onUpload={handleFileUpload} />
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
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

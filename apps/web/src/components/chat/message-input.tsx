"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import { useTRPC } from "@/lib/trpc";
import { MAX_MESSAGE_LENGTH, AI_BOT_NAME, SLASH_COMMANDS } from "@superchat/shared";
import { FileUpload } from "./file-upload";
import { MentionPopover, type MentionUser } from "./mention-popover";
import { SlashCommandPopover } from "./slash-command-popover";
import { SchedulePicker } from "./schedule-picker";
import { SmartReplyBar } from "../ai/smart-reply-bar";
import { useSmartReplies } from "@/hooks/use-smart-replies";
import { useChatStore } from "@/stores/chat-store";
import { detectLanguage } from "@/lib/detect-language";
import {
  SendHorizontal,
  Clock,
  Bold,
  Italic,
  Code,
  AtSign,
  Mic,
  Square,
  CalendarClock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  const trpc = useTRPC();
  const { data: channelMembers } = useQuery(
    trpc.member.listByChannel.queryOptions({ channelId })
  );

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  );

  const scheduleMutation = useMutation(
    trpc.scheduled.schedule.mutationOptions()
  );

  const { notifyTyping: notifySmartReplyTyping } = useSmartReplies(channelId);

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

    // If scheduled, use tRPC mutation instead of socket
    if (scheduledTime) {
      scheduleMutation.mutate({
        channelId,
        content: trimmed,
        scheduledFor: scheduledTime.toISOString(),
      });
      setContent("");
      setScheduledTime(null);
      setMentionOpen(false);
      return;
    }

    const socket = getSocket();
    const expiresAt = expirySeconds
      ? new Date(Date.now() + expirySeconds * 1000).toISOString()
      : undefined;

    if (AI_MENTION_REGEX.test(trimmed)) {
      const aiMessage = trimmed.replace(AI_MENTION_REGEX, "").trim();
      if (aiMessage) {
        socket.emit("message:send", { channelId, content: trimmed, expiresAt });
        socket.emit("ai:chat", { channelId, message: aiMessage });
      }
    } else {
      socket.emit("message:send", { channelId, content: trimmed, expiresAt });
    }
    socket.emit("typing:stop", { channelId });
    setIsUserTyping(false);
    setContent("");
    setExpirySeconds(null);
    setMentionOpen(false);
  }, [content, channelId, expirySeconds, scheduledTime, scheduleMutation]);

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

  // Voice recording handlers
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      console.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    return new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }, []);

  const handleVoiceRelease = useCallback(async () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const blob = await stopRecording();
    if (!blob || blob.size < 1000) return; // Too short, discard

    setIsUploading(true);
    try {
      const fileName = `voice-${Date.now()}.webm`;
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        fileName,
        fileType: "audio/webm",
        fileSize: blob.size,
      });

      await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "audio/webm" },
      });

      const socket = getSocket();
      socket.emit("message:send", {
        channelId,
        content: `\u{1F3A4} [Voice message](${publicUrl})`,
      });
    } catch (err) {
      console.error("Voice upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  }, [isRecording, stopRecording, getPresignedUrl, channelId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const newContent = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [content]);

  const handleSlashSelect = useCallback(
    (commandName: string) => {
      const cmd = SLASH_COMMANDS.find((c) => c.name === commandName);
      if (!cmd) return;
      // Replace the typed "/" + filter with the command usage template
      setContent(`/${commandName} `);
      setSlashOpen(false);
      textareaRef.current?.focus();
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      handleTyping();
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);

      // Slash command detection — only at the very start of input
      const slashMatch = textBeforeCursor.match(/^\/(\w*)$/);
      if (slashMatch) {
        setSlashOpen(true);
        setSlashFilter(slashMatch[1]);
        setSlashIndex(0);
        setMentionOpen(false);
        return;
      } else {
        setSlashOpen(false);
      }

      // Mention detection
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      if (mentionMatch) {
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

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      // Detect code: multi-line with consistent indentation or detected language
      const lines = text.split("\n");
      if (lines.length >= 3) {
        const indentedLines = lines.filter((l) => /^\s{2,}/.test(l) || /^\t/.test(l));
        const hasCodePatterns = indentedLines.length >= lines.length * 0.3;
        const detectedLang = detectLanguage(text);

        if (hasCodePatterns || detectedLang) {
          e.preventDefault();
          const lang = detectedLang || "";
          const wrapped = `\`\`\`${lang}\n${text}\n\`\`\``;
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.slice(0, start) + wrapped + content.slice(end);
            setContent(newContent);
          }
        }
      }
    },
    [content]
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
    // Slash command popover navigation
    if (slashOpen) {
      const filtered = SLASH_COMMANDS.filter((c) => c.name.toLowerCase().startsWith(slashFilter.toLowerCase()));
      const clampedIndex = Math.min(slashIndex, Math.max(filtered.length - 1, 0));
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(Math.min(clampedIndex + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(Math.max(clampedIndex - 1, 0)); return; }
      if ((e.key === "Enter" || e.key === "Tab") && filtered.length > 0) { e.preventDefault(); handleSlashSelect(filtered[clampedIndex].name); return; }
      if (e.key === "Escape") { e.preventDefault(); setSlashOpen(false); return; }
    }

    // Mention popover navigation
    if (mentionOpen && channelMembers) {
      const filtered = channelMembers.filter((u) => {
        const q = mentionFilter.toLowerCase();
        return (
          (u.username?.toLowerCase().includes(q) ?? false) ||
          u.name.toLowerCase().includes(q)
        );
      });
      const clampedIndex = Math.min(mentionIndex, Math.max(filtered.length - 1, 0));
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(Math.min(clampedIndex + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(Math.max(clampedIndex - 1, 0)); return; }
      if (e.key === "Enter" && filtered.length > 0) { e.preventDefault(); handleMentionSelect(filtered[clampedIndex]); return; }
      if (e.key === "Escape") { e.preventDefault(); setMentionOpen(false); return; }
    }
    // Formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); return; }
      if (e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); return; }
      if (e.key === "e") { e.preventDefault(); wrapSelection("`", "`"); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const expiryLabel = expirySeconds
    ? EXPIRY_OPTIONS.find((o) => o.seconds === expirySeconds)?.label
    : null;

  return (
    <div className="border-t border-border/60 px-5 pb-5 pt-3">
      {!isUserTyping && latestMessageId && (
        <SmartReplyBar channelId={channelId} messageId={latestMessageId} />
      )}
      <div className="relative rounded-2xl border border-border/70 bg-card shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-md">
        {/* Slash command popover */}
        {slashOpen && (
          <SlashCommandPopover
            filter={slashFilter}
            selectedIndex={slashIndex}
            onSelect={handleSlashSelect}
            onClose={() => setSlashOpen(false)}
          />
        )}

        {/* Mention popover */}
        {mentionOpen && channelMembers && (
          <MentionPopover
            users={channelMembers}
            filter={mentionFilter}
            selectedIndex={mentionIndex}
            onSelect={handleMentionSelect}
            onClose={() => setMentionOpen(false)}
          />
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-400 tabular-nums">
              {formatRecordingTime(recordingDuration)}
            </span>
            <span className="text-xs text-muted-foreground">Recording — release to send</span>
          </div>
        )}

        {/* Textarea */}
        {!isRecording && (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Message #channel — use @${AI_BOT_NAME} to ask AI`}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            className="block w-full resize-none bg-transparent px-4 pt-3 pb-1.5 text-[14px] text-foreground placeholder-muted-foreground/60 outline-none"
          />
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <FileUpload onUpload={handleFileUpload} />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => wrapSelection("**", "**")}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Bold (⌘B)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => wrapSelection("*", "*")}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Italic (⌘I)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => wrapSelection("`", "`")}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Code (⌘E)</TooltipContent>
            </Tooltip>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Schedule message */}
            <SchedulePicker
              scheduledTime={scheduledTime}
              onSchedule={setScheduledTime}
            />

            {/* Self-destruct timer */}
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowExpiryPicker(!showExpiryPicker)}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      expirySeconds
                        ? "text-orange-400 bg-orange-500/10 hover:bg-orange-500/15"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Self-destruct timer</TooltipContent>
              </Tooltip>

              {showExpiryPicker && (
                <div className="absolute bottom-full left-0 mb-2 rounded-lg border border-border bg-popover p-1 shadow-xl animate-slide-up">
                  <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Self-destruct
                  </p>
                  {EXPIRY_OPTIONS.map((option) => (
                    <button
                      key={option.seconds}
                      onClick={() => {
                        setExpirySeconds(expirySeconds === option.seconds ? null : option.seconds);
                        setShowExpiryPicker(false);
                      }}
                      className={cn(
                        "block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                        expirySeconds === option.seconds
                          ? "bg-orange-500/15 text-orange-400"
                          : "text-popover-foreground hover:bg-accent"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  {expirySeconds && (
                    <button
                      onClick={() => { setExpirySeconds(null); setShowExpiryPicker(false); }}
                      className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {expiryLabel && (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                {expiryLabel}
              </span>
            )}

            {/* Voice record button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startRecording();
                  }}
                  onMouseUp={handleVoiceRelease}
                  onMouseLeave={() => {
                    if (isRecording) handleVoiceRelease();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startRecording();
                  }}
                  onTouchEnd={handleVoiceRelease}
                  disabled={isUploading}
                  className={cn(
                    "rounded-lg p-1.5 transition-all",
                    isRecording
                      ? "bg-red-500/15 text-red-400 scale-110"
                      : isUploading
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {isRecording ? (
                    <Square className="h-3.5 w-3.5" fill="currentColor" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isRecording ? "Release to send" : "Hold to record voice message"}
              </TooltipContent>
            </Tooltip>

            <button
              onClick={handleSend}
              disabled={!content.trim()}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                content.trim()
                  ? scheduledTime
                    ? "bg-teal-600 text-white shadow-sm hover:opacity-90"
                    : "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {scheduledTime ? (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Schedule</span>
                </>
              ) : (
                <>
                  <SendHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

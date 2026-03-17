"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerPopoverProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPickerPopover({ onSelect, onClose }: EmojiPickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute -top-[440px] right-0 z-50 animate-slide-down"
    >
      <Picker
        data={data}
        onEmojiSelect={(emoji: any) => {
          onSelect(emoji.native);
        }}
        theme="dark"
        previewPosition="none"
        skinTonePosition="none"
        maxFrequentRows={2}
        perLine={8}
      />
    </div>
  );
}

/** Get frequently used emojis from localStorage */
export function getFrequentEmojis(): string[] {
  if (typeof window === "undefined") return ["👍", "❤️", "😂", "🎉", "😮", "🔥"];
  try {
    const stored = localStorage.getItem("superchat:frequent-emojis");
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, number>;
      const sorted = Object.entries(parsed)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([emoji]) => emoji);
      if (sorted.length >= 6) return sorted;
    }
  } catch {}
  return ["👍", "❤️", "😂", "🎉", "😮", "🔥"];
}

/** Track emoji usage in localStorage */
export function trackEmojiUsage(emoji: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("superchat:frequent-emojis");
    const counts: Record<string, number> = stored ? JSON.parse(stored) : {};
    counts[emoji] = (counts[emoji] ?? 0) + 1;
    localStorage.setItem("superchat:frequent-emojis", JSON.stringify(counts));
  } catch {}
}

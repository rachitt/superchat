"use client";

import { useEffect, useRef } from "react";

export interface MentionUser {
  userId: string;
  username: string | null;
  name: string;
  image: string | null;
}

interface MentionPopoverProps {
  users: MentionUser[];
  filter: string;
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
}

export function MentionPopover({ users, filter, selectedIndex, onSelect, onClose }: MentionPopoverProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = users.filter((u) => {
    const q = filter.toLowerCase();
    return (
      (u.username?.toLowerCase().includes(q) ?? false) ||
      u.name.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 w-64 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
      <div ref={listRef} className="max-h-48 overflow-y-auto py-1">
        {filtered.map((user, i) => (
          <button
            key={user.userId}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(user);
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
              i === selectedIndex
                ? "bg-indigo-600/20 text-indigo-300"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {user.image ? (
              <img src={user.image} alt="" className="h-5 w-5 rounded-full" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-400">
                {(user.name[0] ?? "?").toUpperCase()}
              </div>
            )}
            <span className="truncate font-medium">{user.name}</span>
            {user.username && (
              <span className="truncate text-xs text-zinc-500">@{user.username}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

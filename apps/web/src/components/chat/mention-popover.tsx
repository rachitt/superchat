"use client";

import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
    <div className="absolute bottom-full left-0 z-50 mb-1 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-slide-up">
      <div ref={listRef} className="max-h-48 overflow-y-auto py-1">
        {filtered.map((user, i) => (
          <button
            key={user.userId}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(user);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
              i === selectedIndex
                ? "bg-accent text-foreground"
                : "text-secondary-foreground hover:bg-accent/50"
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="bg-muted text-[9px] font-semibold text-muted-foreground">
                {(user.name[0] ?? "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">{user.name}</span>
            {user.username && (
              <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

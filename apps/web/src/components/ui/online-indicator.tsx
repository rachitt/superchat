"use client";

interface OnlineIndicatorProps {
  status: "online" | "away" | "offline";
  className?: string;
}

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-zinc-500",
};

export function OnlineIndicator({ status, className = "" }: OnlineIndicatorProps) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full border-2 border-zinc-900 ${statusColors[status]} ${className}`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

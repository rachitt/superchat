import type { MessageData } from "@superchat/shared";

interface MessageItemProps {
  message: MessageData;
}

export function MessageItem({ message }: MessageItemProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="group flex gap-3 px-4 py-1.5 hover:bg-zinc-800/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
        {message.authorId.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-100">
            {message.authorId.slice(0, 8)}
          </span>
          <span className="text-xs text-zinc-500">{time}</span>
        </div>
        <p className="text-sm text-zinc-300 break-words">{message.content}</p>
      </div>
    </div>
  );
}

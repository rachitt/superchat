"use client";

import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { useSession } from "@/lib/auth-client";

interface PollOption {
  id: number;
  text: string;
  votes: string[];
}

interface PollPayload {
  question: string;
  options: PollOption[];
}

interface PollWidgetProps {
  messageId: string;
  payload: PollPayload;
}

export function PollWidget({ messageId, payload }: PollWidgetProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [voting, setVoting] = useState(false);

  const totalVotes = payload.options.reduce((sum, o) => sum + o.votes.length, 0);
  const userVotedOption = payload.options.find((o) => userId && o.votes.includes(userId));

  const handleVote = (optionId: number) => {
    if (voting || !userId) return;
    setVoting(true);
    const socket = getSocket();
    socket.emit("living:interact", {
      messageId,
      action: "vote",
      data: { optionId },
    });
    setTimeout(() => setVoting(false), 500);
  };

  return (
    <div className="my-1 max-w-md rounded-lg border border-zinc-700 bg-zinc-800/80 p-3">
      <p className="mb-2 text-sm font-semibold text-zinc-100">{payload.question}</p>
      <div className="flex flex-col gap-1.5">
        {payload.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
          const isVoted = userId ? option.votes.includes(userId) : false;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voting}
              className={`relative overflow-hidden rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                isVoted
                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                  : "border-zinc-600 bg-zinc-700/50 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {/* Progress bar background */}
              {totalVotes > 0 && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    isVoted ? "bg-indigo-500/15" : "bg-zinc-600/30"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span>{option.text}</span>
                {totalVotes > 0 && (
                  <span className="ml-2 text-xs text-zinc-500">
                    {pct}% ({option.votes.length})
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-zinc-500">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </div>
  );
}

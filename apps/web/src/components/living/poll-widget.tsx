"use client";

import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { useSession } from "@/lib/auth-client";
import { BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="my-2 max-w-md rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{payload.question}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {payload.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
          const isVoted = userId ? option.votes.includes(userId) : false;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voting}
              className={cn(
                "relative overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-all",
                isVoted
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background/50 text-secondary-foreground hover:border-border/80 hover:bg-accent/50"
              )}
            >
              {totalVotes > 0 && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-500",
                    isVoted ? "bg-primary/10" : "bg-muted/50"
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {isVoted && <Check className="h-3 w-3" />}
                  {option.text}
                </span>
                {totalVotes > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-muted-foreground">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

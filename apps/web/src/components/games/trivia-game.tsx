"use client";

import { useState, useEffect } from "react";
import type { GameData, GamePlayerData, TriviaState } from "@superchat/shared";

interface TriviaGameProps {
  game: GameData;
  players: GamePlayerData[];
  userId: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}

export function TriviaGame({ game, players, userId, onAction }: TriviaGameProps) {
  const state = game.state as TriviaState & { type: "trivia" };
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState((game.config as any).timePerQuestion || 15);

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const hasAnswered = state.answers[userId] !== undefined;
  const isReveal = state.phase === "reveal";

  useEffect(() => {
    if (isReveal) return;
    setTimeLeft((game.config as any).timePerQuestion || 15);
    setSelectedAnswer(null);
    const interval = setInterval(() => {
      setTimeLeft((t: number) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.currentQuestionIndex, isReveal, game.config]);

  function handleAnswer(index: number) {
    if (hasAnswered || isReveal) return;
    setSelectedAnswer(index);
    onAction("answer", { answerIndex: index });
  }

  if (!currentQuestion) return <div className="p-4 text-muted-foreground">Loading...</div>;

  const sortedPlayers = [...players].sort((a, b) => (state.scores[b.userId] || 0) - (state.scores[a.userId] || 0));

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase">Q {state.currentQuestionIndex + 1}/{state.questions.length}</span>
        <div className={`rounded-full px-3 py-1 text-sm font-bold ${timeLeft <= 5 ? "bg-red-900/30 text-red-400" : "bg-muted text-secondary-foreground"}`}>⏱ {timeLeft}s</div>
      </div>
      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <p className="text-sm font-medium text-foreground">{currentQuestion.question}</p>
      </div>
      <div className="space-y-2">
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedAnswer === idx;
          const isCorrect = isReveal && idx === currentQuestion.correctIndex;
          const isWrong = isReveal && isSelected && idx !== currentQuestion.correctIndex;
          let cls = "flex items-center gap-3 rounded-lg border p-3 text-left transition-all text-sm ";
          if (isCorrect) cls += "border-emerald-500 bg-emerald-900/30 text-emerald-300";
          else if (isWrong) cls += "border-red-500 bg-red-900/30 text-red-300";
          else if (isSelected) cls += "border-teal-500 bg-teal-900/30 text-teal-300";
          else if (hasAnswered || isReveal) cls += "border-border bg-muted/30 text-muted-foreground";
          else cls += "border-border bg-muted text-foreground hover:border-zinc-500 cursor-pointer";
          return (
            <button key={idx} onClick={() => handleAnswer(idx)} disabled={hasAnswered || isReveal} className={cls}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${isCorrect ? "bg-emerald-600 text-white" : isWrong ? "bg-red-600 text-white" : isSelected ? "bg-teal-600 text-white" : "bg-accent text-secondary-foreground"}`}>{String.fromCharCode(65 + idx)}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {hasAnswered && !isReveal && <p className="text-center text-sm text-muted-foreground">Waiting for others...</p>}
      <Scoreboard players={sortedPlayers} scores={state.scores} userId={userId} />
    </div>
  );
}

function Scoreboard({ players, scores, userId }: { players: GamePlayerData[]; scores: Record<string, number>; userId: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 mt-2">
      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Scores</p>
      {players.map((p) => (
        <div key={p.userId} className="flex items-center justify-between py-0.5">
          <span className={`text-sm ${p.userId === userId ? "text-teal-400 font-medium" : "text-muted-foreground"}`}>{p.displayName || p.username}{p.userId === userId ? " (you)" : ""}</span>
          <span className="text-sm font-mono text-secondary-foreground">{scores[p.userId] || 0}</span>
        </div>
      ))}
    </div>
  );
}

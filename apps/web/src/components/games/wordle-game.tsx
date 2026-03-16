"use client";

import { useState, useEffect, useCallback } from "react";
import type { GameData, GamePlayerData, WordleState, LetterResult } from "@superchat/shared";

interface WordleGameProps {
  game: GameData;
  players: GamePlayerData[];
  userId: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "⌫"],
];

function getLetterStatuses(guesses: WordleState["guesses"]): Record<string, LetterResult> {
  const s: Record<string, LetterResult> = {};
  for (const g of guesses) {
    for (let i = 0; i < g.word.length; i++) {
      const l = g.word[i], r = g.result[i], c = s[l];
      if (r === "correct") s[l] = "correct";
      else if (r === "present" && c !== "correct") s[l] = "present";
      else if (!c) s[l] = "absent";
    }
  }
  return s;
}

function cellColor(r?: LetterResult) {
  if (r === "correct") return "bg-emerald-600 border-emerald-500 text-white";
  if (r === "present") return "bg-yellow-600 border-yellow-500 text-white";
  if (r === "absent") return "bg-zinc-700 border-zinc-600 text-zinc-300";
  return "border-zinc-600 text-white";
}

function keyColor(s?: LetterResult) {
  if (s === "correct") return "bg-emerald-600 text-white";
  if (s === "present") return "bg-yellow-600 text-white";
  if (s === "absent") return "bg-zinc-800 text-zinc-500";
  return "bg-zinc-700 text-zinc-200 hover:bg-zinc-600";
}

export function WordleGame({ game, players, userId, onAction }: WordleGameProps) {
  const state = game.state as WordleState & { type: "wordle" };
  const [guess, setGuess] = useState("");
  const isMyTurn = state.currentTurnUserId === userId;
  const isOver = state.phase === "won" || state.phase === "lost";
  const letterStatuses = getLetterStatuses(state.guesses);

  const submit = useCallback(() => {
    if (!isMyTurn || guess.length !== state.wordLength) return;
    onAction("guess", { word: guess });
    setGuess("");
  }, [isMyTurn, guess, state.wordLength, onAction]);

  const handleKey = useCallback((key: string) => {
    if (isOver) return;
    if (key === "enter") submit();
    else if (key === "⌫" || key === "backspace") setGuess((g) => g.slice(0, -1));
    else if (/^[a-z]$/.test(key) && guess.length < state.wordLength) setGuess((g) => g + key);
  }, [isOver, submit, guess.length, state.wordLength]);

  useEffect(() => {
    if (!isMyTurn) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "enter" || k === "backspace" || /^[a-z]$/.test(k)) { e.preventDefault(); handleKey(k); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMyTurn, handleKey]);

  const cur = players.find((p) => p.userId === state.currentTurnUserId);
  const emptyRows = state.maxGuesses - state.guesses.length - (isOver ? 0 : 1);

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className={`rounded-lg border px-4 py-2 text-sm ${isOver ? state.phase === "won" ? "border-emerald-600/50 bg-emerald-900/20 text-emerald-300" : "border-red-600/50 bg-red-900/20 text-red-300" : isMyTurn ? "border-emerald-600/50 bg-emerald-900/20 text-emerald-300" : "border-zinc-700 bg-zinc-800/50 text-zinc-400"}`}>
        {isOver ? (state.phase === "won" ? `🎉 "${state.targetWord}"` : `💀 "${state.targetWord}"`) : isMyTurn ? "Your turn!" : `Waiting for ${cur?.displayName || "..."}...`}
      </div>
      <div className="flex flex-col gap-1">
        {state.guesses.map((g, i) => (
          <div key={i} className="flex gap-1">{g.word.split("").map((l, j) => (<div key={j} className={`flex h-10 w-10 items-center justify-center rounded border-2 text-sm font-bold uppercase ${cellColor(g.result[j])}`}>{l}</div>))}</div>
        ))}
        {!isOver && <div className="flex gap-1">{Array.from({ length: state.wordLength }).map((_, i) => (<div key={i} className={`flex h-10 w-10 items-center justify-center rounded border-2 text-sm font-bold uppercase ${guess[i] ? "border-zinc-400 text-white" : "border-zinc-700"}`}>{guess[i] || ""}</div>))}</div>}
        {Array.from({ length: Math.max(0, emptyRows) }).map((_, i) => (
          <div key={`e${i}`} className="flex gap-1">{Array.from({ length: state.wordLength }).map((_, j) => (<div key={j} className="flex h-10 w-10 items-center justify-center rounded border-2 border-zinc-800" />))}</div>
        ))}
      </div>
      {!isOver && isMyTurn && (
        <div className="flex flex-col items-center gap-1 mt-1">
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className="flex gap-1">{row.map((k) => (
              <button key={k} onClick={() => handleKey(k)} className={`rounded px-1.5 py-2 text-xs font-bold uppercase ${k === "enter" || k === "⌫" ? "bg-zinc-600 text-zinc-200 px-2" : keyColor(letterStatuses[k])}`}>{k}</button>
            ))}</div>
          ))}
        </div>
      )}
    </div>
  );
}

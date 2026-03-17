"use client";

import type { GameData, GamePlayerData, TicTacToeState } from "@superchat/shared";

interface TicTacToeGameProps {
  game: GameData;
  players: GamePlayerData[];
  userId: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}

export function TicTacToeGame({ game, players, userId, onAction }: TicTacToeGameProps) {
  const state = game.state as TicTacToeState & { type: "tic_tac_toe" };
  const isMyTurn = state.currentTurnUserId === userId;
  const isOver = state.phase === "won" || state.phase === "draw";
  const mySymbol = state.players.x === userId ? "X" : "O";
  const cur = players.find((p) => p.userId === state.currentTurnUserId);
  const xP = players.find((p) => p.userId === state.players.x);
  const oP = players.find((p) => p.userId === state.players.o);

  function getSymbol(v: string | null) { return !v ? "" : v === state.players.x ? "X" : "O"; }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className={`rounded-lg border px-4 py-2 text-sm text-center ${isOver ? state.phase === "draw" ? "border-yellow-600/50 bg-yellow-900/20 text-yellow-300" : state.winner === userId ? "border-emerald-600/50 bg-emerald-900/20 text-emerald-300" : "border-red-600/50 bg-red-900/20 text-red-300" : isMyTurn ? "border-emerald-600/50 bg-emerald-900/20 text-emerald-300" : "border-border bg-muted/50 text-muted-foreground"}`}>
        {isOver ? (state.phase === "draw" ? "Draw!" : state.winner === userId ? "🎉 You win!" : `${players.find((p) => p.userId === state.winner)?.displayName} wins!`) : isMyTurn ? `Your turn (${mySymbol})` : `Waiting for ${cur?.displayName || "..."}...`}
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className={state.currentTurnUserId === state.players.x ? "opacity-100" : "opacity-50"}><span className="font-black text-teal-700 dark:text-teal-400">X</span> {xP?.displayName || "P1"}</div>
        <span className="text-zinc-600">vs</span>
        <div className={state.currentTurnUserId === state.players.o ? "opacity-100" : "opacity-50"}><span className="font-black text-pink-400">O</span> {oP?.displayName || "P2"}</div>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${state.boardSize}, 1fr)` }}>
        {state.board.map((cell, i) => {
          const sym = getSymbol(cell);
          const isWin = state.winningLine?.includes(i);
          let cls = "flex h-16 w-16 items-center justify-center rounded-lg border-2 text-2xl font-black transition-all ";
          if (isWin) cls += "border-emerald-500 bg-emerald-900/30 text-emerald-400";
          else if (sym === "X") cls += "border-teal-600/50 bg-teal-900/20 text-teal-700 dark:text-teal-400";
          else if (sym === "O") cls += "border-pink-600/50 bg-pink-900/20 text-pink-400";
          else if (isMyTurn && !isOver) cls += "border-border bg-muted hover:border-zinc-500 cursor-pointer";
          else cls += "border-border/50 bg-muted/50";
          return <button key={i} onClick={() => { if (isMyTurn && !isOver && !cell) onAction("place", { position: i }); }} className={cls}>{sym}</button>;
        })}
      </div>
    </div>
  );
}

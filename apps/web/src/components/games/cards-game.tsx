"use client";

import type { GameData, GamePlayerData, CardsState } from "@superchat/shared";

interface CardsGameProps {
  game: GameData;
  players: GamePlayerData[];
  userId: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}

export function CardsGame({ game, players, userId, onAction }: CardsGameProps) {
  const state = game.state as CardsState & { type: "cards" };
  const isMyTurn = state.currentTurnUserId === userId;
  const myHand = state.hands[userId] || [];
  const cur = players.find((p) => p.userId === state.currentTurnUserId);
  const last = state.discard.length > 0 ? state.discard[state.discard.length - 1] : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className={`rounded-lg border px-4 py-2 text-sm text-center ${state.phase === "finished" ? "border-zinc-700 bg-zinc-800/50 text-zinc-300" : isMyTurn ? "border-emerald-600/50 bg-emerald-900/20 text-emerald-300" : "border-zinc-700 bg-zinc-800/50 text-zinc-400"}`}>
        {state.phase === "finished" ? "Game over!" : isMyTurn ? "Your turn! Play a card." : `Waiting for ${cur?.displayName || "..."}...`}
      </div>
      {last && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-zinc-500 uppercase">Last Played</p>
          <Card card={last} size="lg" />
        </div>
      )}
      <div className="flex justify-center gap-4">
        {players.filter((p) => p.userId !== userId).map((p) => (
          <div key={p.userId} className="flex flex-col items-center gap-1">
            <span className="text-xs text-zinc-500">{p.displayName}</span>
            <span className="text-xs text-zinc-600">{state.hands[p.userId]?.length || 0} cards</span>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs text-zinc-500 uppercase mb-2 text-center">Your Hand</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {myHand.map((card, i) => (
            <button key={i} onClick={() => { if (isMyTurn) onAction("play_card", { cardIndex: i }); }} disabled={!isMyTurn} className={`transition-transform ${isMyTurn ? "hover:-translate-y-2 cursor-pointer" : "opacity-80"}`}>
              <Card card={card} size="md" />
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3 mt-2">
        <p className="text-xs font-medium text-zinc-500 uppercase mb-2">Scores</p>
        {[...players].sort((a, b) => (state.scores[b.userId] || 0) - (state.scores[a.userId] || 0)).map((p) => (
          <div key={p.userId} className="flex items-center justify-between py-0.5">
            <span className={`text-sm ${p.userId === userId ? "text-indigo-400 font-medium" : "text-zinc-400"}`}>{p.displayName}{p.userId === userId ? " (you)" : ""}</span>
            <span className="text-sm font-mono text-zinc-300">{state.scores[p.userId] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ card, size }: { card: string; size: "md" | "lg" }) {
  const suit = card.slice(-1), rank = card.slice(0, -1);
  const color = suit === "♥" || suit === "♦" ? "text-red-400" : "text-white";
  const h = size === "lg" ? "h-16 w-11" : "h-14 w-9";
  return <div className={`${h} flex flex-col items-center justify-center rounded-lg border-2 border-zinc-600 bg-zinc-800 font-bold text-sm ${color}`}><span>{rank}</span><span className="text-xs">{suit}</span></div>;
}

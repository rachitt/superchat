import type {
  GameConfig,
  GameState,
  GamePlayerData,
  TicTacToeState,
  TicTacToeConfig,
} from "@superchat/shared";
import type { GameEngine, GameActionResult } from "./base.js";

function checkWinner(board: (string | null)[], size: number): { winner: string | null; line: number[] | null } {
  // Check rows
  for (let r = 0; r < size; r++) {
    const start = r * size;
    const row = Array.from({ length: size }, (_, i) => start + i);
    if (board[row[0]] && row.every((i) => board[i] === board[row[0]])) {
      return { winner: board[row[0]], line: row };
    }
  }

  // Check columns
  for (let c = 0; c < size; c++) {
    const col = Array.from({ length: size }, (_, i) => i * size + c);
    if (board[col[0]] && col.every((i) => board[i] === board[col[0]])) {
      return { winner: board[col[0]], line: col };
    }
  }

  // Check diagonals
  const diag1 = Array.from({ length: size }, (_, i) => i * size + i);
  if (board[diag1[0]] && diag1.every((i) => board[i] === board[diag1[0]])) {
    return { winner: board[diag1[0]], line: diag1 };
  }

  const diag2 = Array.from({ length: size }, (_, i) => i * size + (size - 1 - i));
  if (board[diag2[0]] && diag2.every((i) => board[i] === board[diag2[0]])) {
    return { winner: board[diag2[0]], line: diag2 };
  }

  return { winner: null, line: null };
}

function isBoardFull(board: (string | null)[]): boolean {
  return board.every((cell) => cell !== null);
}

export const ticTacToeEngine: GameEngine = {
  minPlayers: 2,
  maxPlayers: 2,

  initState(config: GameConfig, players: GamePlayerData[]): GameState {
    const c = config as TicTacToeConfig & { type: "tic_tac_toe" };
    const size = c.boardSize;
    const scores: Record<string, number> = {};
    players.forEach((p) => (scores[p.userId] = 0));

    return {
      type: "tic_tac_toe",
      board: new Array(size * size).fill(null),
      currentTurnUserId: players[0]?.userId || null,
      players: {
        x: players[0]?.userId || "",
        o: players[1]?.userId || "",
      },
      scores,
      phase: "playing",
      winner: null,
      winningLine: null,
      boardSize: size,
    };
  },

  handleAction(
    state: GameState,
    playerId: string,
    action: string,
    data: Record<string, unknown>,
    players: GamePlayerData[]
  ): GameActionResult {
    const s = state as TicTacToeState & { type: "tic_tac_toe" };

    if (action === "place" && s.phase === "playing") {
      if (s.currentTurnUserId !== playerId) {
        return { state, finished: false };
      }

      const position = data.position as number;
      if (typeof position !== "number" || position < 0 || position >= s.board.length) {
        return { state, finished: false };
      }

      if (s.board[position] !== null) {
        return { state, finished: false };
      }

      const newBoard = [...s.board];
      newBoard[position] = playerId;

      const { winner, line } = checkWinner(newBoard, s.boardSize);
      const newScores = { ...s.scores };

      if (winner) {
        newScores[winner] = (newScores[winner] || 0) + 100;
        return {
          state: {
            ...s,
            board: newBoard,
            scores: newScores,
            phase: "won",
            winner,
            winningLine: line,
            currentTurnUserId: null,
          },
          finished: true,
          announcement: "We have a winner!",
        };
      }

      if (isBoardFull(newBoard)) {
        // Draw — both get some points
        players.forEach((p) => {
          newScores[p.userId] = (newScores[p.userId] || 0) + 25;
        });
        return {
          state: {
            ...s,
            board: newBoard,
            scores: newScores,
            phase: "draw",
            currentTurnUserId: null,
          },
          finished: true,
          announcement: "It's a draw!",
        };
      }

      // Switch turns
      const nextPlayer = playerId === s.players.x ? s.players.o : s.players.x;

      return {
        state: {
          ...s,
          board: newBoard,
          currentTurnUserId: nextPlayer,
        },
        finished: false,
      };
    }

    return { state, finished: false };
  },

  handleTimeout(state: GameState, players: GamePlayerData[]): GameActionResult {
    return { state, finished: false };
  },
};

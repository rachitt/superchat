import type { GameConfig, GameState, GamePlayerData } from "@superchat/shared";

export interface GameActionResult {
  state: GameState;
  finished: boolean;
  /** Optional broadcast message for the channel */
  announcement?: string;
}

/**
 * Base interface for all game engines.
 * Each game type implements this to handle its own state machine.
 */
export interface GameEngine {
  /** Create initial game state */
  initState(config: GameConfig, players: GamePlayerData[]): GameState;

  /** Handle a player action and return updated state */
  handleAction(
    state: GameState,
    playerId: string,
    action: string,
    data: Record<string, unknown>,
    players: GamePlayerData[]
  ): GameActionResult;

  /** Handle timer expiration (e.g., turn timeout, question timeout) */
  handleTimeout(
    state: GameState,
    players: GamePlayerData[]
  ): GameActionResult;

  /** Minimum players required to start */
  minPlayers: number;

  /** Maximum players allowed */
  maxPlayers: number;
}

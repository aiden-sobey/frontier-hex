import type { GameState, GameAction } from '../engine/types';
import { GamePhase } from '../engine/types';
import type { BotStrategy } from './bot-strategy';

/**
 * BotPlayer manages the lifecycle of a bot opponent.
 * It wraps a BotStrategy with turn-detection and simulated delay.
 */
export class BotPlayer {
  private playerIndex: number;
  private strategy: BotStrategy;
  private actionDelay: number; // ms delay before acting (feels more natural)

  constructor(playerIndex: number, strategy: BotStrategy, actionDelay?: number) {
    this.playerIndex = playerIndex;
    this.strategy = strategy;
    // Default delay: random between 500-1500ms
    this.actionDelay = actionDelay ?? -1; // -1 = random
  }

  /**
   * Given a game state, determine if this bot should act now.
   *
   * The bot should act when:
   * - It is the current player (for most phases)
   * - It is in the playersNeedingToDiscard list (Discard phase)
   * - There is a pending trade and this bot hasn't responded yet (Main phase)
   */
  shouldAct(state: GameState): boolean {
    if (state.phase === GamePhase.GameOver) return false;

    // During Discard phase, any player who needs to discard should act
    if (state.phase === GamePhase.Discard) {
      return state.playersNeedingToDiscard.includes(this.playerIndex);
    }

    // During Main phase with a pending trade from another player, bot should respond
    if (
      state.phase === GamePhase.Main &&
      state.pendingTrade &&
      state.pendingTrade.fromPlayer !== this.playerIndex &&
      !state.pendingTrade.responses[this.playerIndex]
    ) {
      return true;
    }

    // For all other phases, act only when it's our turn
    return state.currentPlayerIndex === this.playerIndex;
  }

  /**
   * Choose an action with a simulated delay.
   * The delay makes the bot feel more like a human player.
   */
  async chooseAction(state: GameState): Promise<GameAction | null> {
    const delay =
      this.actionDelay < 0
        ? Math.floor(Math.random() * 1000) + 500 // 500-1500ms
        : this.actionDelay;

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return this.strategy.chooseAction(state, this.playerIndex);
  }
}

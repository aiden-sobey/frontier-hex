import { GameRoom } from './game-room'
import { BotPlayer } from './bot-player'
import { BasicBotStrategy } from './bot-strategy'
import { GamePhase } from '../engine/types'

export class BotController {
  private room: GameRoom
  private bots: BotPlayer[]
  private running: boolean = false

  constructor(room: GameRoom, botPlayerIndices: number[]) {
    this.room = room
    this.bots = botPlayerIndices.map(
      (idx) => new BotPlayer(idx, new BasicBotStrategy(), 800)
    )
  }

  /**
   * Trigger bot evaluation. Call this after any state change.
   * The bots will keep acting until no bot should act (it's the human's turn).
   */
  async tick(): Promise<void> {
    if (this.running) return // Prevent re-entrant calls
    this.running = true

    try {
      let safety = 0
      const MAX_ITERATIONS = 200 // Prevent infinite loops

      while (safety++ < MAX_ITERATIONS) {
        const state = this.room.getGameState()
        if (state.phase === GamePhase.GameOver) break

        // Find a bot that should act
        let acted = false
        for (const bot of this.bots) {
          if (bot.shouldAct(state)) {
            const action = await bot.chooseAction(state)
            if (action) {
              const result = this.room.processAction(action)
              if (result.success) {
                acted = true
                break // Re-evaluate from the top after each action
              }
            }
          }
        }

        if (!acted) break // No bot acted, it's the human's turn
      }
    } finally {
      this.running = false
    }
  }
}

import { GameState } from './types'
import { LARGEST_ARMY_MINIMUM } from './constants'

/**
 * Update the largest army holder after a knight is played.
 * Minimum 3 knights to claim. In case of tie, current holder keeps it.
 */
export function updateLargestArmy(state: GameState): GameState {
  let largestPlayer = state.largestArmyPlayer
  let largestSize = state.largestArmySize

  let maxKnights = 0
  let maxPlayer: number | null = null
  let tie = false

  for (let i = 0; i < state.players.length; i++) {
    const knights = state.players[i].playedKnights
    if (knights >= LARGEST_ARMY_MINIMUM) {
      if (knights > maxKnights) {
        maxKnights = knights
        maxPlayer = i
        tie = false
      } else if (knights === maxKnights) {
        tie = true
      }
    }
  }

  if (maxPlayer === null) {
    largestPlayer = null
    largestSize = 0
  } else if (tie) {
    // Current holder keeps it if they're tied for max
    if (largestPlayer !== null && state.players[largestPlayer].playedKnights === maxKnights) {
      largestSize = maxKnights
    } else {
      largestPlayer = null
      largestSize = 0
    }
  } else {
    largestPlayer = maxPlayer
    largestSize = maxKnights
  }

  return {
    ...state,
    largestArmyPlayer: largestPlayer,
    largestArmySize: largestSize,
  }
}

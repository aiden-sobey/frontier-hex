import { GameState, DevelopmentCardType, BuildingType } from './types'
import { VICTORY_POINTS_TO_WIN, INITIAL_SETTLEMENTS, INITIAL_CITIES } from './constants'

/**
 * Calculate victory points for a given player.
 * VP = settlements(1) + cities(2) + longest road bonus(2) + largest army bonus(2) + VP dev cards
 */
export function calculateVictoryPoints(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex]
  let vp = 0

  // Settlements: each placed settlement = 1 VP
  // Player starts with INITIAL_SETTLEMENTS pieces, each placed one reduces the count
  const placedSettlements = INITIAL_SETTLEMENTS - player.settlements
  // But cities replace settlements, so we need to count buildings on board
  // Actually, let's count from the board directly for accuracy
  let settlementCount = 0
  let cityCount = 0
  for (const building of Object.values(state.vertexBuildings)) {
    if (building.playerIndex === playerIndex) {
      if (building.type === BuildingType.Settlement) settlementCount++
      else if (building.type === BuildingType.City) cityCount++
    }
  }

  vp += settlementCount * 1
  vp += cityCount * 2

  // Longest road bonus
  if (state.longestRoadPlayer === playerIndex) {
    vp += 2
  }

  // Largest army bonus
  if (state.largestArmyPlayer === playerIndex) {
    vp += 2
  }

  // VP development cards (both in hand and in newDevCards)
  const vpCards = player.developmentCards.filter(c => c === DevelopmentCardType.VictoryPoint).length
  const vpNewCards = player.newDevCards.filter(c => c === DevelopmentCardType.VictoryPoint).length
  vp += vpCards + vpNewCards

  return vp
}

/**
 * Check if any player has won the game. Returns the winner index or null.
 */
export function checkVictory(state: GameState): number | null {
  for (let i = 0; i < state.players.length; i++) {
    if (calculateVictoryPoints(state, i) >= VICTORY_POINTS_TO_WIN) {
      return i
    }
  }
  return null
}

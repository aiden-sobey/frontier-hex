import { GameState, GamePhase, BuyDevCardAction, ActionResult } from '../types'
import { DEV_CARD_COST } from '../constants'
import { hasResources, subtractResources, cloneState } from './helpers'
import { checkVictory } from '../victory'

export function validate(state: GameState, action: BuyDevCardAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn'
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only buy development cards in Main phase'
  }

  const player = state.players[action.playerIndex]

  if (!hasResources(player.resources, DEV_CARD_COST)) {
    return 'Insufficient resources for development card'
  }

  if (state.devCardDeck.length === 0) {
    return 'Development card deck is empty'
  }

  return null
}

export function apply(state: GameState, action: BuyDevCardAction): ActionResult {
  const newState = cloneState(state)
  const player = { ...newState.players[action.playerIndex] }

  // Subtract resources
  player.resources = subtractResources(player.resources, DEV_CARD_COST)

  // Draw from top of deck
  const newDeck = [...state.devCardDeck]
  const card = newDeck.shift()!

  // Add to newDevCards (can't be played this turn)
  player.newDevCards = [...player.newDevCards, card]

  const newPlayers = [...newState.players]
  newPlayers[action.playerIndex] = player
  newState.players = newPlayers
  newState.devCardDeck = newDeck

  // Check victory (VP dev cards count immediately)
  const winner = checkVictory(newState)
  if (winner !== null) {
    newState.winner = winner
    newState.phase = GamePhase.GameOver
  }

  newState.log = [...newState.log, {
    message: `Player ${action.playerIndex} bought a development card`,
    timestamp: Date.now(),
    playerIndex: action.playerIndex,
  }]

  return {
    valid: true,
    state: newState,
    events: [{ type: 'devCardBought', playerIndex: action.playerIndex, card }],
  }
}

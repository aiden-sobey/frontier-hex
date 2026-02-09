import { GameState, GamePhase, EndTurnAction, ActionResult } from '../types'
import { cloneState } from './helpers'

export function validate(state: GameState, action: EndTurnAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn'
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only end turn in Main phase'
  }

  return null
}

export function apply(state: GameState, action: EndTurnAction): ActionResult {
  const newState = cloneState(state)
  const player = { ...newState.players[action.playerIndex] }

  // Move newDevCards to developmentCards
  if (player.newDevCards.length > 0) {
    player.developmentCards = [...player.developmentCards, ...player.newDevCards]
    player.newDevCards = []
  }

  // Reset dev card flag
  player.hasPlayedDevCardThisTurn = false

  const newPlayers = [...newState.players]
  newPlayers[action.playerIndex] = player
  newState.players = newPlayers

  // Advance to next player
  newState.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length
  newState.turnNumber += 1
  newState.phase = GamePhase.PreRoll
  newState.lastDiceRoll = null
  newState.pendingTrade = null

  newState.log = [...newState.log, {
    message: `Player ${action.playerIndex} ended their turn`,
    timestamp: Date.now(),
    playerIndex: action.playerIndex,
  }]

  return {
    valid: true,
    state: newState,
    events: [{ type: 'turnEnded', playerIndex: action.playerIndex, nextPlayer: newState.currentPlayerIndex }],
  }
}

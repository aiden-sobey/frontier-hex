import { GameState, GamePhase, DiscardResourcesAction, ActionResult } from '../types'
import { cloneState, totalResources, hasResources, subtractResources } from './helpers'

export function validate(state: GameState, action: DiscardResourcesAction): string | null {
  // Discard is special: any affected player can do it, not just current player
  if (state.phase !== GamePhase.Discard) {
    return 'Not in Discard phase'
  }

  if (!state.playersNeedingToDiscard.includes(action.playerIndex)) {
    return 'This player does not need to discard'
  }

  const player = state.players[action.playerIndex]
  const handSize = totalResources(player.resources)
  const mustDiscard = Math.floor(handSize / 2)

  const discarding = totalResources(action.resources)
  if (discarding !== mustDiscard) {
    return `Must discard exactly ${mustDiscard} cards, got ${discarding}`
  }

  // Check player has the resources to discard
  if (!hasResources(player.resources, action.resources)) {
    return 'Cannot discard resources you do not have'
  }

  return null
}

export function apply(state: GameState, action: DiscardResourcesAction): ActionResult {
  const newState = cloneState(state)
  const player = { ...newState.players[action.playerIndex] }

  // Subtract discarded resources
  player.resources = subtractResources(player.resources, action.resources)

  const newPlayers = [...newState.players]
  newPlayers[action.playerIndex] = player
  newState.players = newPlayers

  // Remove this player from the discard list
  newState.playersNeedingToDiscard = newState.playersNeedingToDiscard.filter(
    i => i !== action.playerIndex
  )

  const events: ActionResult['events'] = [
    { type: 'resourcesDiscarded', playerIndex: action.playerIndex, resources: action.resources },
  ]

  // If all players have discarded, advance to MoveRobber
  if (newState.playersNeedingToDiscard.length === 0) {
    newState.phase = GamePhase.MoveRobber
    events.push({ type: 'allDiscarded' })
  }

  newState.log = [...newState.log, {
    message: `Player ${action.playerIndex} discarded resources`,
    timestamp: Date.now(),
    playerIndex: action.playerIndex,
  }]

  return {
    valid: true,
    state: newState,
    events,
  }
}

import { GameState, GamePhase, StealResourceAction, ActionResult, ResourceType } from '../types'
import { RESOURCE_TYPES } from '../constants'
import { cloneState } from './helpers'
import { getPhaseAfterRobber } from './move-robber'
import { createSeededRng } from '../setup'

export function validate(state: GameState, action: StealResourceAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn'
  }
  if (state.phase !== GamePhase.StealResource) {
    return 'Not in StealResource phase'
  }
  if (!state.robberStealTargets || !state.robberStealTargets.includes(action.targetPlayerIndex)) {
    return 'Invalid steal target'
  }
  if (action.targetPlayerIndex === action.playerIndex) {
    return 'Cannot steal from yourself'
  }

  return null
}

export function apply(state: GameState, action: StealResourceAction): ActionResult {
  const newState = cloneState(state)
  const targetPlayer = { ...newState.players[action.targetPlayerIndex] }
  const stealingPlayer = { ...newState.players[action.playerIndex] }

  // Randomly steal one resource from target
  const availableResources: ResourceType[] = []
  for (const resource of RESOURCE_TYPES) {
    for (let i = 0; i < targetPlayer.resources[resource]; i++) {
      availableResources.push(resource)
    }
  }

  const events: ActionResult['events'] = []

  if (availableResources.length > 0) {
    const rng = createSeededRng(state.randomSeed + state.turnNumber * 7919 + Date.now())
    const idx = Math.floor(rng() * availableResources.length)
    const stolenResource = availableResources[idx]

    targetPlayer.resources = { ...targetPlayer.resources, [stolenResource]: targetPlayer.resources[stolenResource] - 1 }
    stealingPlayer.resources = { ...stealingPlayer.resources, [stolenResource]: stealingPlayer.resources[stolenResource] + 1 }

    events.push({
      type: 'resourceStolen',
      playerIndex: action.playerIndex,
      targetPlayerIndex: action.targetPlayerIndex,
      resource: stolenResource,
    })
  }

  const newPlayers = [...newState.players]
  newPlayers[action.playerIndex] = stealingPlayer
  newPlayers[action.targetPlayerIndex] = targetPlayer
  newState.players = newPlayers

  newState.robberStealTargets = null
  newState.phase = getPhaseAfterRobber(state)

  newState.log = [...newState.log, {
    message: `Player ${action.playerIndex} stole from Player ${action.targetPlayerIndex}`,
    timestamp: Date.now(),
    playerIndex: action.playerIndex,
  }]

  return {
    valid: true,
    state: newState,
    events,
  }
}

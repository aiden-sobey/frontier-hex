import { GameState, GamePhase, BuildSettlementAction, BuildingType, ActionResult, vertexKey } from '../types'
import { SETTLEMENT_COST } from '../constants'
import { hasResources, subtractResources, cloneState } from './helpers'
import { updateLongestRoad } from '../longest-road'
import { checkVictory } from '../victory'

export function validate(state: GameState, action: BuildSettlementAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn'
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only build settlements in Main phase'
  }

  const player = state.players[action.playerIndex]

  if (!hasResources(player.resources, SETTLEMENT_COST)) {
    return 'Insufficient resources for settlement'
  }

  if (player.settlements <= 0) {
    return 'No settlement pieces remaining'
  }

  // Check vertex exists in board graph
  const vertexExists = state.boardGraph.vertexToHexes.has(action.vertexKey)
  if (!vertexExists) {
    return 'Invalid vertex location'
  }

  // Check vertex is empty
  if (state.vertexBuildings[action.vertexKey]) {
    return 'Vertex already occupied'
  }

  // Distance rule: no adjacent buildings
  const adjVertices = state.boardGraph.vertexToVertices.get(action.vertexKey)
  if (adjVertices) {
    for (const av of adjVertices) {
      if (state.vertexBuildings[vertexKey(av)]) {
        return 'Too close to another building (distance rule)'
      }
    }
  }

  // Must be adjacent to own road
  const adjEdges = state.boardGraph.vertexToEdges.get(action.vertexKey)
  if (!adjEdges) {
    return 'Invalid vertex location'
  }

  let hasAdjacentRoad = false
  for (const edge of adjEdges) {
    const ek = `${edge.q},${edge.r},${edge.d}`
    const road = state.edgeRoads[ek]
    if (road && road.playerIndex === action.playerIndex) {
      hasAdjacentRoad = true
      break
    }
  }

  if (!hasAdjacentRoad) {
    return 'Must build adjacent to your own road'
  }

  return null
}

export function apply(state: GameState, action: BuildSettlementAction): ActionResult {
  let newState = cloneState(state)
  const player = { ...newState.players[action.playerIndex] }

  // Subtract resources
  player.resources = subtractResources(player.resources, SETTLEMENT_COST)
  player.settlements -= 1

  // Update players array
  const newPlayers = [...newState.players]
  newPlayers[action.playerIndex] = player
  newState.players = newPlayers

  // Place building
  newState.vertexBuildings = {
    ...newState.vertexBuildings,
    [action.vertexKey]: { type: BuildingType.Settlement, playerIndex: action.playerIndex },
  }

  // Check for port access
  newState = assignPortIfApplicable(newState, action.vertexKey, action.playerIndex)

  // Update longest road (building can break opponent roads)
  newState = updateLongestRoad(newState)

  // Check victory
  const winner = checkVictory(newState)
  if (winner !== null) {
    newState.winner = winner
    newState.phase = GamePhase.GameOver
  }

  newState.log = [...newState.log, {
    message: `Player ${action.playerIndex} built a settlement`,
    timestamp: Date.now(),
    playerIndex: action.playerIndex,
  }]

  return {
    valid: true,
    state: newState,
    events: [{ type: 'settlementBuilt', playerIndex: action.playerIndex, vertexKey: action.vertexKey }],
  }
}

function assignPortIfApplicable(state: GameState, vk: string, playerIndex: number): GameState {
  for (const port of state.ports) {
    if (port.vertices.includes(vk)) {
      const player = state.players[playerIndex]
      if (!player.ports.includes(port.type)) {
        const newPlayers = [...state.players]
        newPlayers[playerIndex] = {
          ...player,
          ports: [...player.ports, port.type],
        }
        return { ...state, players: newPlayers }
      }
    }
  }
  return state
}

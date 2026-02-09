import {
  GameState, GamePhase, BuildingType, ActionResult,
  SetupPlaceSettlementAction, SetupPlaceRoadAction,
  vertexKey, edgeKey, hexKey,
} from '../types'
import { TERRAIN_TO_RESOURCE } from '../constants'
import { cloneState } from './helpers'
import { getSetupOrder } from '../setup'

// ---- Setup Place Settlement ----

export function validateSetupSettlement(state: GameState, action: SetupPlaceSettlementAction): string | null {
  if (state.phase !== GamePhase.SetupSettlement) {
    return 'Not in SetupSettlement phase'
  }
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn'
  }

  // Check vertex exists
  if (!state.boardGraph.vertexToHexes.has(action.vertexKey)) {
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

  // No road adjacency check during setup
  return null
}

export function applySetupSettlement(state: GameState, action: SetupPlaceSettlementAction): ActionResult {
  let newState = cloneState(state)
  const player = { ...newState.players[action.playerIndex] }

  // Place settlement
  player.settlements -= 1

  const newPlayers = [...newState.players]
  newPlayers[action.playerIndex] = player
  newState.players = newPlayers

  newState.vertexBuildings = {
    ...newState.vertexBuildings,
    [action.vertexKey]: { type: BuildingType.Settlement, playerIndex: action.playerIndex },
  }

  // Check for port access
  for (const port of state.ports) {
    if (port.vertices.includes(action.vertexKey)) {
      if (!player.ports.includes(port.type)) {
        const updatedPlayer = { ...newState.players[action.playerIndex] }
        updatedPlayer.ports = [...updatedPlayer.ports, port.type]
        const p2 = [...newState.players]
        p2[action.playerIndex] = updatedPlayer
        newState.players = p2
      }
    }
  }

  // Advance to SetupRoad phase
  newState.phase = GamePhase.SetupRoad

  newState.log = [...newState.log, {
    message: `Player ${action.playerIndex} placed a setup settlement`,
    timestamp: Date.now(),
    playerIndex: action.playerIndex,
  }]

  return {
    valid: true,
    state: newState,
    events: [{ type: 'setupSettlementPlaced', playerIndex: action.playerIndex, vertexKey: action.vertexKey }],
  }
}

// ---- Setup Place Road ----

export function validateSetupRoad(state: GameState, action: SetupPlaceRoadAction): string | null {
  if (state.phase !== GamePhase.SetupRoad) {
    return 'Not in SetupRoad phase'
  }
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn'
  }

  // Check edge exists
  if (!state.boardGraph.edgeToVertices.has(action.edgeKey)) {
    return 'Invalid edge location'
  }

  // Check edge is empty
  if (state.edgeRoads[action.edgeKey]) {
    return 'Edge already has a road'
  }

  // Must be adjacent to the last placed settlement
  // Find the most recently placed settlement by this player
  const lastSettlement = findLastPlacedSettlement(state, action.playerIndex)
  if (!lastSettlement) {
    return 'No settlement found to connect road to'
  }

  // Check if this edge is adjacent to that settlement
  const adjEdges = state.boardGraph.vertexToEdges.get(lastSettlement)
  if (!adjEdges) {
    return 'Invalid settlement location'
  }

  const isAdjacent = adjEdges.some(e => edgeKey(e) === action.edgeKey)
  if (!isAdjacent) {
    return 'Road must be adjacent to your last placed settlement'
  }

  return null
}

function findLastPlacedSettlement(state: GameState, playerIndex: number): string | null {
  // During setup, the last settlement placed by this player is the one we care about.
  // We look at the log to find it, or just scan buildings.
  // Better approach: the player just placed a settlement (we're in SetupRoad),
  // so any of their settlements that are most recent.
  // Since we track via the log, let's just find all their settlements and pick
  // the one that was placed last (most recently added to vertexBuildings).
  // Since vertexBuildings is a record and we can't track order, we'll use the log.

  // Check log in reverse for the most recent setupSettlementPlaced by this player
  for (let i = state.log.length - 1; i >= 0; i--) {
    const entry = state.log[i]
    if (entry.playerIndex === playerIndex && entry.message.includes('placed a setup settlement')) {
      // The vertex key is in the events, but log doesn't have it.
      // We need another approach: scan vertex buildings for this player's settlements.
      break
    }
  }

  // Alternative: In SetupRoad phase, we know the player JUST placed a settlement.
  // We need the vertex key. Let's find their most recently placed settlement.
  // Since multiple settlements can exist, we need the one that was just placed.
  // Best approach: iterate the vertex buildings, find all for this player.
  // The "last placed" one in setup round 2 has no adjacent road yet.
  const playerSettlements: string[] = []
  for (const [vk, building] of Object.entries(state.vertexBuildings)) {
    if (building.playerIndex === playerIndex && building.type === BuildingType.Settlement) {
      playerSettlements.push(vk)
    }
  }

  // Find the settlement that has NO adjacent road from this player
  // (the one just placed won't have a road yet)
  for (const vk of playerSettlements) {
    const adjEdges = state.boardGraph.vertexToEdges.get(vk)
    if (!adjEdges) continue
    const hasRoad = adjEdges.some(e => {
      const ek = edgeKey(e)
      return state.edgeRoads[ek]?.playerIndex === playerIndex
    })
    if (!hasRoad) {
      return vk
    }
  }

  // Fallback: return the last one found
  return playerSettlements.length > 0 ? playerSettlements[playerSettlements.length - 1] : null
}

export function applySetupRoad(state: GameState, action: SetupPlaceRoadAction): ActionResult {
  let newState = cloneState(state)
  const player = { ...newState.players[action.playerIndex] }

  player.roads -= 1

  const newPlayers = [...newState.players]
  newPlayers[action.playerIndex] = player
  newState.players = newPlayers

  // Place road
  newState.edgeRoads = {
    ...newState.edgeRoads,
    [action.edgeKey]: { playerIndex: action.playerIndex },
  }

  // If setup round 2, grant starting resources from adjacent hexes of the second settlement
  if (state.setupRound === 2) {
    const settlementVk = findLastPlacedSettlement(state, action.playerIndex)
    if (settlementVk) {
      const adjHexes = state.boardGraph.vertexToHexes.get(settlementVk)
      if (adjHexes) {
        const updatedPlayer = { ...newState.players[action.playerIndex] }
        const res = { ...updatedPlayer.resources }
        for (const hex of adjHexes) {
          const tile = state.hexTiles.find(t => t.coord.q === hex.q && t.coord.r === hex.r)
          if (tile) {
            const resource = TERRAIN_TO_RESOURCE[tile.terrain]
            if (resource) {
              res[resource] += 1
            }
          }
        }
        updatedPlayer.resources = res
        const p2 = [...newState.players]
        p2[action.playerIndex] = updatedPlayer
        newState.players = p2
      }
    }
  }

  // Advance in setup order
  newState = advanceSetup(newState)

  newState.log = [...newState.log, {
    message: `Player ${action.playerIndex} placed a setup road`,
    timestamp: Date.now(),
    playerIndex: action.playerIndex,
  }]

  return {
    valid: true,
    state: newState,
    events: [{ type: 'setupRoadPlaced', playerIndex: action.playerIndex, edgeKey: action.edgeKey }],
  }
}

/**
 * Advance to the next player in the setup order, or transition to the main game.
 * Snake draft: [0,1,2,3,3,2,1,0] for 4 players.
 */
function advanceSetup(state: GameState): GameState {
  const numPlayers = state.players.length
  const setupOrder = getSetupOrder(numPlayers)

  // Determine which step we're at in the setup.
  // Each step consists of settlement + road = one setup step.
  // The setup order has 2*numPlayers entries total.
  // turnNumber tracks the current step in setup.
  const currentStep = state.turnNumber
  const nextStep = currentStep + 1

  if (nextStep >= setupOrder.length) {
    // Setup is complete, start the main game
    return {
      ...state,
      phase: GamePhase.PreRoll,
      currentPlayerIndex: 0,
      turnNumber: 0,
      setupRound: 0,
    }
  }

  const nextPlayerIndex = setupOrder[nextStep]
  const newSetupRound = nextStep >= numPlayers ? 2 : 1

  return {
    ...state,
    phase: GamePhase.SetupSettlement,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: nextStep,
    setupRound: newSetupRound,
  }
}

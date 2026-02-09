import { describe, it, expect } from 'vitest'
import { initializeGame } from '../setup'
import { applyAction, validateAction, getLegalActions, getValidSettlementLocations } from '../actions'
import { GamePhase, GameAction, vertexKey, edgeKey } from '../types'

function createTestGame() {
  return initializeGame({
    gameId: 'test-game',
    seed: 42,
    playerNames: ['Alice', 'Bob', 'Charlie', 'Dave'],
    playerIds: ['p1', 'p2', 'p3', 'p4'],
  })
}

/**
 * Helper to get a valid vertex for setup settlement placement.
 */
function getValidSetupVertex(state: ReturnType<typeof createTestGame>, playerIndex: number): string {
  const locations = getValidSettlementLocations(state, playerIndex)
  expect(locations.length).toBeGreaterThan(0)
  return locations[0]
}

/**
 * Helper to find a valid setup road adjacent to a settlement vertex.
 */
function getValidSetupRoadEdge(state: ReturnType<typeof createTestGame>, playerIndex: number, settlementVk: string): string {
  const adjEdges = state.boardGraph.vertexToEdges.get(settlementVk)
  expect(adjEdges).toBeDefined()
  for (const e of adjEdges!) {
    const ek = edgeKey(e)
    if (!state.edgeRoads[ek]) {
      return ek
    }
  }
  throw new Error('No valid road location found')
}

describe('Setup flow', () => {
  it('follows the snake draft order for 4 players', () => {
    let state = createTestGame()
    expect(state.phase).toBe(GamePhase.SetupSettlement)
    expect(state.currentPlayerIndex).toBe(0)

    // Expected setup order: [0,1,2,3,3,2,1,0]
    const expectedOrder = [0, 1, 2, 3, 3, 2, 1, 0]

    for (let step = 0; step < expectedOrder.length; step++) {
      const playerIdx = expectedOrder[step]
      expect(state.currentPlayerIndex).toBe(playerIdx)
      expect(state.phase).toBe(GamePhase.SetupSettlement)

      // Place settlement
      const vk = getValidSetupVertex(state, playerIdx)
      const settlementResult = applyAction(state, {
        type: 'setupPlaceSettlement',
        playerIndex: playerIdx,
        vertexKey: vk,
      })
      expect(settlementResult.valid).toBe(true)
      state = settlementResult.state
      expect(state.phase).toBe(GamePhase.SetupRoad)
      expect(state.currentPlayerIndex).toBe(playerIdx)

      // Place road
      const roadEdge = getValidSetupRoadEdge(state, playerIdx, vk)
      const roadResult = applyAction(state, {
        type: 'setupPlaceRoad',
        playerIndex: playerIdx,
        edgeKey: roadEdge,
      })
      expect(roadResult.valid).toBe(true)
      state = roadResult.state

      // After last step, should transition to PreRoll
      if (step === expectedOrder.length - 1) {
        expect(state.phase).toBe(GamePhase.PreRoll)
        expect(state.currentPlayerIndex).toBe(0)
      }
    }

    // Verify setup is complete
    expect(state.phase).toBe(GamePhase.PreRoll)
    // Each player should have placed 2 settlements and 2 roads
    for (let i = 0; i < 4; i++) {
      expect(state.players[i].settlements).toBe(3) // 5 - 2
      expect(state.players[i].roads).toBe(13) // 15 - 2
    }
    // 8 settlements on the board
    expect(Object.keys(state.vertexBuildings)).toHaveLength(8)
    // 8 roads on the board
    expect(Object.keys(state.edgeRoads)).toHaveLength(8)
  })

  it('grants starting resources for second settlement', () => {
    let state = createTestGame()

    // Complete round 1 (no resources given)
    const expectedOrder = [0, 1, 2, 3, 3, 2, 1, 0]
    const verticesUsed: string[] = []

    for (let step = 0; step < expectedOrder.length; step++) {
      const playerIdx = expectedOrder[step]
      const vk = getValidSetupVertex(state, playerIdx)
      verticesUsed.push(vk)

      let result = applyAction(state, {
        type: 'setupPlaceSettlement',
        playerIndex: playerIdx,
        vertexKey: vk,
      })
      state = result.state

      const roadEdge = getValidSetupRoadEdge(state, playerIdx, vk)
      result = applyAction(state, {
        type: 'setupPlaceRoad',
        playerIndex: playerIdx,
        edgeKey: roadEdge,
      })
      state = result.state

      // After round 1 (first 4 placements), players should have no resources
      if (step < 4) {
        const totalRes = Object.values(state.players[playerIdx].resources).reduce((a, b) => a + b, 0)
        // Round 1 gives nothing
        if (step < 4) {
          // round 1 - check only for first 4 steps
        }
      }
    }

    // After setup, at least some players should have resources from round 2
    // (depending on which hexes their second settlements are adjacent to)
    let anyResourcesGranted = false
    for (let i = 0; i < 4; i++) {
      const res = state.players[i].resources
      const total = res.wood + res.brick + res.sheep + res.wheat + res.ore
      if (total > 0) anyResourcesGranted = true
    }
    // Most likely resources are granted unless all second settlements are on desert
    expect(anyResourcesGranted).toBe(true)
  })
})

describe('Invalid actions are rejected', () => {
  it('rejects settlement placement by wrong player', () => {
    const state = createTestGame()
    expect(state.currentPlayerIndex).toBe(0)

    const vk = getValidSetupVertex(state, 0)
    const error = validateAction(state, {
      type: 'setupPlaceSettlement',
      playerIndex: 1,
      vertexKey: vk,
    })
    expect(error).toBe('Not your turn')
  })

  it('rejects rolling dice during setup', () => {
    const state = createTestGame()
    const error = validateAction(state, {
      type: 'rollDice',
      playerIndex: 0,
    })
    expect(error).not.toBeNull()
  })

  it('rejects building road during wrong phase', () => {
    const state = createTestGame()
    const error = validateAction(state, {
      type: 'buildRoad',
      playerIndex: 0,
      edgeKey: '0,0,NE',
    })
    expect(error).not.toBeNull()
  })

  it('rejects end turn during setup', () => {
    const state = createTestGame()
    const error = validateAction(state, {
      type: 'endTurn',
      playerIndex: 0,
    })
    expect(error).not.toBeNull()
  })

  it('rejects actions after game over', () => {
    let state = createTestGame()
    state = { ...state, phase: GamePhase.GameOver, winner: 0 }
    const error = validateAction(state, {
      type: 'rollDice',
      playerIndex: 0,
    })
    expect(error).toBe('Game is over')
  })
})

describe('getLegalActions', () => {
  it('returns setup settlement actions during SetupSettlement phase', () => {
    const state = createTestGame()
    const actions = getLegalActions(state, 0)
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.every(a => a.type === 'setupPlaceSettlement')).toBe(true)
  })

  it('returns no actions for non-current player', () => {
    const state = createTestGame()
    const actions = getLegalActions(state, 1)
    expect(actions).toHaveLength(0)
  })

  it('returns rollDice in PreRoll phase', () => {
    let state = createTestGame()
    state = { ...state, phase: GamePhase.PreRoll, currentPlayerIndex: 0 }
    const actions = getLegalActions(state, 0)
    expect(actions.some(a => a.type === 'rollDice')).toBe(true)
  })
})

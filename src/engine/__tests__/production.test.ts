import { describe, it, expect } from 'vitest'
import { initializeGame } from '../setup'
import { produceResources } from '../production'
import { GameState, BuildingType, hexKey, vertexKey, TerrainType, ResourceType } from '../types'
import { TERRAIN_TO_RESOURCE } from '../constants'

function createTestGame() {
  return initializeGame({
    gameId: 'test-game',
    seed: 42,
    playerNames: ['Alice', 'Bob', 'Charlie', 'Dave'],
    playerIds: ['p1', 'p2', 'p3', 'p4'],
  })
}

/**
 * Place a building for testing purposes directly on a vertex.
 */
function placeBuilding(
  state: GameState,
  vk: string,
  playerIndex: number,
  type: BuildingType,
): GameState {
  return {
    ...state,
    vertexBuildings: {
      ...state.vertexBuildings,
      [vk]: { type, playerIndex },
    },
  }
}

describe('Resource production', () => {
  it('gives correct resources for a settlement', () => {
    let state = createTestGame()

    // Find a hex with a number token
    const hex = state.hexTiles.find(h => h.numberToken !== null && h.terrain !== TerrainType.Desert)!
    const expectedResource = TERRAIN_TO_RESOURCE[hex.terrain]!
    const numberToken = hex.numberToken!

    // Place a settlement on one of this hex's vertices
    const hexVerts = state.boardGraph.hexToVertices.get(hexKey(hex.coord))!
    const vk = vertexKey(hexVerts[0])

    state = placeBuilding(state, vk, 0, BuildingType.Settlement)

    // Record resources before
    const before = state.players[0].resources[expectedResource]

    // Produce resources for this number
    const result = produceResources(state, numberToken)

    // Player should get 1 of the resource
    const after = result.state.players[0].resources[expectedResource]
    expect(after).toBe(before + 1)
  })

  it('gives 2 resources for a city', () => {
    let state = createTestGame()

    const hex = state.hexTiles.find(h => h.numberToken !== null && h.terrain !== TerrainType.Desert)!
    const expectedResource = TERRAIN_TO_RESOURCE[hex.terrain]!
    const numberToken = hex.numberToken!

    const hexVerts = state.boardGraph.hexToVertices.get(hexKey(hex.coord))!
    const vk = vertexKey(hexVerts[0])

    state = placeBuilding(state, vk, 0, BuildingType.City)

    const before = state.players[0].resources[expectedResource]
    const result = produceResources(state, numberToken)
    const after = result.state.players[0].resources[expectedResource]

    expect(after).toBe(before + 2)
  })

  it('does not produce resources on hex blocked by robber', () => {
    let state = createTestGame()

    const hex = state.hexTiles.find(h => h.numberToken !== null && h.terrain !== TerrainType.Desert)!
    const expectedResource = TERRAIN_TO_RESOURCE[hex.terrain]!
    const numberToken = hex.numberToken!

    const hexVerts = state.boardGraph.hexToVertices.get(hexKey(hex.coord))!
    const vk = vertexKey(hexVerts[0])

    state = placeBuilding(state, vk, 0, BuildingType.Settlement)

    // Move robber to this hex
    state = { ...state, robberHex: { ...hex.coord } }

    const before = state.players[0].resources[expectedResource]
    const result = produceResources(state, numberToken)
    const after = result.state.players[0].resources[expectedResource]

    // Should NOT get resources
    expect(after).toBe(before)
  })

  it('produces nothing when no buildings on matching hex', () => {
    let state = createTestGame()

    // Pick a number that matches a hex but place no buildings
    const hex = state.hexTiles.find(h => h.numberToken !== null)!

    const resourcesBefore = state.players.map(p => ({ ...p.resources }))
    const result = produceResources(state, hex.numberToken!)

    // All players should have same resources
    for (let i = 0; i < state.players.length; i++) {
      expect(result.state.players[i].resources).toEqual(resourcesBefore[i])
    }
  })

  it('produces resources for multiple players on same hex', () => {
    let state = createTestGame()

    const hex = state.hexTiles.find(h => h.numberToken !== null && h.terrain !== TerrainType.Desert)!
    const expectedResource = TERRAIN_TO_RESOURCE[hex.terrain]!
    const numberToken = hex.numberToken!

    const hexVerts = state.boardGraph.hexToVertices.get(hexKey(hex.coord))!

    // Place settlement for player 0 on vertex 0
    state = placeBuilding(state, vertexKey(hexVerts[0]), 0, BuildingType.Settlement)
    // Place settlement for player 1 on vertex 3 (opposite side, won't violate distance rule)
    state = placeBuilding(state, vertexKey(hexVerts[3]), 1, BuildingType.Settlement)

    const before0 = state.players[0].resources[expectedResource]
    const before1 = state.players[1].resources[expectedResource]

    const result = produceResources(state, numberToken)

    expect(result.state.players[0].resources[expectedResource]).toBe(before0 + 1)
    expect(result.state.players[1].resources[expectedResource]).toBe(before1 + 1)
  })

  it('produces for settlement and city on same hex', () => {
    let state = createTestGame()

    const hex = state.hexTiles.find(h => h.numberToken !== null && h.terrain !== TerrainType.Desert)!
    const expectedResource = TERRAIN_TO_RESOURCE[hex.terrain]!
    const numberToken = hex.numberToken!

    const hexVerts = state.boardGraph.hexToVertices.get(hexKey(hex.coord))!

    // Player 0: settlement on vertex 0, city on vertex 3
    state = placeBuilding(state, vertexKey(hexVerts[0]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(hexVerts[3]), 0, BuildingType.City)

    const before = state.players[0].resources[expectedResource]
    const result = produceResources(state, numberToken)

    // Settlement (1) + City (2) = 3
    expect(result.state.players[0].resources[expectedResource]).toBe(before + 3)
  })
})

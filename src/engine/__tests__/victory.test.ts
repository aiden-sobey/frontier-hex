import { describe, it, expect } from 'vitest'
import { initializeGame } from '../setup'
import { calculateVictoryPoints, checkVictory } from '../victory'
import { GameState, BuildingType, DevelopmentCardType, vertexKey } from '../types'

function createTestGame() {
  return initializeGame({
    gameId: 'test-game',
    seed: 42,
    playerNames: ['Alice', 'Bob', 'Charlie', 'Dave'],
    playerIds: ['p1', 'p2', 'p3', 'p4'],
  })
}

function placeBuilding(state: GameState, vk: string, playerIndex: number, type: BuildingType): GameState {
  return {
    ...state,
    vertexBuildings: {
      ...state.vertexBuildings,
      [vk]: { type, playerIndex },
    },
  }
}

describe('calculateVictoryPoints', () => {
  it('counts 1 VP per settlement', () => {
    let state = createTestGame()

    // Place 2 settlements for player 0
    const v1 = vertexKey(state.boardGraph.vertices[0])
    const v2 = vertexKey(state.boardGraph.vertices[5])

    state = placeBuilding(state, v1, 0, BuildingType.Settlement)
    state = placeBuilding(state, v2, 0, BuildingType.Settlement)

    expect(calculateVictoryPoints(state, 0)).toBe(2)
  })

  it('counts 2 VP per city', () => {
    let state = createTestGame()

    const v1 = vertexKey(state.boardGraph.vertices[0])
    state = placeBuilding(state, v1, 0, BuildingType.City)

    expect(calculateVictoryPoints(state, 0)).toBe(2)
  })

  it('counts settlements and cities together', () => {
    let state = createTestGame()

    const v1 = vertexKey(state.boardGraph.vertices[0])
    const v2 = vertexKey(state.boardGraph.vertices[5])

    state = placeBuilding(state, v1, 0, BuildingType.Settlement) // +1
    state = placeBuilding(state, v2, 0, BuildingType.City)        // +2

    expect(calculateVictoryPoints(state, 0)).toBe(3)
  })

  it('adds 2 VP for longest road', () => {
    let state = createTestGame()

    const v1 = vertexKey(state.boardGraph.vertices[0])
    state = placeBuilding(state, v1, 0, BuildingType.Settlement)

    state = { ...state, longestRoadPlayer: 0, longestRoadLength: 5 }

    expect(calculateVictoryPoints(state, 0)).toBe(3) // 1 settlement + 2 longest road
  })

  it('adds 2 VP for largest army', () => {
    let state = createTestGame()

    const v1 = vertexKey(state.boardGraph.vertices[0])
    state = placeBuilding(state, v1, 0, BuildingType.Settlement)

    state = { ...state, largestArmyPlayer: 0, largestArmySize: 3 }

    expect(calculateVictoryPoints(state, 0)).toBe(3) // 1 settlement + 2 largest army
  })

  it('counts VP development cards', () => {
    let state = createTestGame()

    const newPlayers = [...state.players]
    newPlayers[0] = {
      ...newPlayers[0],
      developmentCards: [DevelopmentCardType.VictoryPoint, DevelopmentCardType.VictoryPoint],
    }
    state = { ...state, players: newPlayers }

    expect(calculateVictoryPoints(state, 0)).toBe(2)
  })

  it('counts VP cards in newDevCards', () => {
    let state = createTestGame()

    const newPlayers = [...state.players]
    newPlayers[0] = {
      ...newPlayers[0],
      newDevCards: [DevelopmentCardType.VictoryPoint],
    }
    state = { ...state, players: newPlayers }

    expect(calculateVictoryPoints(state, 0)).toBe(1)
  })

  it('combines all VP sources', () => {
    let state = createTestGame()

    // 3 settlements (3 VP) + 1 city (2 VP) + longest road (2 VP) + largest army (2 VP) + 1 VP card
    const vertices = state.boardGraph.vertices
    state = placeBuilding(state, vertexKey(vertices[0]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(vertices[5]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(vertices[10]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(vertices[15]), 0, BuildingType.City)

    state = {
      ...state,
      longestRoadPlayer: 0,
      longestRoadLength: 5,
      largestArmyPlayer: 0,
      largestArmySize: 3,
    }

    const newPlayers = [...state.players]
    newPlayers[0] = {
      ...newPlayers[0],
      developmentCards: [DevelopmentCardType.VictoryPoint],
    }
    state = { ...state, players: newPlayers }

    // 3 + 2 + 2 + 2 + 1 = 10
    expect(calculateVictoryPoints(state, 0)).toBe(10)
  })

  it('does not count other players buildings', () => {
    let state = createTestGame()

    const v1 = vertexKey(state.boardGraph.vertices[0])
    state = placeBuilding(state, v1, 1, BuildingType.Settlement) // Player 1's building

    expect(calculateVictoryPoints(state, 0)).toBe(0)
    expect(calculateVictoryPoints(state, 1)).toBe(1)
  })
})

describe('checkVictory', () => {
  it('returns null when no player has 10 VP', () => {
    let state = createTestGame()
    const v1 = vertexKey(state.boardGraph.vertices[0])
    state = placeBuilding(state, v1, 0, BuildingType.Settlement)

    expect(checkVictory(state)).toBeNull()
  })

  it('returns winner index when a player reaches 10 VP', () => {
    let state = createTestGame()

    // Give player 0 enough to win: 5 settlements + 2 largest army + 2 longest road + 1 VP card = 10
    const vertices = state.boardGraph.vertices
    state = placeBuilding(state, vertexKey(vertices[0]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(vertices[5]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(vertices[10]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(vertices[15]), 0, BuildingType.Settlement)
    state = placeBuilding(state, vertexKey(vertices[20]), 0, BuildingType.Settlement)

    state = {
      ...state,
      longestRoadPlayer: 0,
      longestRoadLength: 5,
      largestArmyPlayer: 0,
      largestArmySize: 3,
    }

    const newPlayers = [...state.players]
    newPlayers[0] = {
      ...newPlayers[0],
      developmentCards: [DevelopmentCardType.VictoryPoint],
    }
    state = { ...state, players: newPlayers }

    // 5 + 2 + 2 + 1 = 10
    expect(checkVictory(state)).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { generateBoard, createSeededRng, shuffle, initializeGame, createDevCardDeck, getSetupOrder } from '../setup'
import { TerrainType, GamePhase } from '../types'

describe('createSeededRng', () => {
  it('produces deterministic results', () => {
    const rng1 = createSeededRng(42)
    const rng2 = createSeededRng(42)
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it('different seeds produce different results', () => {
    const rng1 = createSeededRng(42)
    const rng2 = createSeededRng(43)
    let same = true
    for (let i = 0; i < 10; i++) {
      if (rng1() !== rng2()) same = false
    }
    expect(same).toBe(false)
  })
})

describe('generateBoard', () => {
  it('same seed produces same result', () => {
    const board1 = generateBoard(42)
    const board2 = generateBoard(42)
    expect(board1.hexTiles.map(t => t.terrain)).toEqual(board2.hexTiles.map(t => t.terrain))
    expect(board1.hexTiles.map(t => t.numberToken)).toEqual(board2.hexTiles.map(t => t.numberToken))
  })

  it('produces exactly 19 hex tiles', () => {
    const { hexTiles } = generateBoard(42)
    expect(hexTiles).toHaveLength(19)
  })

  it('places exactly 1 desert with no number token', () => {
    const { hexTiles } = generateBoard(42)
    const deserts = hexTiles.filter(t => t.terrain === TerrainType.Desert)
    expect(deserts).toHaveLength(1)
    expect(deserts[0].numberToken).toBeNull()
  })

  it('uses all 18 number tokens', () => {
    const { hexTiles } = generateBoard(42)
    const tokens = hexTiles.filter(t => t.numberToken !== null).map(t => t.numberToken!)
    expect(tokens).toHaveLength(18)
    // Check they match the expected distribution
    expect(tokens.sort((a, b) => a - b)).toEqual([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12])
  })

  it('robber starts on desert', () => {
    const { hexTiles, robberHex } = generateBoard(42)
    const desertTile = hexTiles.find(t => t.terrain === TerrainType.Desert)!
    expect(robberHex).toEqual(desertTile.coord)
  })
})

describe('getSetupOrder', () => {
  it('returns snake draft for 4 players', () => {
    expect(getSetupOrder(4)).toEqual([0, 1, 2, 3, 3, 2, 1, 0])
  })

  it('returns snake draft for 3 players', () => {
    expect(getSetupOrder(3)).toEqual([0, 1, 2, 2, 1, 0])
  })
})

describe('initializeGame', () => {
  it('creates a valid initial game state', () => {
    const state = initializeGame({
      gameId: 'test-game',
      seed: 42,
      playerNames: ['Alice', 'Bob', 'Charlie', 'Dave'],
      playerIds: ['p1', 'p2', 'p3', 'p4'],
    })

    expect(state.gameId).toBe('test-game')
    expect(state.players).toHaveLength(4)
    expect(state.phase).toBe(GamePhase.SetupSettlement)
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.hexTiles).toHaveLength(19)
    expect(state.winner).toBeNull()
    expect(state.devCardDeck).toHaveLength(25)
    expect(Object.keys(state.vertexBuildings)).toHaveLength(0)
    expect(Object.keys(state.edgeRoads)).toHaveLength(0)
  })

  it('players start with correct resources and pieces', () => {
    const state = initializeGame({
      gameId: 'test',
      seed: 42,
      playerNames: ['A', 'B', 'C', 'D'],
      playerIds: ['p1', 'p2', 'p3', 'p4'],
    })

    for (const player of state.players) {
      expect(player.resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 })
      expect(player.settlements).toBe(5)
      expect(player.cities).toBe(4)
      expect(player.roads).toBe(15)
      expect(player.developmentCards).toHaveLength(0)
    }
  })
})

describe('createDevCardDeck', () => {
  it('contains 25 cards', () => {
    const rng = createSeededRng(42)
    const deck = createDevCardDeck(rng)
    expect(deck).toHaveLength(25)
  })
})

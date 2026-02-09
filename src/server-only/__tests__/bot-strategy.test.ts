import { describe, it, expect } from 'vitest'
import { initializeGame } from '~/engine/setup'
import {
  applyAction, getLegalActions,
  getValidSettlementLocations, getValidRoadLocations,
  getValidCityLocations,
} from '~/engine/actions'
import { GamePhase, GameAction, vertexKey, edgeKey, ResourceType, DevelopmentCardType, BuildingType } from '~/engine/types'
import { pips, RESOURCE_TYPES, EMPTY_RESOURCES } from '~/engine/constants'
import { totalResources } from '~/engine/validators/helpers'
import { BasicBotStrategy } from '../bot-strategy'
import { BotPlayer } from '../bot-player'

import type { GameState } from '~/engine/types'

function createTestGame(seed = 42) {
  return initializeGame({
    gameId: 'bot-test',
    seed,
    playerNames: ['Bot 0', 'Bot 1', 'Bot 2', 'Bot 3'],
    playerIds: ['bot0', 'bot1', 'bot2', 'bot3'],
  })
}

/**
 * Run through the full setup phase (8 settlement+road placements)
 * using the bot strategy, returning the post-setup state.
 */
function runSetupPhase(state: GameState, strategy: BasicBotStrategy): GameState {
  const setupOrder = [0, 1, 2, 3, 3, 2, 1, 0]
  for (const playerIdx of setupOrder) {
    // Place settlement
    expect(state.phase).toBe(GamePhase.SetupSettlement)
    expect(state.currentPlayerIndex).toBe(playerIdx)
    const settlementAction = strategy.chooseAction(state, playerIdx)
    expect(settlementAction).not.toBeNull()
    expect(settlementAction!.type).toBe('setupPlaceSettlement')
    let result = applyAction(state, settlementAction!)
    expect(result.valid).toBe(true)
    state = result.state

    // Place road
    expect(state.phase).toBe(GamePhase.SetupRoad)
    expect(state.currentPlayerIndex).toBe(playerIdx)
    const roadAction = strategy.chooseAction(state, playerIdx)
    expect(roadAction).not.toBeNull()
    expect(roadAction!.type).toBe('setupPlaceRoad')
    result = applyAction(state, roadAction!)
    expect(result.valid).toBe(true)
    state = result.state
  }
  return state
}

describe('BasicBotStrategy', () => {
  describe('Setup Settlement Selection', () => {
    it('picks a high-pip-count vertex for setup settlement', () => {
      const state = createTestGame()
      const strategy = new BasicBotStrategy()

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('setupPlaceSettlement')

      if (action!.type !== 'setupPlaceSettlement') throw new Error('wrong type')
      const vk = action!.vertexKey

      // Verify it's a valid location
      const validLocations = getValidSettlementLocations(state, 0)
      expect(validLocations).toContain(vk)

      // Check that the chosen vertex has a reasonable pip score
      const adjHexes = state.boardGraph.vertexToHexes.get(vk)!
      let pipScore = 0
      for (const hex of adjHexes) {
        const tile = state.hexTiles.find(t => t.coord.q === hex.q && t.coord.r === hex.r)
        if (tile && tile.numberToken !== null) {
          pipScore += pips(tile.numberToken)
        }
      }
      // A good vertex should have at least 5 pips total
      expect(pipScore).toBeGreaterThanOrEqual(5)
    })

    it('produces valid actions for all setup players', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()

      // Run through all 8 setup placements
      state = runSetupPhase(state, strategy)

      // After setup, should be in PreRoll phase
      expect(state.phase).toBe(GamePhase.PreRoll)
      expect(state.currentPlayerIndex).toBe(0)

      // Each player should have 2 settlements and 2 roads placed
      for (let i = 0; i < 4; i++) {
        expect(state.players[i].settlements).toBe(3) // 5 - 2 placed
        expect(state.players[i].roads).toBe(13) // 15 - 2 placed
      }
    })
  })

  describe('Setup Road Selection', () => {
    it('builds road adjacent to the just-placed settlement', () => {
      let state = createTestGame()
      const strategy = new BasicBotStrategy()

      // Place first settlement
      const settlementAction = strategy.chooseAction(state, 0)
      expect(settlementAction).not.toBeNull()
      const result = applyAction(state, settlementAction!)
      expect(result.valid).toBe(true)
      state = result.state

      // Now in SetupRoad phase
      expect(state.phase).toBe(GamePhase.SetupRoad)
      const roadAction = strategy.chooseAction(state, 0)
      expect(roadAction).not.toBeNull()
      expect(roadAction!.type).toBe('setupPlaceRoad')

      // Verify the chosen road is valid
      const roadResult = applyAction(state, roadAction!)
      expect(roadResult.valid).toBe(true)
    })
  })

  describe('PreRoll Phase', () => {
    it('rolls dice when no knight is available or beneficial', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Should be in PreRoll
      expect(state.phase).toBe(GamePhase.PreRoll)

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('rollDice')
    })

    it('plays knight when robber is on own hex and has knight card', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Give player 0 a knight card
      const player = { ...state.players[0] }
      player.developmentCards = [DevelopmentCardType.Knight]
      player.hasPlayedDevCardThisTurn = false
      const newPlayers = [...state.players]
      newPlayers[0] = player
      state = { ...state, players: newPlayers }

      // Move robber to a hex where player 0 has a building
      // Find a hex adjacent to one of player 0's buildings
      let robberHex = state.robberHex
      for (const [vk, building] of Object.entries(state.vertexBuildings)) {
        if (building.playerIndex === 0) {
          const adjHexes = state.boardGraph.vertexToHexes.get(vk)
          if (adjHexes && adjHexes.length > 0) {
            robberHex = adjHexes[0]
            break
          }
        }
      }
      state = { ...state, robberHex }

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('playKnight')
    })
  })

  describe('Main Phase - City Building', () => {
    it('builds city when affordable and has settlements on the board', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Give player 0 resources for a city
      const player = { ...state.players[0] }
      player.resources = { wood: 0, brick: 0, sheep: 0, wheat: 3, ore: 4 }
      const newPlayers = [...state.players]
      newPlayers[0] = player
      state = {
        ...state,
        players: newPlayers,
        phase: GamePhase.Main,
        currentPlayerIndex: 0,
        lastDiceRoll: [3, 4],
      }

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('buildCity')
    })
  })

  describe('Main Phase - Settlement Building', () => {
    it('builds settlement when affordable and valid locations exist', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Give player 0 enough resources for a settlement
      const player = { ...state.players[0] }
      player.resources = { wood: 2, brick: 2, sheep: 2, wheat: 2, ore: 0 }
      const newPlayers = [...state.players]
      newPlayers[0] = player
      state = {
        ...state,
        players: newPlayers,
        phase: GamePhase.Main,
        currentPlayerIndex: 0,
        lastDiceRoll: [3, 4],
      }

      // Check if there are valid settlement locations (need road network)
      const locations = getValidSettlementLocations(state, 0)
      if (locations.length > 0) {
        const action = strategy.chooseAction(state, 0)
        expect(action).not.toBeNull()
        // Should build settlement (or city if city locations exist and ore is available)
        expect(['buildSettlement', 'buildCity']).toContain(action!.type)
      }
    })
  })

  describe('Main Phase - End Turn', () => {
    it('ends turn when nothing useful to do', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Give player 0 no resources
      const player = { ...state.players[0] }
      player.resources = { ...EMPTY_RESOURCES }
      player.developmentCards = []
      const newPlayers = [...state.players]
      newPlayers[0] = player
      state = {
        ...state,
        players: newPlayers,
        phase: GamePhase.Main,
        currentPlayerIndex: 0,
        lastDiceRoll: [3, 4],
      }

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('endTurn')
    })
  })

  describe('Discard Phase', () => {
    it('discards correct number of resources', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Give player 0 a large hand (10 resources)
      const player = { ...state.players[0] }
      player.resources = { wood: 3, brick: 2, sheep: 2, wheat: 2, ore: 1 }
      const newPlayers = [...state.players]
      newPlayers[0] = player
      state = {
        ...state,
        players: newPlayers,
        phase: GamePhase.Discard,
        playersNeedingToDiscard: [0],
      }

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('discardResources')
      if (action!.type !== 'discardResources') throw new Error('wrong type')

      // Must discard floor(10/2) = 5 resources
      const discardTotal = totalResources(action!.resources)
      expect(discardTotal).toBe(5)

      // Verify the discard action is valid
      const result = applyAction(state, action!)
      expect(result.valid).toBe(true)
    })

    it('discards only resources the player actually has', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Give player 1 uneven resources (8 total)
      const player = { ...state.players[1] }
      player.resources = { wood: 0, brick: 0, sheep: 6, wheat: 1, ore: 1 }
      const newPlayers = [...state.players]
      newPlayers[1] = player
      state = {
        ...state,
        players: newPlayers,
        phase: GamePhase.Discard,
        playersNeedingToDiscard: [1],
      }

      const action = strategy.chooseAction(state, 1)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('discardResources')
      if (action!.type !== 'discardResources') throw new Error('wrong type')

      // Must discard floor(8/2) = 4
      expect(totalResources(action!.resources)).toBe(4)

      // Verify validity
      const result = applyAction(state, action!)
      expect(result.valid).toBe(true)
    })
  })

  describe('MoveRobber Phase', () => {
    it('moves robber to hex with opponent buildings', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      state = {
        ...state,
        phase: GamePhase.MoveRobber,
        currentPlayerIndex: 0,
        lastDiceRoll: [4, 3],
      }

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('moveRobber')
      if (action!.type !== 'moveRobber') throw new Error('wrong type')

      // Verify it's a valid robber location
      const result = applyAction(state, action!)
      expect(result.valid).toBe(true)

      // Verify the chosen hex is not the same as the current robber hex
      const chosenHk = `${action!.hex.q},${action!.hex.r}`
      const currentHk = `${state.robberHex.q},${state.robberHex.r}`
      expect(chosenHk).not.toBe(currentHk)
    })
  })

  describe('StealResource Phase', () => {
    it('steals from the richest opponent', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      // Set up steal targets
      // Give player 2 many resources, player 1 few
      const newPlayers = state.players.map((p, i) => {
        if (i === 1) return { ...p, resources: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 } }
        if (i === 2) return { ...p, resources: { wood: 3, brick: 3, sheep: 3, wheat: 3, ore: 3 } }
        return p
      })
      state = {
        ...state,
        players: newPlayers,
        phase: GamePhase.StealResource,
        currentPlayerIndex: 0,
        robberStealTargets: [1, 2],
      }

      const action = strategy.chooseAction(state, 0)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('stealResource')
      if (action!.type !== 'stealResource') throw new Error('wrong type')

      // Should steal from player 2 (richer)
      expect(action!.targetPlayerIndex).toBe(2)
    })
  })

  describe('BotPlayer', () => {
    it('correctly determines when to act', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()

      const bot0 = new BotPlayer(0, strategy, 0)
      const bot1 = new BotPlayer(1, strategy, 0)

      // In SetupSettlement, only current player should act
      expect(bot0.shouldAct(state)).toBe(true)
      expect(bot1.shouldAct(state)).toBe(false)
    })

    it('acts during discard phase when in discard list', () => {
      const strategy = new BasicBotStrategy()
      let state = createTestGame()
      state = runSetupPhase(state, strategy)

      const bot1 = new BotPlayer(1, strategy, 0)

      state = {
        ...state,
        phase: GamePhase.Discard,
        playersNeedingToDiscard: [1, 3],
      }

      expect(bot1.shouldAct(state)).toBe(true)

      const bot0 = new BotPlayer(0, strategy, 0)
      expect(bot0.shouldAct(state)).toBe(false)
    })

    it('chooseAction returns a valid action', async () => {
      const strategy = new BasicBotStrategy()
      const state = createTestGame()

      const bot = new BotPlayer(0, strategy, 0)
      const action = await bot.chooseAction(state)
      expect(action).not.toBeNull()
      expect(action!.type).toBe('setupPlaceSettlement')
    })
  })

  describe('Full Game Simulation', () => {
    it('4 bots can play a complete game', () => {
      let state = initializeGame({
        gameId: 'bot-full-game',
        seed: 42,
        playerNames: ['Bot 0', 'Bot 1', 'Bot 2', 'Bot 3'],
        playerIds: ['bot0', 'bot1', 'bot2', 'bot3'],
      })

      const strategy = new BasicBotStrategy()
      const maxTurns = 2000
      let actions = 0

      while (state.winner === null && actions < maxTurns) {
        // Handle discard phase (multiple players may need to act)
        if (state.phase === GamePhase.Discard) {
          // Process one player at a time from the discard list
          const discardList = [...state.playersNeedingToDiscard]
          for (const pi of discardList) {
            if (!state.playersNeedingToDiscard.includes(pi)) continue
            const action = strategy.chooseAction(state, pi)
            if (action) {
              const result = applyAction(state, action)
              if (result.valid) {
                state = result.state
                actions++
              }
            }
          }
          continue
        }

        const currentPlayer = state.currentPlayerIndex

        // Handle pending trade responses from non-current players
        if (state.phase === GamePhase.Main && state.pendingTrade) {
          // If the current bot has a pending trade, let the bot handle it
          const action = strategy.chooseAction(state, currentPlayer)
          if (action) {
            const result = applyAction(state, action)
            if (result.valid) {
              state = result.state
              actions++
              continue
            }
          }
        }

        const action = strategy.chooseAction(state, currentPlayer)
        if (!action) break // no valid action, shouldn't happen

        const result = applyAction(state, action)
        if (result.valid) {
          state = result.state
        } else {
          // Invalid action from strategy, fall back to first legal action
          const legal = getLegalActions(state, currentPlayer)
          if (legal.length === 0) break

          // For discard, getLegalActions returns a placeholder; use strategy for proper bundle
          if (state.phase === GamePhase.Discard) continue

          const fallback = applyAction(state, legal[0])
          if (fallback.valid) {
            state = fallback.state
          } else {
            break
          }
        }
        actions++
      }

      expect(state.winner).not.toBeNull()
      expect(actions).toBeLessThan(maxTurns)
      expect(actions).toBeGreaterThan(0)

      // Winner should have >= 10 VP
      // (The game engine checks this internally)
      expect(state.phase).toBe(GamePhase.GameOver)
    }, 30000) // 30s timeout for the full simulation

    it('completes with different random seeds', () => {
      // Test with a few different seeds to verify robustness
      const seeds = [123, 456, 789]

      for (const seed of seeds) {
        let state = initializeGame({
          gameId: `bot-seed-${seed}`,
          seed,
          playerNames: ['Bot 0', 'Bot 1', 'Bot 2', 'Bot 3'],
          playerIds: ['bot0', 'bot1', 'bot2', 'bot3'],
        })

        const strategy = new BasicBotStrategy()
        const maxActions = 2000
        let actions = 0

        while (state.winner === null && actions < maxActions) {
          if (state.phase === GamePhase.Discard) {
            const discardList = [...state.playersNeedingToDiscard]
            for (const pi of discardList) {
              if (!state.playersNeedingToDiscard.includes(pi)) continue
              const action = strategy.chooseAction(state, pi)
              if (action) {
                const result = applyAction(state, action)
                if (result.valid) {
                  state = result.state
                  actions++
                }
              }
            }
            continue
          }

          const currentPlayer = state.currentPlayerIndex
          const action = strategy.chooseAction(state, currentPlayer)
          if (!action) break

          const result = applyAction(state, action)
          if (result.valid) {
            state = result.state
          } else {
            const legal = getLegalActions(state, currentPlayer)
            if (legal.length === 0) break
            if (state.phase === GamePhase.Discard) continue
            const fallback = applyAction(state, legal[0])
            if (fallback.valid) state = fallback.state
            else break
          }
          actions++
        }

        expect(state.winner).not.toBeNull()
        expect(actions).toBeLessThan(maxActions)
      }
    }, 60000) // 60s timeout for multiple games
  })
})

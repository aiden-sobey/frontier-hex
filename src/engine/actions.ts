import {
  GameState, GameAction, ActionResult, GamePhase,
  vertexKey, edgeKey, hexKey,
  BuildSettlementAction, BuildRoadAction, BuildCityAction,
  RollDiceAction, BuyDevCardAction,
  PlayKnightAction, PlayRoadBuildingAction, PlayYearOfPlentyAction, PlayMonopolyAction,
  MoveRobberAction, StealResourceAction, DiscardResourcesAction,
  TradeBankAction, TradeOfferAction, TradeAcceptAction, TradeRejectAction,
  TradeConfirmAction, TradeCancelAction,
  EndTurnAction,
  SetupPlaceSettlementAction, SetupPlaceRoadAction,
  BuildingType,
} from './types'
import { SETTLEMENT_COST, ROAD_COST, CITY_COST, DEV_CARD_COST, RESOURCE_TYPES } from './constants'
import { isActionAllowedInPhase } from './phases'
import { hasResources } from './validators/helpers'
import { getTradeRatio } from './trade-ratios'

import * as buildSettlement from './validators/build-settlement'
import * as buildRoad from './validators/build-road'
import * as buildCity from './validators/build-city'
import * as rollDice from './validators/roll-dice'
import * as buyDevCard from './validators/buy-dev-card'
import * as playDevCard from './validators/play-dev-card'
import * as moveRobber from './validators/move-robber'
import * as stealResource from './validators/steal-resource'
import * as discard from './validators/discard'
import * as trade from './validators/trade'
import * as endTurn from './validators/end-turn'
import * as setupPlacement from './validators/setup-placement'

/**
 * Validate an action without applying it.
 * Returns null if valid, or an error string.
 */
export function validateAction(state: GameState, action: GameAction): string | null {
  if (state.phase === GamePhase.GameOver) {
    return 'Game is over'
  }

  switch (action.type) {
    case 'buildSettlement': return buildSettlement.validate(state, action)
    case 'buildRoad': return buildRoad.validate(state, action)
    case 'buildCity': return buildCity.validate(state, action)
    case 'rollDice': return rollDice.validate(state, action)
    case 'buyDevCard': return buyDevCard.validate(state, action)
    case 'playKnight': return playDevCard.validateKnight(state, action)
    case 'playRoadBuilding': return playDevCard.validateRoadBuilding(state, action)
    case 'playYearOfPlenty': return playDevCard.validateYearOfPlenty(state, action)
    case 'playMonopoly': return playDevCard.validateMonopoly(state, action)
    case 'moveRobber': return moveRobber.validate(state, action)
    case 'stealResource': return stealResource.validate(state, action)
    case 'discardResources': return discard.validate(state, action)
    case 'tradeBank': return trade.validateTradeBank(state, action)
    case 'tradeOffer': return trade.validateTradeOffer(state, action)
    case 'tradeAccept': return trade.validateTradeAccept(state, action)
    case 'tradeReject': return trade.validateTradeReject(state, action)
    case 'tradeConfirm': return trade.validateTradeConfirm(state, action)
    case 'tradeCancel': return trade.validateTradeCancel(state, action)
    case 'endTurn': return endTurn.validate(state, action)
    case 'setupPlaceSettlement': return setupPlacement.validateSetupSettlement(state, action)
    case 'setupPlaceRoad': return setupPlacement.validateSetupRoad(state, action)
    default: return 'Unknown action type'
  }
}

/**
 * Apply an action to the game state.
 * Returns a new state (immutable) and events.
 */
export function applyAction(state: GameState, action: GameAction): ActionResult {
  const error = validateAction(state, action)
  if (error) {
    return { valid: false, error, state, events: [] }
  }

  switch (action.type) {
    case 'buildSettlement': return buildSettlement.apply(state, action)
    case 'buildRoad': return buildRoad.apply(state, action)
    case 'buildCity': return buildCity.apply(state, action)
    case 'rollDice': return rollDice.apply(state, action)
    case 'buyDevCard': return buyDevCard.apply(state, action)
    case 'playKnight': return playDevCard.applyKnight(state, action)
    case 'playRoadBuilding': return playDevCard.applyRoadBuilding(state, action)
    case 'playYearOfPlenty': return playDevCard.applyYearOfPlenty(state, action)
    case 'playMonopoly': return playDevCard.applyMonopoly(state, action)
    case 'moveRobber': return moveRobber.apply(state, action)
    case 'stealResource': return stealResource.apply(state, action)
    case 'discardResources': return discard.apply(state, action)
    case 'tradeBank': return trade.applyTradeBank(state, action)
    case 'tradeOffer': return trade.applyTradeOffer(state, action)
    case 'tradeAccept': return trade.applyTradeAccept(state, action)
    case 'tradeReject': return trade.applyTradeReject(state, action)
    case 'tradeConfirm': return trade.applyTradeConfirm(state, action)
    case 'tradeCancel': return trade.applyTradeCancel(state, action)
    case 'endTurn': return endTurn.apply(state, action)
    case 'setupPlaceSettlement': return setupPlacement.applySetupSettlement(state, action)
    case 'setupPlaceRoad': return setupPlacement.applySetupRoad(state, action)
    default: return { valid: false, error: 'Unknown action type', state, events: [] }
  }
}

// ---- Location helpers ----

/**
 * Get all valid vertex locations where a player can build a settlement.
 */
export function getValidSettlementLocations(state: GameState, playerIndex: number): string[] {
  const isSetup = state.phase === GamePhase.SetupSettlement
  const results: string[] = []

  for (const v of state.boardGraph.vertices) {
    const vk = vertexKey(v)

    // Must be empty
    if (state.vertexBuildings[vk]) continue

    // Distance rule
    const adjVerts = state.boardGraph.vertexToVertices.get(vk)
    if (adjVerts) {
      let tooClose = false
      for (const av of adjVerts) {
        if (state.vertexBuildings[vertexKey(av)]) {
          tooClose = true
          break
        }
      }
      if (tooClose) continue
    }

    if (!isSetup) {
      // Must be adjacent to own road
      const adjEdges = state.boardGraph.vertexToEdges.get(vk)
      if (!adjEdges) continue
      let hasRoad = false
      for (const edge of adjEdges) {
        const ek = edgeKey(edge)
        const road = state.edgeRoads[ek]
        if (road && road.playerIndex === playerIndex) {
          hasRoad = true
          break
        }
      }
      if (!hasRoad) continue
    }

    results.push(vk)
  }

  return results
}

/**
 * Get all valid edge locations where a player can build a road.
 */
export function getValidRoadLocations(state: GameState, playerIndex: number): string[] {
  const results: string[] = []

  for (const e of state.boardGraph.edges) {
    const ek = edgeKey(e)

    // Must be empty
    if (state.edgeRoads[ek]) continue

    // Must connect to own road, settlement, or city
    const endpoints = state.boardGraph.edgeToVertices.get(ek)
    if (!endpoints) continue

    const [v1, v2] = endpoints
    const v1k = vertexKey(v1)
    const v2k = vertexKey(v2)

    let connected = false

    // Check buildings at endpoints
    for (const vk of [v1k, v2k]) {
      const building = state.vertexBuildings[vk]
      if (building && building.playerIndex === playerIndex) {
        connected = true
        break
      }
    }

    // Check roads at endpoints (blocked by opponent buildings)
    if (!connected) {
      for (const vk of [v1k, v2k]) {
        const building = state.vertexBuildings[vk]
        if (building && building.playerIndex !== playerIndex) continue

        const adjEdges = state.boardGraph.vertexToEdges.get(vk)
        if (adjEdges) {
          for (const adjEdge of adjEdges) {
            const aek = edgeKey(adjEdge)
            if (aek === ek) continue
            const road = state.edgeRoads[aek]
            if (road && road.playerIndex === playerIndex) {
              connected = true
              break
            }
          }
        }
        if (connected) break
      }
    }

    if (connected) {
      results.push(ek)
    }
  }

  return results
}

/**
 * Get all valid vertex locations where a player can upgrade to a city.
 */
export function getValidCityLocations(state: GameState, playerIndex: number): string[] {
  const results: string[] = []
  for (const [vk, building] of Object.entries(state.vertexBuildings)) {
    if (building.playerIndex === playerIndex && building.type === BuildingType.Settlement) {
      results.push(vk)
    }
  }
  return results
}

/**
 * Get all valid hex locations where the robber can be moved.
 */
export function getValidRobberLocations(state: GameState): string[] {
  const results: string[] = []
  for (const hex of state.boardGraph.hexes) {
    const hk = hexKey(hex)
    if (hk !== hexKey(state.robberHex)) {
      results.push(hk)
    }
  }
  return results
}

/**
 * Get all legal actions for a player in the current state.
 */
export function getLegalActions(state: GameState, playerIndex: number): GameAction[] {
  const actions: GameAction[] = []

  if (state.phase === GamePhase.GameOver) return actions

  // Discard is special: any affected player can do it
  if (state.phase === GamePhase.Discard) {
    if (state.playersNeedingToDiscard.includes(playerIndex)) {
      // We can't enumerate all possible discard combinations, so just indicate the action type
      // Callers will need to determine valid discard amounts
      actions.push({
        type: 'discardResources',
        playerIndex,
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
      } as any)
    }
    return actions
  }

  // Trade responses can come from non-current players
  if (state.phase === GamePhase.Main && state.pendingTrade) {
    if (playerIndex !== state.pendingTrade.fromPlayer) {
      if (!state.pendingTrade.responses[playerIndex]) {
        // Can accept or reject
        const acceptErr = trade.validateTradeAccept(state, { type: 'tradeAccept', playerIndex })
        if (!acceptErr) {
          actions.push({ type: 'tradeAccept', playerIndex })
        }
        actions.push({ type: 'tradeReject', playerIndex })
      }
    }
    return actions
  }

  // All other actions require being current player
  if (playerIndex !== state.currentPlayerIndex) return actions

  const player = state.players[playerIndex]

  switch (state.phase) {
    case GamePhase.SetupSettlement: {
      const locations = getValidSettlementLocations(state, playerIndex)
      for (const vk of locations) {
        actions.push({ type: 'setupPlaceSettlement', playerIndex, vertexKey: vk })
      }
      break
    }

    case GamePhase.SetupRoad: {
      // Road must be adjacent to last placed settlement
      for (const e of state.boardGraph.edges) {
        const ek = edgeKey(e)
        const err = setupPlacement.validateSetupRoad(state, { type: 'setupPlaceRoad', playerIndex, edgeKey: ek })
        if (!err) {
          actions.push({ type: 'setupPlaceRoad', playerIndex, edgeKey: ek })
        }
      }
      break
    }

    case GamePhase.PreRoll: {
      actions.push({ type: 'rollDice', playerIndex })

      // Can play knight before rolling
      if (!player.hasPlayedDevCardThisTurn &&
          player.developmentCards.includes('knight' as any)) {
        actions.push({ type: 'playKnight', playerIndex })
      }
      break
    }

    case GamePhase.MoveRobber: {
      const locations = getValidRobberLocations(state)
      for (const hk of locations) {
        const [q, r] = hk.split(',').map(Number)
        actions.push({ type: 'moveRobber', playerIndex, hex: { q, r } })
      }
      break
    }

    case GamePhase.StealResource: {
      if (state.robberStealTargets) {
        for (const target of state.robberStealTargets) {
          actions.push({ type: 'stealResource', playerIndex, targetPlayerIndex: target })
        }
      }
      break
    }

    case GamePhase.RoadBuilding: {
      for (const e of state.boardGraph.edges) {
        const ek = edgeKey(e)
        const err = buildRoad.validate(state, { type: 'buildRoad', playerIndex, edgeKey: ek })
        if (!err) {
          actions.push({ type: 'buildRoad', playerIndex, edgeKey: ek })
        }
      }
      break
    }

    case GamePhase.Main: {
      // Build settlement
      if (player.settlements > 0 && hasResources(player.resources, SETTLEMENT_COST)) {
        const locations = getValidSettlementLocations(state, playerIndex)
        for (const vk of locations) {
          actions.push({ type: 'buildSettlement', playerIndex, vertexKey: vk })
        }
      }

      // Build road
      if (player.roads > 0 && hasResources(player.resources, ROAD_COST)) {
        const locations = getValidRoadLocations(state, playerIndex)
        for (const ek of locations) {
          actions.push({ type: 'buildRoad', playerIndex, edgeKey: ek })
        }
      }

      // Build city
      if (player.cities > 0 && hasResources(player.resources, CITY_COST)) {
        const locations = getValidCityLocations(state, playerIndex)
        for (const vk of locations) {
          actions.push({ type: 'buildCity', playerIndex, vertexKey: vk })
        }
      }

      // Buy dev card
      if (hasResources(player.resources, DEV_CARD_COST) && state.devCardDeck.length > 0) {
        actions.push({ type: 'buyDevCard', playerIndex })
      }

      // Play dev cards
      if (!player.hasPlayedDevCardThisTurn) {
        if (player.developmentCards.includes('knight' as any)) {
          actions.push({ type: 'playKnight', playerIndex })
        }
        if (player.developmentCards.includes('roadBuilding' as any) && player.roads > 0) {
          actions.push({ type: 'playRoadBuilding', playerIndex })
        }
        if (player.developmentCards.includes('yearOfPlenty' as any)) {
          // Would need resource choices - just add one placeholder
          for (const r1 of RESOURCE_TYPES) {
            for (const r2 of RESOURCE_TYPES) {
              actions.push({ type: 'playYearOfPlenty', playerIndex, resource1: r1, resource2: r2 })
            }
          }
        }
        if (player.developmentCards.includes('monopoly' as any)) {
          for (const r of RESOURCE_TYPES) {
            actions.push({ type: 'playMonopoly', playerIndex, resource: r })
          }
        }
      }

      // Bank trades
      if (!state.pendingTrade) {
        for (const give of RESOURCE_TYPES) {
          const ratio = getTradeRatio(state, playerIndex, give)
          if (player.resources[give] >= ratio) {
            for (const receive of RESOURCE_TYPES) {
              if (give !== receive) {
                actions.push({ type: 'tradeBank', playerIndex, give, receive })
              }
            }
          }
        }
      }

      // End turn
      actions.push({ type: 'endTurn', playerIndex })

      break
    }
  }

  return actions
}

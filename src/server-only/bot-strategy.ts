import type { GameState, GameAction, ResourceBundle, AxialCoord } from '../engine/types';
import {
  GamePhase,
  DevelopmentCardType,
  BuildingType,
  ResourceType,
  hexKey,
  vertexKey,
  edgeKey,
} from '../engine/types';
import {
  pips,
  RESOURCE_TYPES,
  TERRAIN_TO_RESOURCE,
  SETTLEMENT_COST,
  CITY_COST,
  ROAD_COST,
  DEV_CARD_COST,
  EMPTY_RESOURCES,
} from '../engine/constants';
import {
  getLegalActions,
  getValidSettlementLocations,
  getValidRoadLocations,
  getValidCityLocations,
  getValidRobberLocations,
} from '../engine/actions';
import { getTradeRatio } from '../engine/trade-ratios';
import { calculateVictoryPoints } from '../engine/victory';
import { hasResources, totalResources } from '../engine/validators/helpers';

/**
 * Interface for bot decision-making strategy.
 * All decisions are based solely on the current GameState (stateless).
 */
export interface BotStrategy {
  /** Choose the best action from the current game state */
  chooseAction(state: GameState, playerIndex: number): GameAction | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Score a vertex by pip count of adjacent hexes */
function scoreVertex(state: GameState, vk: string): number {
  const adjHexes = state.boardGraph.vertexToHexes.get(vk);
  if (!adjHexes) return 0;
  let score = 0;
  for (const hex of adjHexes) {
    const tile = state.hexTiles.find((t) => t.coord.q === hex.q && t.coord.r === hex.r);
    if (tile && tile.numberToken !== null) {
      score += pips(tile.numberToken);
    }
  }
  return score;
}

/** Count distinct resource types accessible from a vertex */
function vertexResourceDiversity(state: GameState, vk: string): number {
  const adjHexes = state.boardGraph.vertexToHexes.get(vk);
  if (!adjHexes) return 0;
  const resources = new Set<ResourceType>();
  for (const hex of adjHexes) {
    const tile = state.hexTiles.find((t) => t.coord.q === hex.q && t.coord.r === hex.r);
    if (tile) {
      const res = TERRAIN_TO_RESOURCE[tile.terrain];
      if (res) resources.add(res);
    }
  }
  return resources.size;
}

/** Check if a vertex is adjacent to any port */
function isAdjacentToPort(state: GameState, vk: string): boolean {
  for (const port of state.ports) {
    if (port.vertices.includes(vk)) return true;
  }
  return false;
}

/**
 * Composite score for a settlement vertex.
 * Higher is better.
 */
function scoreSettlementVertex(state: GameState, vk: string): number {
  let score = scoreVertex(state, vk) * 3; // pip value weighted heavily
  score += vertexResourceDiversity(state, vk) * 2; // diversity bonus
  if (isAdjacentToPort(state, vk)) score += 3; // port bonus
  return score;
}

/**
 * Score a hex for robber placement from the perspective of a given player.
 * Prefer hexes with many opponent buildings and high pip value.
 * Avoid hexes with own buildings.
 */
function scoreRobberHex(state: GameState, hex: AxialCoord, playerIndex: number): number {
  const hk = hexKey(hex);
  const hexVerts = state.boardGraph.hexToVertices.get(hk);
  if (!hexVerts) return -Infinity;

  const tile = state.hexTiles.find((t) => t.coord.q === hex.q && t.coord.r === hex.r);
  const pipValue = tile && tile.numberToken !== null ? pips(tile.numberToken) : 0;

  let opponentBuildingCount = 0;
  let ownBuildingCount = 0;

  for (const v of hexVerts) {
    const vk = vertexKey(v);
    const building = state.vertexBuildings[vk];
    if (building) {
      if (building.playerIndex === playerIndex) {
        ownBuildingCount++;
      } else {
        opponentBuildingCount += building.type === BuildingType.City ? 2 : 1;
      }
    }
  }

  // Strongly avoid hexes with own buildings
  if (ownBuildingCount > 0) return -100;

  return opponentBuildingCount * 5 + pipValue;
}

/** Determine which resource the bot needs most for a given goal */
function getMostNeededResource(
  resources: ResourceBundle,
  goal: ResourceBundle,
): ResourceType | null {
  let maxDeficit = 0;
  let neededResource: ResourceType | null = null;
  for (const r of RESOURCE_TYPES) {
    const deficit = goal[r] - resources[r];
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      neededResource = r;
    }
  }
  return neededResource;
}

/** Find which resource the bot has the most of (and can trade away) */
function getMostExcessResource(state: GameState, playerIndex: number): ResourceType | null {
  const player = state.players[playerIndex];
  let maxExcess = 0;
  let excessResource: ResourceType | null = null;
  for (const r of RESOURCE_TYPES) {
    const ratio = getTradeRatio(state, playerIndex, r);
    if (player.resources[r] >= ratio && player.resources[r] > maxExcess) {
      maxExcess = player.resources[r];
      excessResource = r;
    }
  }
  return excessResource;
}

// ---------------------------------------------------------------------------
// BasicBotStrategy
// ---------------------------------------------------------------------------

export class BasicBotStrategy implements BotStrategy {
  chooseAction(state: GameState, playerIndex: number): GameAction | null {
    switch (state.phase) {
      case GamePhase.SetupSettlement:
        return this.chooseSetupSettlement(state, playerIndex);
      case GamePhase.SetupRoad:
        return this.chooseSetupRoad(state, playerIndex);
      case GamePhase.PreRoll:
        return this.choosePreRoll(state, playerIndex);
      case GamePhase.Discard:
        return this.chooseDiscard(state, playerIndex);
      case GamePhase.MoveRobber:
        return this.chooseMoveRobber(state, playerIndex);
      case GamePhase.StealResource:
        return this.chooseStealResource(state, playerIndex);
      case GamePhase.Main:
        return this.chooseMainAction(state, playerIndex);
      case GamePhase.RoadBuilding:
        return this.chooseRoadBuildingAction(state, playerIndex);
      case GamePhase.GameOver:
        return null;
      default:
        return this.fallback(state, playerIndex);
    }
  }

  // ---- Setup Settlement ----

  private chooseSetupSettlement(state: GameState, playerIndex: number): GameAction | null {
    const locations = getValidSettlementLocations(state, playerIndex);
    if (locations.length === 0) return this.fallback(state, playerIndex);

    // Score each location and pick the best
    let bestVk = locations[0];
    let bestScore = -Infinity;
    for (const vk of locations) {
      const score = scoreSettlementVertex(state, vk);
      if (score > bestScore) {
        bestScore = score;
        bestVk = vk;
      }
    }

    return { type: 'setupPlaceSettlement', playerIndex, vertexKey: bestVk };
  }

  // ---- Setup Road ----

  private chooseSetupRoad(state: GameState, playerIndex: number): GameAction | null {
    const legal = getLegalActions(state, playerIndex);
    const roadActions = legal.filter((a) => a.type === 'setupPlaceRoad');
    if (roadActions.length === 0) return this.fallback(state, playerIndex);

    // Find all unoccupied vertices and score them
    // Pick the road that leads toward the highest-scoring unoccupied vertex
    let bestAction = roadActions[0];
    let bestScore = -Infinity;

    for (const action of roadActions) {
      if (action.type !== 'setupPlaceRoad') continue;
      const endpoints = state.boardGraph.edgeToVertices.get(action.edgeKey);
      if (!endpoints) continue;

      // For each endpoint of this road, check the vertices it leads to
      for (const endpoint of endpoints) {
        const epk = vertexKey(endpoint);
        // Skip the endpoint that is the settlement (it already has a building)
        if (state.vertexBuildings[epk]) continue;

        // Score the distant vertex (where this road points toward)
        const score = scoreSettlementVertex(state, epk);
        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      }
    }

    return bestAction;
  }

  // ---- PreRoll ----

  private choosePreRoll(state: GameState, playerIndex: number): GameAction | null {
    const player = state.players[playerIndex];

    // Consider playing a knight if:
    // 1. The robber is on a hex adjacent to one of our buildings
    // 2. Or we want to build largest army
    if (
      !player.hasPlayedDevCardThisTurn &&
      player.developmentCards.includes(DevelopmentCardType.Knight)
    ) {
      const robberHk = hexKey(state.robberHex);
      const robberVerts = state.boardGraph.hexToVertices.get(robberHk);

      let robberOnOwnHex = false;
      if (robberVerts) {
        for (const v of robberVerts) {
          const building = state.vertexBuildings[vertexKey(v)];
          if (building && building.playerIndex === playerIndex) {
            robberOnOwnHex = true;
            break;
          }
        }
      }

      if (robberOnOwnHex) {
        return { type: 'playKnight', playerIndex };
      }
    }

    // Otherwise, just roll dice
    return { type: 'rollDice', playerIndex };
  }

  // ---- Discard ----

  private chooseDiscard(state: GameState, playerIndex: number): GameAction | null {
    const player = state.players[playerIndex];
    const handSize = totalResources(player.resources);
    const mustDiscard = Math.floor(handSize / 2);

    if (mustDiscard <= 0) return this.fallback(state, playerIndex);

    // Build a priority of what to keep:
    // Cities need wheat + ore, settlements need all 4, roads need wood + brick
    // Keep the resources that are most useful for cities > settlements > roads
    const keepPriority: Record<ResourceType, number> = {
      [ResourceType.Ore]: 5, // city priority
      [ResourceType.Wheat]: 4, // city + settlement
      [ResourceType.Sheep]: 2, // settlement + dev card
      [ResourceType.Brick]: 2, // settlement + road
      [ResourceType.Wood]: 2, // settlement + road
    };

    // Create a list of all resources the player has, sorted by keep priority (ascending = discard first)
    const resourceList: ResourceType[] = [];
    for (const r of RESOURCE_TYPES) {
      for (let i = 0; i < player.resources[r]; i++) {
        resourceList.push(r);
      }
    }

    // Sort ascending by priority (lowest priority = discard first)
    resourceList.sort((a, b) => keepPriority[a] - keepPriority[b]);

    // Discard the first `mustDiscard` resources (lowest priority ones)
    const discardBundle: ResourceBundle = { ...EMPTY_RESOURCES };
    for (let i = 0; i < mustDiscard && i < resourceList.length; i++) {
      discardBundle[resourceList[i]]++;
    }

    return {
      type: 'discardResources',
      playerIndex,
      resources: discardBundle,
    };
  }

  // ---- MoveRobber ----

  private chooseMoveRobber(state: GameState, playerIndex: number): GameAction | null {
    const locations = getValidRobberLocations(state);
    if (locations.length === 0) return this.fallback(state, playerIndex);

    let bestHex: AxialCoord | null = null;
    let bestScore = -Infinity;

    for (const hk of locations) {
      const [q, r] = hk.split(',').map(Number);
      const hex: AxialCoord = { q, r };
      const score = scoreRobberHex(state, hex, playerIndex);
      if (score > bestScore) {
        bestScore = score;
        bestHex = hex;
      }
    }

    if (!bestHex) return this.fallback(state, playerIndex);

    return { type: 'moveRobber', playerIndex, hex: bestHex };
  }

  // ---- StealResource ----

  private chooseStealResource(state: GameState, playerIndex: number): GameAction | null {
    if (!state.robberStealTargets || state.robberStealTargets.length === 0) {
      return this.fallback(state, playerIndex);
    }

    // Steal from the player with the most victory points, breaking ties by most resources
    let bestTarget = state.robberStealTargets[0];
    let bestVP = -1;
    let bestResCount = -1;

    for (const target of state.robberStealTargets) {
      const vp = calculateVictoryPoints(state, target);
      const resCount = totalResources(state.players[target].resources);
      if (vp > bestVP || (vp === bestVP && resCount > bestResCount)) {
        bestVP = vp;
        bestResCount = resCount;
        bestTarget = target;
      }
    }

    return { type: 'stealResource', playerIndex, targetPlayerIndex: bestTarget };
  }

  // ---- Main Phase ----

  private chooseMainAction(state: GameState, playerIndex: number): GameAction | null {
    const player = state.players[playerIndex];

    // If there's a pending trade from another player, evaluate it
    if (state.pendingTrade && state.pendingTrade.fromPlayer !== playerIndex) {
      if (!state.pendingTrade.responses[playerIndex]) {
        return this.shouldAcceptTrade(state, playerIndex)
          ? { type: 'tradeAccept', playerIndex }
          : { type: 'tradeReject', playerIndex };
      }
      return null;
    }

    // If there's a pending trade from us, cancel it (we shouldn't have created it)
    if (state.pendingTrade && state.pendingTrade.fromPlayer === playerIndex) {
      return { type: 'tradeCancel', playerIndex };
    }

    // 1. Build city if affordable
    if (hasResources(player.resources, CITY_COST)) {
      const locations = getValidCityLocations(state, playerIndex);
      if (locations.length > 0) {
        // Pick the city location with highest pip score
        let bestVk = locations[0];
        let bestScore = -Infinity;
        for (const vk of locations) {
          const score = scoreVertex(state, vk);
          if (score > bestScore) {
            bestScore = score;
            bestVk = vk;
          }
        }
        return { type: 'buildCity', playerIndex, vertexKey: bestVk };
      }
    }

    // 2. Build settlement if affordable
    if (player.settlements > 0 && hasResources(player.resources, SETTLEMENT_COST)) {
      const locations = getValidSettlementLocations(state, playerIndex);
      if (locations.length > 0) {
        let bestVk = locations[0];
        let bestScore = -Infinity;
        for (const vk of locations) {
          const score = scoreSettlementVertex(state, vk);
          if (score > bestScore) {
            bestScore = score;
            bestVk = vk;
          }
        }
        return { type: 'buildSettlement', playerIndex, vertexKey: bestVk };
      }
    }

    // 3. Build road if affordable and expands toward good spots
    if (player.roads > 0 && hasResources(player.resources, ROAD_COST)) {
      const locations = getValidRoadLocations(state, playerIndex);
      if (locations.length > 0) {
        // Pick road that leads toward best unoccupied settlement vertex
        let bestEk = locations[0];
        let bestScore = -Infinity;
        for (const ek of locations) {
          const endpoints = state.boardGraph.edgeToVertices.get(ek);
          if (!endpoints) continue;
          for (const endpoint of endpoints) {
            const epk = vertexKey(endpoint);
            if (state.vertexBuildings[epk]) continue;
            // Check distance rule for potential settlement
            const adjVerts = state.boardGraph.vertexToVertices.get(epk);
            let blocked = false;
            if (adjVerts) {
              for (const av of adjVerts) {
                if (state.vertexBuildings[vertexKey(av)]) {
                  blocked = true;
                  break;
                }
              }
            }
            if (blocked) continue;
            const score = scoreSettlementVertex(state, epk);
            if (score > bestScore) {
              bestScore = score;
              bestEk = ek;
            }
          }
        }
        return { type: 'buildRoad', playerIndex, edgeKey: bestEk };
      }
    }

    // 4. Buy dev card if affordable and deck not empty
    if (hasResources(player.resources, DEV_CARD_COST) && state.devCardDeck.length > 0) {
      return { type: 'buyDevCard', playerIndex };
    }

    // 5. Play development cards if beneficial
    if (!player.hasPlayedDevCardThisTurn) {
      const devAction = this.chooseDevCardPlay(state, playerIndex);
      if (devAction) return devAction;
    }

    // 6. Bank trade: trade excess resources for needed resources
    const tradeAction = this.chooseBankTrade(state, playerIndex);
    if (tradeAction) return tradeAction;

    // 7. End turn
    return { type: 'endTurn', playerIndex };
  }

  // ---- Trade Evaluation ----

  private shouldAcceptTrade(state: GameState, playerIndex: number): boolean {
    const trade = state.pendingTrade!;
    const player = state.players[playerIndex];

    // From bot's perspective: we receive what the offerer is offering,
    // and give what the offerer is requesting
    const receiving = trade.offering;
    const giving = trade.requesting;

    // Must have the resources to give
    if (!hasResources(player.resources, giving)) return false;

    // Value each resource by how much the bot needs it.
    // Check goals in priority order; first goal with a deficit determines need score.
    const goals = [CITY_COST, SETTLEMENT_COST, DEV_CARD_COST, ROAD_COST];

    const needScore = (r: ResourceType): number => {
      for (const goal of goals) {
        if (goal[r] > player.resources[r]) {
          return goal[r] - player.resources[r];
        }
      }
      return 0;
    };

    // Score = count * (1 + needScore). Base value of 1 per resource ensures
    // raw card count still matters even for unneeded resources.
    let receiveValue = 0;
    let giveValue = 0;
    for (const r of RESOURCE_TYPES) {
      receiveValue += receiving[r] * (1 + needScore(r));
      giveValue += giving[r] * (1 + needScore(r));
    }

    // Lenient: accept if value received >= 60% of value given
    return receiveValue >= giveValue * 0.6;
  }

  // ---- Dev Card Play ----

  private chooseDevCardPlay(state: GameState, playerIndex: number): GameAction | null {
    const player = state.players[playerIndex];

    // Knight: move robber off own hex or onto opponent
    if (player.developmentCards.includes(DevelopmentCardType.Knight)) {
      return { type: 'playKnight', playerIndex };
    }

    // Road Building: play if we have roads to place
    if (player.developmentCards.includes(DevelopmentCardType.RoadBuilding) && player.roads > 0) {
      const roadLocations = getValidRoadLocations(state, playerIndex);
      if (roadLocations.length > 0) {
        return { type: 'playRoadBuilding', playerIndex };
      }
    }

    // Year of Plenty: take the two resources most needed
    if (player.developmentCards.includes(DevelopmentCardType.YearOfPlenty)) {
      // Figure out what we need most
      const needed1 =
        getMostNeededResource(player.resources, CITY_COST) ??
        getMostNeededResource(player.resources, SETTLEMENT_COST) ??
        ResourceType.Wheat;
      const needed2 =
        getMostNeededResource(player.resources, CITY_COST) ??
        getMostNeededResource(player.resources, SETTLEMENT_COST) ??
        ResourceType.Ore;
      return {
        type: 'playYearOfPlenty',
        playerIndex,
        resource1: needed1,
        resource2: needed2 !== needed1 ? needed2 : ResourceType.Ore,
      };
    }

    // Monopoly: take the resource opponents have most of
    if (player.developmentCards.includes(DevelopmentCardType.Monopoly)) {
      let bestResource = ResourceType.Wheat;
      let bestCount = 0;
      for (const r of RESOURCE_TYPES) {
        let opponentTotal = 0;
        for (let i = 0; i < state.players.length; i++) {
          if (i === playerIndex) continue;
          opponentTotal += state.players[i].resources[r];
        }
        if (opponentTotal > bestCount) {
          bestCount = opponentTotal;
          bestResource = r;
        }
      }
      if (bestCount > 0) {
        return { type: 'playMonopoly', playerIndex, resource: bestResource };
      }
    }

    return null;
  }

  // ---- Bank Trade ----

  private chooseBankTrade(state: GameState, playerIndex: number): GameAction | null {
    const player = state.players[playerIndex];

    // Only trade if it would bring us closer to affording something.
    // Try each goal in priority order: city, settlement, dev card, road
    const goals: ResourceBundle[] = [CITY_COST, SETTLEMENT_COST, DEV_CARD_COST, ROAD_COST];

    for (const goal of goals) {
      const neededResource = getMostNeededResource(player.resources, goal);
      if (!neededResource) continue; // Already have enough for this goal

      // Find a resource we can trade away that isn't needed for this goal
      for (const giveRes of RESOURCE_TYPES) {
        if (giveRes === neededResource) continue;
        const ratio = getTradeRatio(state, playerIndex, giveRes);
        // Only trade if we have enough to trade AND we'll still have enough of
        // this resource for our goal after trading
        const haveAfterTrade = player.resources[giveRes] - ratio;
        if (player.resources[giveRes] >= ratio && haveAfterTrade >= goal[giveRes]) {
          return { type: 'tradeBank', playerIndex, give: giveRes, receive: neededResource };
        }
      }
    }

    return null;
  }

  // ---- RoadBuilding Phase ----

  private chooseRoadBuildingAction(state: GameState, playerIndex: number): GameAction | null {
    const legal = getLegalActions(state, playerIndex);
    const roadActions = legal.filter((a) => a.type === 'buildRoad');
    if (roadActions.length === 0) return this.fallback(state, playerIndex);

    // Pick road toward best expansion
    let bestAction = roadActions[0];
    let bestScore = -Infinity;

    for (const action of roadActions) {
      if (action.type !== 'buildRoad') continue;
      const endpoints = state.boardGraph.edgeToVertices.get(action.edgeKey);
      if (!endpoints) continue;

      for (const endpoint of endpoints) {
        const epk = vertexKey(endpoint);
        if (state.vertexBuildings[epk]) continue;
        const score = scoreSettlementVertex(state, epk);
        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      }
    }

    return bestAction;
  }

  // ---- Fallback ----

  /**
   * Fallback: return the first legal action.
   * This ensures the bot never deadlocks.
   */
  private fallback(state: GameState, playerIndex: number): GameAction | null {
    const legal = getLegalActions(state, playerIndex);
    if (legal.length === 0) return null;

    // For discard phase, we need to build a proper discard bundle
    if (state.phase === GamePhase.Discard) {
      return this.chooseDiscard(state, playerIndex);
    }

    return legal[0];
  }
}

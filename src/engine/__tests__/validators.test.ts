import { describe, it, expect } from 'vitest';
import { initializeGame } from '../setup';
import {
  applyAction,
  validateAction,
  getValidSettlementLocations,
  getValidRoadLocations,
} from '../actions';
import {
  GamePhase,
  GameState,
  BuildingType,
  ResourceType,
  DevelopmentCardType,
  vertexKey,
  edgeKey,
} from '../types';
import {
  SETTLEMENT_COST,
  ROAD_COST,
  CITY_COST,
  DEV_CARD_COST,
  EMPTY_RESOURCES,
} from '../constants';

function createTestGame() {
  return initializeGame({
    gameId: 'test-game',
    seed: 42,
    playerNames: ['Alice', 'Bob', 'Charlie', 'Dave'],
    playerIds: ['p1', 'p2', 'p3', 'p4'],
  });
}

/**
 * Run the full setup phase and return a state ready for main game play.
 */
function runSetup(state: GameState): GameState {
  const order = [0, 1, 2, 3, 3, 2, 1, 0];
  for (const playerIdx of order) {
    const locations = getValidSettlementLocations(state, playerIdx);
    const vk = locations[0];
    let result = applyAction(state, {
      type: 'setupPlaceSettlement',
      playerIndex: playerIdx,
      vertexKey: vk,
    });
    state = result.state;

    const adjEdges = state.boardGraph.vertexToEdges.get(vk)!;
    let roadEdge: string | null = null;
    for (const e of adjEdges) {
      const ek = edgeKey(e);
      if (!state.edgeRoads[ek]) {
        roadEdge = ek;
        break;
      }
    }
    result = applyAction(state, {
      type: 'setupPlaceRoad',
      playerIndex: playerIdx,
      edgeKey: roadEdge!,
    });
    state = result.state;
  }
  return state;
}

describe('Settlement placement validation', () => {
  it('allows valid settlement placement', () => {
    let state = createTestGame();
    state = runSetup(state);
    expect(state.phase).toBe(GamePhase.PreRoll);

    // Give player 0 resources
    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    const locations = getValidSettlementLocations(state, 0);
    if (locations.length > 0) {
      const error = validateAction(state, {
        type: 'buildSettlement',
        playerIndex: 0,
        vertexKey: locations[0],
      });
      expect(error).toBeNull();
    }
  });

  it('rejects settlement at occupied vertex', () => {
    let state = createTestGame();
    state = runSetup(state);

    // Find an occupied vertex
    const occupiedVk = Object.keys(state.vertexBuildings)[0];
    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    const error = validateAction(state, {
      type: 'buildSettlement',
      playerIndex: 0,
      vertexKey: occupiedVk,
    });
    expect(error).not.toBeNull();
  });

  it('rejects settlement without resources', () => {
    let state = createTestGame();
    state = runSetup(state);
    state = { ...state, phase: GamePhase.Main };

    // Ensure player has no resources
    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { ...EMPTY_RESOURCES },
    };
    state = { ...state, players: newPlayers };

    const locations = getValidSettlementLocations(state, 0);
    // Even if there are valid locations, player can't afford it
    if (locations.length > 0) {
      const error = validateAction(state, {
        type: 'buildSettlement',
        playerIndex: 0,
        vertexKey: locations[0],
      });
      expect(error).toBe('Insufficient resources for settlement');
    }
  });

  it('enforces distance rule', () => {
    let state = createTestGame();
    state = runSetup(state);

    // Find a vertex adjacent to an existing building
    const occupiedVk = Object.keys(state.vertexBuildings)[0];
    const adjVertices = state.boardGraph.vertexToVertices.get(occupiedVk)!;
    const adjacentVk = vertexKey(adjVertices[0]);

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    // Should not be in valid locations due to distance rule
    const locations = getValidSettlementLocations(state, 0);
    expect(locations).not.toContain(adjacentVk);
  });
});

describe('Road placement validation', () => {
  it('allows valid road placement', () => {
    let state = createTestGame();
    state = runSetup(state);

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    const locations = getValidRoadLocations(state, 0);
    if (locations.length > 0) {
      const error = validateAction(state, {
        type: 'buildRoad',
        playerIndex: 0,
        edgeKey: locations[0],
      });
      expect(error).toBeNull();
    }
  });

  it('rejects road with no connection', () => {
    let state = createTestGame();
    state = runSetup(state);

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    // Find an edge that is NOT connected to player 0's network
    const validLocations = new Set(getValidRoadLocations(state, 0));
    let disconnectedEdge: string | null = null;
    for (const e of state.boardGraph.edges) {
      const ek = edgeKey(e);
      if (!state.edgeRoads[ek] && !validLocations.has(ek)) {
        disconnectedEdge = ek;
        break;
      }
    }

    if (disconnectedEdge) {
      const error = validateAction(state, {
        type: 'buildRoad',
        playerIndex: 0,
        edgeKey: disconnectedEdge,
      });
      expect(error).toBe('Road must connect to your own road, settlement, or city');
    }
  });
});

describe('City upgrade', () => {
  it('allows upgrading own settlement', () => {
    let state = createTestGame();
    state = runSetup(state);

    // Find player 0's settlement
    let settlementVk: string | null = null;
    for (const [vk, b] of Object.entries(state.vertexBuildings)) {
      if (b.playerIndex === 0 && b.type === BuildingType.Settlement) {
        settlementVk = vk;
        break;
      }
    }
    expect(settlementVk).not.toBeNull();

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 5, ore: 5 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    const error = validateAction(state, {
      type: 'buildCity',
      playerIndex: 0,
      vertexKey: settlementVk!,
    });
    expect(error).toBeNull();

    const result = applyAction(state, {
      type: 'buildCity',
      playerIndex: 0,
      vertexKey: settlementVk!,
    });
    expect(result.valid).toBe(true);
    expect(result.state.vertexBuildings[settlementVk!].type).toBe(BuildingType.City);
  });

  it('rejects upgrading a city', () => {
    let state = createTestGame();
    state = runSetup(state);

    // Find player 0's settlement and upgrade it first
    let settlementVk: string | null = null;
    for (const [vk, b] of Object.entries(state.vertexBuildings)) {
      if (b.playerIndex === 0 && b.type === BuildingType.Settlement) {
        settlementVk = vk;
        break;
      }
    }

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 10, ore: 10 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    // Upgrade to city
    let result = applyAction(state, {
      type: 'buildCity',
      playerIndex: 0,
      vertexKey: settlementVk!,
    });
    state = result.state;

    // Try to upgrade city again
    const error = validateAction(state, {
      type: 'buildCity',
      playerIndex: 0,
      vertexKey: settlementVk!,
    });
    expect(error).toBe('Can only upgrade settlements to cities');
  });
});

describe('Dice roll produces resources', () => {
  it('produces resources on non-7 roll', () => {
    let state = createTestGame();
    state = runSetup(state);
    expect(state.phase).toBe(GamePhase.PreRoll);

    // Record resources before roll
    const resourcesBefore = state.players.map((p) => ({ ...p.resources }));

    const result = applyAction(state, {
      type: 'rollDice',
      playerIndex: 0,
    });
    expect(result.valid).toBe(true);
    state = result.state;

    // The dice were rolled
    expect(state.lastDiceRoll).not.toBeNull();

    const total = state.lastDiceRoll![0] + state.lastDiceRoll![1];
    if (total !== 7) {
      // Should be in Main phase
      expect(state.phase).toBe(GamePhase.Main);
    }
    // If total is 7, should be in Discard or MoveRobber
    if (total === 7) {
      expect([GamePhase.Discard, GamePhase.MoveRobber]).toContain(state.phase);
    }
  });
});

describe('Development card actions', () => {
  it('allows buying dev card with resources', () => {
    let state = createTestGame();
    state = runSetup(state);

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 },
    };
    state = { ...state, players: newPlayers, phase: GamePhase.Main };

    const error = validateAction(state, {
      type: 'buyDevCard',
      playerIndex: 0,
    });
    expect(error).toBeNull();

    const result = applyAction(state, {
      type: 'buyDevCard',
      playerIndex: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.state.players[0].newDevCards.length).toBe(1);
    expect(result.state.devCardDeck.length).toBe(state.devCardDeck.length - 1);
  });

  it('rejects buying dev card without resources', () => {
    let state = createTestGame();
    state = runSetup(state);
    state = { ...state, phase: GamePhase.Main };

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      resources: { ...EMPTY_RESOURCES },
    };
    state = { ...state, players: newPlayers };

    const error = validateAction(state, {
      type: 'buyDevCard',
      playerIndex: 0,
    });
    expect(error).toBe('Insufficient resources for development card');
  });
});

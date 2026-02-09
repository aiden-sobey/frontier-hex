import { describe, it, expect } from 'vitest';
import { initializeGame } from '../setup';
import { calculateLongestRoad, updateLongestRoad } from '../longest-road';
import { GameState, BuildingType, vertexKey, edgeKey } from '../types';

function createTestGame() {
  return initializeGame({
    gameId: 'test-game',
    seed: 42,
    playerNames: ['Alice', 'Bob', 'Charlie', 'Dave'],
    playerIds: ['p1', 'p2', 'p3', 'p4'],
  });
}

/**
 * Place a road at a given edge for a player.
 */
function placeRoad(state: GameState, ek: string, playerIndex: number): GameState {
  return {
    ...state,
    edgeRoads: {
      ...state.edgeRoads,
      [ek]: { playerIndex },
    },
  };
}

/**
 * Place a building at a vertex.
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
  };
}

describe('Longest road calculation', () => {
  it('returns 0 when player has no roads', () => {
    const state = createTestGame();
    expect(calculateLongestRoad(state, 0)).toBe(0);
  });

  it('counts a simple chain of roads', () => {
    let state = createTestGame();

    // Build a chain of connected roads for player 0
    // Use edges along a hex: pick hex (0,0) and build along its edges
    const hexEdgesMap = state.boardGraph.hexToVertices.get('0,0')!;
    const hexVertexKeys = hexEdgesMap.map(vertexKey);

    // Get edges of hex (0,0)
    // NE edge: 0,0,NE connects vertices (0,0,N) and (1,-1,S)
    // E edge: 0,0,E connects vertices (1,-1,S) and (0,1,N)
    // SE edge: 0,0,SE connects vertices (0,1,N) and (0,0,S)

    state = placeRoad(state, '0,0,NE', 0); // road 1
    state = placeRoad(state, '0,0,E', 0); // road 2
    state = placeRoad(state, '0,0,SE', 0); // road 3

    const length = calculateLongestRoad(state, 0);
    expect(length).toBe(3);
  });

  it('handles a longer chain across multiple hexes', () => {
    let state = createTestGame();

    // Build a 5-edge chain:
    // (0,0,N) --[0,0,NE]--> (1,-1,S) --[0,0,E]--> (0,1,N) --[0,0,SE]--> (0,0,S)
    //          --[-1,1,NE]--> (-1,1,N) --[-1,0,SE]--> (-1,0,S)
    state = placeRoad(state, '0,0,NE', 0);
    state = placeRoad(state, '0,0,E', 0);
    state = placeRoad(state, '0,0,SE', 0);
    state = placeRoad(state, '-1,1,NE', 0);
    state = placeRoad(state, '-1,0,SE', 0);

    const length = calculateLongestRoad(state, 0);
    expect(length).toBe(5);
  });

  it('opponent building breaks the road', () => {
    let state = createTestGame();

    // Build a chain for player 0
    // Edges: (0,0,NE) -> (0,0,E) -> (0,0,SE)
    // Vertices along this chain: (0,0,N) -- (1,-1,S) -- (0,1,N) -- (0,0,S)
    state = placeRoad(state, '0,0,NE', 0); // vertex N -> vertex NE
    state = placeRoad(state, '0,0,E', 0); // vertex NE -> vertex SE
    state = placeRoad(state, '0,0,SE', 0); // vertex SE -> vertex S

    // Without building: longest road should be 3
    expect(calculateLongestRoad(state, 0)).toBe(3);

    // Place opponent building at the middle vertex (1,-1,S)
    // This should break the chain into two segments of 1 each
    state = placeBuilding(state, '1,-1,S', 1, BuildingType.Settlement);

    const length = calculateLongestRoad(state, 0);
    // The chain is now broken: road NE (1 segment ending at opponent building)
    // and roads E+SE (but these also start from the opponent building)
    // Actually: from N -> NE is 1 (blocked by opponent at NE)
    // from S -> SE is 1 edge, SE -> NE is 1 edge but blocked by opponent at NE
    // So from S side: S -> (0,1,N) via SE edge, then (0,1,N) -> (1,-1,S) via E edge but blocked
    // = 2 from the S side
    expect(length).toBe(2);
  });

  it('does not count opponent roads', () => {
    let state = createTestGame();

    state = placeRoad(state, '0,0,NE', 0);
    state = placeRoad(state, '0,0,E', 1); // opponent's road

    expect(calculateLongestRoad(state, 0)).toBe(1);
    expect(calculateLongestRoad(state, 1)).toBe(1);
  });
});

describe('updateLongestRoad', () => {
  it('awards longest road when player reaches 5', () => {
    let state = createTestGame();

    // Build 5 connected roads for player 0 in a chain:
    // (0,0,N) --[0,0,NE]--> (1,-1,S) --[0,0,E]--> (0,1,N) --[0,0,SE]--> (0,0,S)
    //          --[-1,1,NE]--> (-1,1,N) --[-1,0,SE]--> (-1,0,S)
    state = placeRoad(state, '0,0,NE', 0);
    state = placeRoad(state, '0,0,E', 0);
    state = placeRoad(state, '0,0,SE', 0);
    state = placeRoad(state, '-1,1,NE', 0);
    state = placeRoad(state, '-1,0,SE', 0);

    state = updateLongestRoad(state);
    expect(state.longestRoadPlayer).toBe(0);
    expect(state.longestRoadLength).toBe(5);
  });

  it('does not award longest road below minimum of 5', () => {
    let state = createTestGame();

    state = placeRoad(state, '0,0,NE', 0);
    state = placeRoad(state, '0,0,E', 0);
    state = placeRoad(state, '0,0,SE', 0);
    state = placeRoad(state, '-1,1,NE', 0);

    state = updateLongestRoad(state);
    expect(state.longestRoadPlayer).toBeNull();
  });

  it('transfers longest road when another player surpasses', () => {
    let state = createTestGame();

    // Player 0 has 5 roads in a chain
    state = placeRoad(state, '0,0,NE', 0);
    state = placeRoad(state, '0,0,E', 0);
    state = placeRoad(state, '0,0,SE', 0);
    state = placeRoad(state, '-1,1,NE', 0);
    state = placeRoad(state, '-1,0,SE', 0);

    state = updateLongestRoad(state);
    expect(state.longestRoadPlayer).toBe(0);

    // Player 1 builds 6 connected roads in a chain:
    // (1,-2,N) --[1,-2,NE]--> (2,-3,S) --[1,-2,E]--> (1,-1,N)
    //   --[1,-2,SE]--> (1,-2,S) --[0,-1,E]--> (0,0,N)
    //   --[0,-1,SE]--> (0,-1,S) --[-1,0,NE]--> (-1,0,N)
    state = placeRoad(state, '1,-2,NE', 1);
    state = placeRoad(state, '1,-2,E', 1);
    state = placeRoad(state, '1,-2,SE', 1);
    state = placeRoad(state, '0,-1,E', 1);
    state = placeRoad(state, '0,-1,SE', 1);
    state = placeRoad(state, '-1,0,NE', 1);

    state = updateLongestRoad(state);
    expect(state.longestRoadPlayer).toBe(1);
    expect(state.longestRoadLength).toBe(6);
  });
});

import { GameState, GamePhase, BuildRoadAction, ActionResult, vertexKey, edgeKey } from '../types';
import { ROAD_COST } from '../constants';
import { hasResources, subtractResources, cloneState } from './helpers';
import { updateLongestRoad } from '../longest-road';
import { checkVictory } from '../victory';

export function validate(state: GameState, action: BuildRoadAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main && state.phase !== GamePhase.RoadBuilding) {
    return 'Can only build roads in Main or RoadBuilding phase';
  }

  const player = state.players[action.playerIndex];

  // Check resources (free during RoadBuilding)
  if (state.phase === GamePhase.Main) {
    if (!hasResources(player.resources, ROAD_COST)) {
      return 'Insufficient resources for road';
    }
  }

  if (player.roads <= 0) {
    return 'No road pieces remaining';
  }

  // Check edge exists in board graph
  const edgeExists = state.boardGraph.edgeToVertices.has(action.edgeKey);
  if (!edgeExists) {
    return 'Invalid edge location';
  }

  // Check edge is empty
  if (state.edgeRoads[action.edgeKey]) {
    return 'Edge already has a road';
  }

  // Check adjacency: must connect to own road, settlement, or city
  const endpoints = state.boardGraph.edgeToVertices.get(action.edgeKey)!;
  const [v1, v2] = endpoints;
  const v1k = vertexKey(v1);
  const v2k = vertexKey(v2);

  let connected = false;

  // Check if either endpoint has the player's building
  for (const vk of [v1k, v2k]) {
    const building = state.vertexBuildings[vk];
    if (building && building.playerIndex === action.playerIndex) {
      connected = true;
      break;
    }
  }

  // Check if either endpoint connects to the player's existing road
  // (but only if not blocked by an opponent building at the connecting vertex)
  if (!connected) {
    for (const vk of [v1k, v2k]) {
      // Check for opponent building blocking at this vertex
      const building = state.vertexBuildings[vk];
      if (building && building.playerIndex !== action.playerIndex) {
        continue; // Opponent building blocks connection through this vertex
      }

      const adjEdges = state.boardGraph.vertexToEdges.get(vk);
      if (adjEdges) {
        for (const adjEdge of adjEdges) {
          const aek = edgeKey(adjEdge);
          if (aek === action.edgeKey) continue;
          const road = state.edgeRoads[aek];
          if (road && road.playerIndex === action.playerIndex) {
            connected = true;
            break;
          }
        }
      }
      if (connected) break;
    }
  }

  if (!connected) {
    return 'Road must connect to your own road, settlement, or city';
  }

  return null;
}

export function apply(state: GameState, action: BuildRoadAction): ActionResult {
  let newState = cloneState(state);
  const player = { ...newState.players[action.playerIndex] };

  // Subtract resources (free in RoadBuilding phase)
  if (state.phase === GamePhase.Main) {
    player.resources = subtractResources(player.resources, ROAD_COST);
  }
  player.roads -= 1;

  const newPlayers = [...newState.players];
  newPlayers[action.playerIndex] = player;
  newState.players = newPlayers;

  // Place road
  newState.edgeRoads = {
    ...newState.edgeRoads,
    [action.edgeKey]: { playerIndex: action.playerIndex },
  };

  // Handle RoadBuilding phase
  if (state.phase === GamePhase.RoadBuilding) {
    newState.roadBuildingRoadsLeft = state.roadBuildingRoadsLeft - 1;
    if (newState.roadBuildingRoadsLeft <= 0) {
      newState.phase = GamePhase.Main;
    }
  }

  // Update longest road
  newState = updateLongestRoad(newState);

  // Check victory
  const winner = checkVictory(newState);
  if (winner !== null) {
    newState.winner = winner;
    newState.phase = GamePhase.GameOver;
  }

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} built a road`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [{ type: 'roadBuilt', playerIndex: action.playerIndex, edgeKey: action.edgeKey }],
  };
}

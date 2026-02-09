import { GameState, GamePhase, BuildCityAction, BuildingType, ActionResult } from '../types';
import { CITY_COST } from '../constants';
import { hasResources, subtractResources, cloneState } from './helpers';
import { checkVictory } from '../victory';

export function validate(state: GameState, action: BuildCityAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only build cities in Main phase';
  }

  const player = state.players[action.playerIndex];

  if (!hasResources(player.resources, CITY_COST)) {
    return 'Insufficient resources for city';
  }

  if (player.cities <= 0) {
    return 'No city pieces remaining';
  }

  // Check vertex has own settlement
  const building = state.vertexBuildings[action.vertexKey];
  if (!building) {
    return 'No building at this vertex';
  }
  if (building.playerIndex !== action.playerIndex) {
    return 'Not your building';
  }
  if (building.type !== BuildingType.Settlement) {
    return 'Can only upgrade settlements to cities';
  }

  return null;
}

export function apply(state: GameState, action: BuildCityAction): ActionResult {
  const newState = cloneState(state);
  const player = { ...newState.players[action.playerIndex] };

  // Subtract resources
  player.resources = subtractResources(player.resources, CITY_COST);
  player.cities -= 1;
  player.settlements += 1; // Return the settlement piece

  const newPlayers = [...newState.players];
  newPlayers[action.playerIndex] = player;
  newState.players = newPlayers;

  // Upgrade building
  newState.vertexBuildings = {
    ...newState.vertexBuildings,
    [action.vertexKey]: { type: BuildingType.City, playerIndex: action.playerIndex },
  };

  // Check victory
  const winner = checkVictory(newState);
  if (winner !== null) {
    newState.winner = winner;
    newState.phase = GamePhase.GameOver;
  }

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} built a city`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [{ type: 'cityBuilt', playerIndex: action.playerIndex, vertexKey: action.vertexKey }],
  };
}

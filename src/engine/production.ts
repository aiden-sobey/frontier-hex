import { GameState, ResourceType, BuildingType, hexKey, vertexKey } from './types';
import { TERRAIN_TO_RESOURCE } from './constants';
import type { ResourceBundle, GameEvent } from './types';

/**
 * Produce resources for a given dice roll.
 * For each hex matching the rolled number (not blocked by robber),
 * give resources to players with buildings on that hex's vertices
 * (1 for settlement, 2 for city).
 *
 * Returns a new state with updated player resources and events describing what was produced.
 */
export function produceResources(
  state: GameState,
  diceTotal: number,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const playerResourceDeltas: ResourceBundle[] = state.players.map(() => ({
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  }));

  const robberKey = hexKey(state.robberHex);

  for (const hex of state.hexTiles) {
    if (hex.numberToken !== diceTotal) continue;
    if (hexKey(hex.coord) === robberKey) continue;

    const resource = TERRAIN_TO_RESOURCE[hex.terrain];
    if (!resource) continue; // desert or unknown

    const hexVerts = state.boardGraph.hexToVertices.get(hexKey(hex.coord));
    if (!hexVerts) continue;

    for (const v of hexVerts) {
      const vk = vertexKey(v);
      const building = state.vertexBuildings[vk];
      if (!building) continue;

      const amount = building.type === BuildingType.City ? 2 : 1;
      playerResourceDeltas[building.playerIndex][resource] += amount;
    }
  }

  // Apply deltas to player resources
  const newPlayers = state.players.map((player, idx) => {
    const delta = playerResourceDeltas[idx];
    const totalGained = delta.wood + delta.brick + delta.sheep + delta.wheat + delta.ore;
    if (totalGained === 0) return player;

    events.push({
      type: 'resourcesProduced',
      playerIndex: idx,
      resources: { ...delta },
    });

    return {
      ...player,
      resources: {
        wood: player.resources.wood + delta.wood,
        brick: player.resources.brick + delta.brick,
        sheep: player.resources.sheep + delta.sheep,
        wheat: player.resources.wheat + delta.wheat,
        ore: player.resources.ore + delta.ore,
      },
    };
  });

  return {
    state: { ...state, players: newPlayers },
    events,
  };
}

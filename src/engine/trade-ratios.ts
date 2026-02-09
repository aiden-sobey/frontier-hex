import { GameState, ResourceType, PortType } from './types';

/**
 * Get the trade ratio for a specific resource for a player.
 * - 2:1 with a specific resource port
 * - 3:1 with a generic port
 * - 4:1 default
 */
export function getTradeRatio(
  state: GameState,
  playerIndex: number,
  resource: ResourceType,
): number {
  const player = state.players[playerIndex];

  // Check for specific 2:1 port
  const resourceToPort: Record<ResourceType, PortType> = {
    [ResourceType.Wood]: PortType.Wood,
    [ResourceType.Brick]: PortType.Brick,
    [ResourceType.Sheep]: PortType.Sheep,
    [ResourceType.Wheat]: PortType.Wheat,
    [ResourceType.Ore]: PortType.Ore,
  };

  if (player.ports.includes(resourceToPort[resource])) {
    return 2;
  }

  // Check for generic 3:1 port
  if (player.ports.includes(PortType.Generic)) {
    return 3;
  }

  // Default 4:1
  return 4;
}

/**
 * Get all trade ratios for a player (one per resource type).
 */
export function getAllTradeRatios(
  state: GameState,
  playerIndex: number,
): Record<ResourceType, number> {
  return {
    [ResourceType.Wood]: getTradeRatio(state, playerIndex, ResourceType.Wood),
    [ResourceType.Brick]: getTradeRatio(state, playerIndex, ResourceType.Brick),
    [ResourceType.Sheep]: getTradeRatio(state, playerIndex, ResourceType.Sheep),
    [ResourceType.Wheat]: getTradeRatio(state, playerIndex, ResourceType.Wheat),
    [ResourceType.Ore]: getTradeRatio(state, playerIndex, ResourceType.Ore),
  };
}

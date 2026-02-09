import { GameState, ResourceBundle, ResourceType } from '../types'
import { RESOURCE_TYPES } from '../constants'

/**
 * Check if a player has at least the required resources.
 */
export function hasResources(have: ResourceBundle, need: ResourceBundle): boolean {
  return (
    have.wood >= need.wood &&
    have.brick >= need.brick &&
    have.sheep >= need.sheep &&
    have.wheat >= need.wheat &&
    have.ore >= need.ore
  )
}

/**
 * Subtract resources (returns new bundle). Does NOT check sufficiency.
 */
export function subtractResources(from: ResourceBundle, cost: ResourceBundle): ResourceBundle {
  return {
    wood: from.wood - cost.wood,
    brick: from.brick - cost.brick,
    sheep: from.sheep - cost.sheep,
    wheat: from.wheat - cost.wheat,
    ore: from.ore - cost.ore,
  }
}

/**
 * Add resources (returns new bundle).
 */
export function addResources(to: ResourceBundle, add: ResourceBundle): ResourceBundle {
  return {
    wood: to.wood + add.wood,
    brick: to.brick + add.brick,
    sheep: to.sheep + add.sheep,
    wheat: to.wheat + add.wheat,
    ore: to.ore + add.ore,
  }
}

/**
 * Total number of resource cards in a bundle.
 */
export function totalResources(bundle: ResourceBundle): number {
  return bundle.wood + bundle.brick + bundle.sheep + bundle.wheat + bundle.ore
}

/**
 * Shallow clone a game state (immutable update pattern).
 */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(p => ({ ...p })),
    vertexBuildings: { ...state.vertexBuildings },
    edgeRoads: { ...state.edgeRoads },
    playersNeedingToDiscard: [...state.playersNeedingToDiscard],
    log: [...state.log],
  }
}

/**
 * Get resource count for a specific type.
 */
export function getResourceCount(bundle: ResourceBundle, resource: ResourceType): number {
  return bundle[resource]
}

/**
 * Set a specific resource in a bundle.
 */
export function setResource(bundle: ResourceBundle, resource: ResourceType, amount: number): ResourceBundle {
  return { ...bundle, [resource]: amount }
}

/**
 * Add a specific resource amount to a bundle.
 */
export function addResource(bundle: ResourceBundle, resource: ResourceType, amount: number): ResourceBundle {
  return { ...bundle, [resource]: bundle[resource] + amount }
}

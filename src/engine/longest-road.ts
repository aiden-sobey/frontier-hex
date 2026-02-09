import { GameState, vertexKey, edgeKey } from './types'
import type { EdgeId } from './types'

/**
 * Calculate the longest road length for a given player using DFS.
 * Opponent buildings break roads (stop traversal at vertices with opponent buildings).
 * Returns the length of the longest contiguous road.
 */
export function calculateLongestRoad(state: GameState, playerIndex: number): number {
  const { boardGraph, edgeRoads, vertexBuildings } = state

  // Collect all edges belonging to this player
  const playerEdgeKeys = new Set<string>()
  for (const [ek, road] of Object.entries(edgeRoads)) {
    if (road.playerIndex === playerIndex) {
      playerEdgeKeys.add(ek)
    }
  }

  if (playerEdgeKeys.size === 0) return 0

  let maxLength = 0

  // DFS from each player edge endpoint
  function dfs(currentVertexKey: string, visited: Set<string>, length: number): void {
    if (length > maxLength) {
      maxLength = length
    }

    // Find all edges from this vertex that belong to the player
    const adjEdges = boardGraph.vertexToEdges.get(currentVertexKey)
    if (!adjEdges) return

    for (const edge of adjEdges) {
      const ek = edgeKey(edge)
      if (!playerEdgeKeys.has(ek)) continue
      if (visited.has(ek)) continue

      // Get the other endpoint of this edge
      const endpoints = boardGraph.edgeToVertices.get(ek)
      if (!endpoints) continue

      const [v1, v2] = endpoints
      const v1k = vertexKey(v1)
      const v2k = vertexKey(v2)
      const otherVk = v1k === currentVertexKey ? v2k : v1k

      // Check if opponent building blocks at the other vertex
      const buildingAtOther = vertexBuildings[otherVk]
      if (buildingAtOther && buildingAtOther.playerIndex !== playerIndex) {
        // Opponent building blocks the road - count this edge but don't continue
        visited.add(ek)
        if (length + 1 > maxLength) {
          maxLength = length + 1
        }
        visited.delete(ek)
        continue
      }

      visited.add(ek)
      dfs(otherVk, visited, length + 1)
      visited.delete(ek)
    }
  }

  // Start DFS from each endpoint of each player road
  for (const ek of playerEdgeKeys) {
    const endpoints = boardGraph.edgeToVertices.get(ek)
    if (!endpoints) continue

    const [v1, v2] = endpoints
    const v1k = vertexKey(v1)
    const v2k = vertexKey(v2)

    // Start from v1
    const visited1 = new Set<string>([ek])
    // Only start from v1 if there's no opponent building there
    const buildingAtV1 = vertexBuildings[v1k]
    if (!buildingAtV1 || buildingAtV1.playerIndex === playerIndex) {
      dfs(v1k, visited1, 1)
    } else {
      if (1 > maxLength) maxLength = 1
    }

    // Start from v2
    const visited2 = new Set<string>([ek])
    const buildingAtV2 = vertexBuildings[v2k]
    if (!buildingAtV2 || buildingAtV2.playerIndex === playerIndex) {
      dfs(v2k, visited2, 1)
    } else {
      if (1 > maxLength) maxLength = 1
    }
  }

  return maxLength
}

/**
 * Update the longest road holder after a road is built or a building is placed.
 * Returns updated state with longestRoadPlayer and longestRoadLength.
 */
export function updateLongestRoad(state: GameState): GameState {
  const MINIMUM = 5 // from constants but inlined to avoid circular

  let longestPlayer = state.longestRoadPlayer
  let longestLength = state.longestRoadLength

  // Recalculate for all players
  const lengths: number[] = state.players.map((_, idx) => calculateLongestRoad(state, idx))

  // Find the player with the longest road >= minimum
  let maxLen = 0
  let maxPlayer: number | null = null
  let tie = false

  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] >= MINIMUM) {
      if (lengths[i] > maxLen) {
        maxLen = lengths[i]
        maxPlayer = i
        tie = false
      } else if (lengths[i] === maxLen) {
        tie = true
      }
    }
  }

  if (maxPlayer === null) {
    // Nobody has minimum
    longestPlayer = null
    longestLength = 0
  } else if (tie) {
    // In case of tie, the current holder keeps it
    if (longestPlayer !== null && lengths[longestPlayer] === maxLen) {
      // Current holder retains
      longestLength = maxLen
    } else {
      // If current holder doesn't have the max, nobody gets it in a tie
      // Actually in Catan, the first person to achieve it keeps it until someone beats them
      // If nobody currently holds it, nobody gets it in a tie
      if (longestPlayer === null) {
        longestPlayer = null
        longestLength = 0
      } else {
        // Current holder lost it - in a true tie nobody holds it
        longestPlayer = null
        longestLength = 0
      }
    }
  } else {
    longestPlayer = maxPlayer
    longestLength = maxLen
  }

  return {
    ...state,
    longestRoadPlayer: longestPlayer,
    longestRoadLength: longestLength,
  }
}

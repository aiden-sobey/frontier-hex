import { describe, it, expect } from 'vitest'
import { generateBoardHexes, buildBoardGraph, hexVertices, hexEdges, edgeEndpoints, vertexAdjacentVertices, vertexAdjacentHexes, hexDistance } from '../board'
import { vertexKey, edgeKey, hexKey } from '../types'

describe('generateBoardHexes', () => {
  it('returns exactly 19 hexes', () => {
    const hexes = generateBoardHexes()
    expect(hexes).toHaveLength(19)
  })

  it('includes the center hex', () => {
    const hexes = generateBoardHexes()
    expect(hexes.find(h => h.q === 0 && h.r === 0)).toBeDefined()
  })

  it('all hexes are within radius 2', () => {
    const hexes = generateBoardHexes()
    for (const hex of hexes) {
      expect(hexDistance(hex, { q: 0, r: 0 })).toBeLessThanOrEqual(2)
    }
  })
})

describe('buildBoardGraph', () => {
  const graph = buildBoardGraph()

  it('produces exactly 54 vertices', () => {
    expect(graph.vertices).toHaveLength(54)
  })

  it('produces exactly 72 edges', () => {
    expect(graph.edges).toHaveLength(72)
  })

  it('every vertex has 1-3 adjacent hexes', () => {
    for (const v of graph.vertices) {
      const vk = vertexKey(v)
      const hexes = graph.vertexToHexes.get(vk)!
      expect(hexes.length).toBeGreaterThanOrEqual(1)
      expect(hexes.length).toBeLessThanOrEqual(3)
    }
  })

  it('every edge has exactly 2 endpoint vertices', () => {
    for (const e of graph.edges) {
      const ek = edgeKey(e)
      const [v1, v2] = graph.edgeToVertices.get(ek)!
      expect(v1).toBeDefined()
      expect(v2).toBeDefined()
      expect(vertexKey(v1)).not.toBe(vertexKey(v2))
    }
  })

  it('every vertex has 2-3 adjacent vertices', () => {
    for (const v of graph.vertices) {
      const vk = vertexKey(v)
      const adjVerts = graph.vertexToVertices.get(vk)!
      expect(adjVerts.length).toBeGreaterThanOrEqual(2)
      expect(adjVerts.length).toBeLessThanOrEqual(3)
    }
  })

  it('every vertex has 2-3 adjacent edges', () => {
    for (const v of graph.vertices) {
      const vk = vertexKey(v)
      const adjEdges = graph.vertexToEdges.get(vk)!
      expect(adjEdges.length).toBeGreaterThanOrEqual(2)
      expect(adjEdges.length).toBeLessThanOrEqual(3)
    }
  })

  it('edge endpoints are consistent with vertex adjacency', () => {
    for (const e of graph.edges) {
      const ek = edgeKey(e)
      const [v1, v2] = graph.edgeToVertices.get(ek)!
      const v1k = vertexKey(v1)
      const v2k = vertexKey(v2)
      // v1 and v2 should be in each other's adjacency list
      const v1adj = graph.vertexToVertices.get(v1k)!.map(vertexKey)
      const v2adj = graph.vertexToVertices.get(v2k)!.map(vertexKey)
      expect(v1adj).toContain(v2k)
      expect(v2adj).toContain(v1k)
    }
  })

  it('each hex has exactly 6 vertices', () => {
    for (const hex of graph.hexes) {
      const hk = hexKey(hex)
      const verts = graph.hexToVertices.get(hk)!
      expect(verts).toHaveLength(6)
      // All 6 should be unique
      const keys = new Set(verts.map(vertexKey))
      expect(keys.size).toBe(6)
    }
  })
})

import { AxialCoord, VertexId, EdgeId, BoardGraph, vertexKey, edgeKey, hexKey } from './types'

// 6 axial direction vectors for hex neighbors (pointy-top)
export const HEX_DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 },   // E
  { q: 1, r: -1 },  // NE
  { q: 0, r: -1 },  // NW
  { q: -1, r: 0 },  // W
  { q: -1, r: 1 },  // SW
  { q: 0, r: 1 },   // SE
]

export function hexNeighbor(hex: AxialCoord, direction: number): AxialCoord {
  const d = HEX_DIRECTIONS[direction]
  return { q: hex.q + d.q, r: hex.r + d.r }
}

export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

// Generate 19 hex coords for standard Catan board (radius 2)
export function generateBoardHexes(): AxialCoord[] {
  const hexes: AxialCoord[] = []
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) <= 2) {
        hexes.push({ q, r })
      }
    }
  }
  return hexes
}

// Returns the 6 canonical VertexIds for a hex (pointy-top)
//
// For pointy-top hex (q,r), the 6 vertices clockwise from top:
//   0. N  (top):         (q, r, 'N')
//   1. NE (upper-right): (q+1, r-1, 'S')
//   2. SE (lower-right): (q, r+1, 'N')
//   3. S  (bottom):      (q, r, 'S')
//   4. SW (lower-left):  (q-1, r+1, 'N')
//   5. NW (upper-left):  (q, r-1, 'S')
export function hexVertices(hex: AxialCoord): VertexId[] {
  const { q, r } = hex
  return [
    { q, r, d: 'N' },                   // 0: top
    { q: q + 1, r: r - 1, d: 'S' },     // 1: NE
    { q, r: r + 1, d: 'N' },            // 2: SE
    { q, r, d: 'S' },                   // 3: bottom
    { q: q - 1, r: r + 1, d: 'N' },     // 4: SW
    { q, r: r - 1, d: 'S' },            // 5: NW
  ]
}

// Returns the 6 canonical EdgeIds for a hex (pointy-top)
//
// Edge between consecutive vertices:
//   0. NE edge (vertex 0-1): (q, r, 'NE')
//   1. E  edge (vertex 1-2): (q, r, 'E')
//   2. SE edge (vertex 2-3): (q, r, 'SE')
//   3. SW edge (vertex 3-4): (q-1, r+1, 'NE')  — canonical NE of SW neighbor
//   4. W  edge (vertex 4-5): (q-1, r, 'E')      — canonical E of W neighbor
//   5. NW edge (vertex 5-0): (q, r-1, 'SE')     — canonical SE of NW neighbor
export function hexEdges(hex: AxialCoord): EdgeId[] {
  const { q, r } = hex
  return [
    { q, r, d: 'NE' },                  // 0: NE edge (vertex 0-1)
    { q, r, d: 'E' },                   // 1: E edge (vertex 1-2)
    { q, r, d: 'SE' },                  // 2: SE edge (vertex 2-3)
    { q: q - 1, r: r + 1, d: 'NE' },    // 3: SW edge (vertex 3-4)
    { q: q - 1, r, d: 'E' },            // 4: W edge (vertex 4-5)
    { q, r: r - 1, d: 'SE' },           // 5: NW edge (vertex 5-0)
  ]
}

// Get 2 endpoint vertices of an edge
export function edgeEndpoints(e: EdgeId): [VertexId, VertexId] {
  const { q, r } = e
  switch (e.d) {
    case 'NE': return [{ q, r, d: 'N' }, { q: q + 1, r: r - 1, d: 'S' }]
    case 'E':  return [{ q: q + 1, r: r - 1, d: 'S' }, { q, r: r + 1, d: 'N' }]
    case 'SE': return [{ q, r: r + 1, d: 'N' }, { q, r, d: 'S' }]
  }
}

// Get the 3 adjacent vertices of a vertex
//
// (q, r, 'N') is adjacent to:
//   - (q+1, r-1, 'S') via NE edge of (q,r)
//   - (q, r-1, 'S')   via SE edge of (q,r-1)
//   - (q+1, r-2, 'S') via E edge of (q,r-1)
//
// (q, r, 'S') is adjacent to:
//   - (q, r+1, 'N')   via SE edge of (q,r)
//   - (q-1, r+1, 'N') via NE edge of (q-1,r+1)
//   - (q-1, r+2, 'N') via E edge of (q-1,r+1)
export function vertexAdjacentVertices(v: VertexId): VertexId[] {
  const { q, r } = v
  if (v.d === 'N') {
    return [
      { q: q + 1, r: r - 1, d: 'S' },
      { q, r: r - 1, d: 'S' },
      { q: q + 1, r: r - 2, d: 'S' },
    ]
  } else {
    return [
      { q, r: r + 1, d: 'N' },
      { q: q - 1, r: r + 1, d: 'N' },
      { q: q - 1, r: r + 2, d: 'N' },
    ]
  }
}

// Get the 3 edges touching a vertex
//
// (q, r, 'N') edges: NE of (q,r), SE of (q,r-1), E of (q,r-1)
// (q, r, 'S') edges: SE of (q,r), NE of (q-1,r+1), E of (q-1,r+1)
export function vertexAdjacentEdges(v: VertexId): EdgeId[] {
  const { q, r } = v
  if (v.d === 'N') {
    return [
      { q, r, d: 'NE' },
      { q, r: r - 1, d: 'SE' },
      { q, r: r - 1, d: 'E' },
    ]
  } else {
    return [
      { q, r, d: 'SE' },
      { q: q - 1, r: r + 1, d: 'NE' },
      { q: q - 1, r: r + 1, d: 'E' },
    ]
  }
}

// Get the hexes adjacent to a vertex (1-3 hexes, only those on the board)
//
// N vertex of (q,r) is shared by: (q,r), (q,r-1), (q+1,r-1)
// S vertex of (q,r) is shared by: (q,r), (q-1,r+1), (q,r+1)
export function vertexAdjacentHexes(v: VertexId, boardHexSet: Set<string>): AxialCoord[] {
  const { q, r } = v
  let candidates: AxialCoord[]
  if (v.d === 'N') {
    candidates = [{ q, r }, { q, r: r - 1 }, { q: q + 1, r: r - 1 }]
  } else {
    candidates = [{ q, r }, { q: q - 1, r: r + 1 }, { q, r: r + 1 }]
  }
  return candidates.filter(c => boardHexSet.has(hexKey(c)))
}

// Build the complete board graph
export function buildBoardGraph(): BoardGraph {
  const hexes = generateBoardHexes()
  const hexSet = new Set(hexes.map(hexKey))

  const vertexMap = new Map<string, VertexId>()
  const edgeMap = new Map<string, EdgeId>()
  const vertexToHexes = new Map<string, AxialCoord[]>()
  const vertexToEdges = new Map<string, EdgeId[]>()
  const vertexToVertices = new Map<string, VertexId[]>()
  const edgeToVertices = new Map<string, [VertexId, VertexId]>()
  const hexToVerticesMap = new Map<string, VertexId[]>()

  // Collect all unique vertices and edges from all hexes
  for (const hex of hexes) {
    const verts = hexVertices(hex)
    const eds = hexEdges(hex)

    const hk = hexKey(hex)
    hexToVerticesMap.set(hk, verts)

    for (const v of verts) {
      const vk = vertexKey(v)
      if (!vertexMap.has(vk)) {
        vertexMap.set(vk, v)
      }
    }
    for (const e of eds) {
      const ek = edgeKey(e)
      if (!edgeMap.has(ek)) {
        edgeMap.set(ek, e)
      }
    }
  }

  const vertices = Array.from(vertexMap.values())
  const edges = Array.from(edgeMap.values())

  // Build vertex -> hexes mapping
  for (const v of vertices) {
    const vk = vertexKey(v)
    vertexToHexes.set(vk, vertexAdjacentHexes(v, hexSet))
  }

  // Build edge -> vertices mapping
  for (const e of edges) {
    const ek = edgeKey(e)
    edgeToVertices.set(ek, edgeEndpoints(e))
  }

  // Build vertex -> adjacent edges (only edges that exist on the board)
  for (const v of vertices) {
    const vk = vertexKey(v)
    const adjEdges = vertexAdjacentEdges(v).filter(e => edgeMap.has(edgeKey(e)))
    vertexToEdges.set(vk, adjEdges)
  }

  // Build vertex -> adjacent vertices (only vertices that exist on the board)
  for (const v of vertices) {
    const vk = vertexKey(v)
    const adjVerts = vertexAdjacentVertices(v).filter(av => vertexMap.has(vertexKey(av)))
    vertexToVertices.set(vk, adjVerts)
  }

  return {
    hexes,
    vertices,
    edges,
    vertexToHexes,
    vertexToEdges,
    vertexToVertices,
    edgeToVertices,
    hexToVertices: hexToVerticesMap,
  }
}

import type { AxialCoord, VertexId, EdgeId } from '~/engine/types'

export const HEX_SIZE = 60 // base hex radius in pixels

// For pointy-top hexes:
// x = size * (sqrt(3) * q + sqrt(3)/2 * r)
// y = size * (3/2 * r)
export function axialToPixel(coord: AxialCoord): { x: number; y: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r)
  const y = HEX_SIZE * ((3 / 2) * coord.r)
  return { x, y }
}

// Vertex pixel position
// For pointy-top: N vertex at (cx, cy - size), S vertex at (cx, cy + size)
// Vertex (q, r, 'N') is the N vertex of hex (q,r)
// Vertex (q, r, 'S') is the S vertex of hex (q,r)
export function vertexToPixel(v: VertexId): { x: number; y: number } {
  const center = axialToPixel({ q: v.q, r: v.r })
  if (v.d === 'N') {
    return { x: center.x, y: center.y - HEX_SIZE }
  } else {
    return { x: center.x, y: center.y + HEX_SIZE }
  }
}

// Edge pixel midpoint and angle
export function edgeToPixel(e: EdgeId): { x: number; y: number; angle: number } {
  const center = axialToPixel({ q: e.q, r: e.r })

  switch (e.d) {
    case 'NE': {
      // NE edge connects N vertex (q,r) to S vertex (q+1,r-1)
      // N vertex: (cx, cy - size)
      // S vertex of (q+1,r-1): compute its center then offset
      const neighbor = axialToPixel({ q: e.q + 1, r: e.r - 1 })
      const x1 = center.x
      const y1 = center.y - HEX_SIZE
      const x2 = neighbor.x
      const y2 = neighbor.y + HEX_SIZE
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, angle: Math.PI / 6 } // 30 degrees
    }
    case 'E': {
      // E edge connects S vertex of (q+1,r-1) to N vertex of (q,r+1)
      const v1Center = axialToPixel({ q: e.q + 1, r: e.r - 1 })
      const v2Center = axialToPixel({ q: e.q, r: e.r + 1 })
      const x1 = v1Center.x
      const y1 = v1Center.y + HEX_SIZE
      const x2 = v2Center.x
      const y2 = v2Center.y - HEX_SIZE
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, angle: Math.PI / 2 } // 90 degrees (vertical)
    }
    case 'SE': {
      // SE edge connects N vertex of (q,r+1) to S vertex (q,r)
      const v1Center = axialToPixel({ q: e.q, r: e.r + 1 })
      const x1 = v1Center.x
      const y1 = v1Center.y - HEX_SIZE
      const x2 = center.x
      const y2 = center.y + HEX_SIZE
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, angle: -Math.PI / 6 } // -30 degrees
    }
  }
}

// 6 corner points of a pointy-top hexagon
export function hexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30) // pointy-top starts at -30
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    })
  }
  return corners
}

// Board centering: compute offset so board is centered at (0,0)
export function getBoardCenter(): { x: number; y: number } {
  return { x: 0, y: 0 } // Center hex (0,0) maps to pixel (0,0)
}

import { useCallback } from 'react'
import type { Graphics } from 'pixi.js'
import type { AxialCoord } from '~/engine/types'
import { axialToPixel } from './layout'

interface RobberPieceProps {
  hex: AxialCoord
}

export function RobberPiece({ hex }: RobberPieceProps) {
  const { x, y } = axialToPixel(hex)

  const draw = useCallback((g: Graphics) => {
    g.clear()
    // Draw a robber figure - head
    g.circle(0, -12, 8)
    g.fill({ color: 0x2c2c2c })
    // Body
    g.roundRect(-8, -4, 16, 20, 4)
    g.fill({ color: 0x2c2c2c })
  }, [])

  return <pixiGraphics x={x} y={y} draw={draw} />
}

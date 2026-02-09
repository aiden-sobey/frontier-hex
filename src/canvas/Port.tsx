import { useCallback } from 'react'
import type { Graphics } from 'pixi.js'
import type { Port as PortType } from '~/engine/types'
import { PortType as PortTypeEnum, parseVertexKey } from '~/engine/types'
import { vertexToPixel } from './layout'
import { PORT_COLOR } from './textures'

const PORT_LABELS: Record<string, string> = {
  [PortTypeEnum.Generic]: '3:1',
  [PortTypeEnum.Wood]: '2:1 W',
  [PortTypeEnum.Brick]: '2:1 B',
  [PortTypeEnum.Sheep]: '2:1 S',
  [PortTypeEnum.Wheat]: '2:1 G',
  [PortTypeEnum.Ore]: '2:1 O',
}

interface PortProps {
  port: PortType
}

export function Port({ port }: PortProps) {
  const v1 = parseVertexKey(port.vertices[0])
  const v2 = parseVertexKey(port.vertices[1])
  const p1 = vertexToPixel(v1)
  const p2 = vertexToPixel(v2)

  // Port position is outside the board, offset from midpoint of the two vertices
  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  // Push outward from board center (0,0)
  const dist = Math.sqrt(mx * mx + my * my)
  const scale = dist > 0 ? 1.3 : 1
  const px = mx * scale
  const py = my * scale

  const draw = useCallback((g: Graphics) => {
    g.clear()
    g.circle(0, 0, 14)
    g.fill({ color: PORT_COLOR })
    g.stroke({ color: 0x000000, width: 1 })
  }, [])

  const label = PORT_LABELS[port.type] ?? '3:1'

  return (
    <pixiContainer x={px} y={py}>
      <pixiGraphics draw={draw} />
      <pixiText
        text={label}
        x={0}
        y={0}
        anchor={0.5}
        style={{
          fontSize: 9,
          fontWeight: 'bold',
          fill: 0x000000,
        }}
      />
    </pixiContainer>
  )
}

import { useCallback } from 'react'
import type { Graphics } from 'pixi.js'
import type { HexTile as HexTileType } from '~/engine/types'
import { axialToPixel, hexCorners, HEX_SIZE } from './layout'
import { TERRAIN_COLORS, NUMBER_TOKEN_COLORS } from './textures'

interface HexTileProps {
  tile: HexTileType
  highlighted?: boolean
  onClick?: () => void
}

export function HexTile({ tile, highlighted, onClick }: HexTileProps) {
  const { x, y } = axialToPixel(tile.coord)
  const corners = hexCorners(0, 0, HEX_SIZE)
  const terrainColor = TERRAIN_COLORS[tile.terrain]

  const drawHex = useCallback(
    (g: Graphics) => {
      g.clear()
      g.poly(corners.flatMap((c) => [c.x, c.y]))
      g.fill({ color: terrainColor })
      if (highlighted) {
        g.stroke({ color: 0xf1c40f, width: 4 })
      } else {
        g.stroke({ color: 0x000000, width: 2 })
      }
    },
    [terrainColor, highlighted],
  )

  const drawToken = useCallback(
    (g: Graphics) => {
      if (tile.numberToken === null) return
      g.clear()
      g.circle(0, 0, 18)
      g.fill({ color: 0xfaf0dc })
      g.stroke({ color: 0x000000, width: 1 })
    },
    [tile.numberToken],
  )

  const isHighProb = tile.numberToken === 6 || tile.numberToken === 8

  return (
    <pixiContainer
      x={x}
      y={y}
      eventMode={highlighted ? 'static' : 'auto'}
      cursor={highlighted ? 'pointer' : 'default'}
      onPointerDown={highlighted && onClick ? onClick : undefined}
    >
      <pixiGraphics draw={drawHex} />
      {tile.numberToken !== null && (
        <>
          <pixiGraphics draw={drawToken} />
          <pixiText
            text={String(tile.numberToken)}
            x={0}
            y={0}
            anchor={0.5}
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              fill: isHighProb
                ? NUMBER_TOKEN_COLORS.high
                : NUMBER_TOKEN_COLORS.normal,
            }}
          />
        </>
      )}
    </pixiContainer>
  )
}

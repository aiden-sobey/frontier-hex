import type { HexTile as HexTileType } from '~/engine/types'
import { hexKey } from '~/engine/types'
import { HexTile } from './HexTile'

interface HexGridProps {
  hexTiles: HexTileType[]
  highlightedHexes?: Set<string>
  onHexClick?: (hexKey: string) => void
}

export function HexGrid({ hexTiles, highlightedHexes, onHexClick }: HexGridProps) {
  return (
    <pixiContainer>
      {hexTiles.map((tile) => {
        const hk = hexKey(tile.coord)
        const isHighlighted = highlightedHexes?.has(hk) ?? false
        return (
          <HexTile
            key={hk}
            tile={tile}
            highlighted={isHighlighted}
            onClick={isHighlighted && onHexClick ? () => onHexClick(hk) : undefined}
          />
        )
      })}
    </pixiContainer>
  )
}

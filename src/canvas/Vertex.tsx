import { useCallback } from 'react';
import type { Graphics } from 'pixi.js';
import type { VertexId, VertexBuilding } from '~/engine/types';
import { BuildingType, PlayerColor } from '~/engine/types';
import { vertexToPixel } from './layout';
import { PLAYER_COLORS } from './textures';

interface VertexProps {
  vertex: VertexId;
  building?: VertexBuilding;
  highlighted?: boolean;
  onClick?: () => void;
}

export function Vertex({ vertex, building, highlighted, onClick }: VertexProps) {
  const { x, y } = vertexToPixel(vertex);

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (building) {
        const playerColors = Object.values(PlayerColor) as PlayerColor[];
        const color = PLAYER_COLORS[playerColors[building.playerIndex]] ?? 0xffffff;
        if (building.type === BuildingType.Settlement) {
          // Small house shape
          g.rect(-8, -6, 16, 12);
          g.fill({ color });
          g.stroke({ color: 0x000000, width: 1 });
        } else {
          // Larger city shape
          g.rect(-10, -8, 20, 16);
          g.fill({ color });
          g.stroke({ color: 0x000000, width: 2 });
        }
      } else if (highlighted) {
        // Pulsing highlight indicator
        g.circle(0, 0, 10);
        g.fill({ color: 0xf1c40f, alpha: 0.6 });
        g.stroke({ color: 0xf1c40f, width: 2 });
        g.circle(0, 0, 6);
        g.fill({ color: 0xffffff, alpha: 0.8 });
      } else {
        // Empty vertex indicator
        g.circle(0, 0, 4);
        g.fill({ color: 0xffffff, alpha: 0.3 });
      }
    },
    [building, highlighted],
  );

  return (
    <pixiGraphics
      x={x}
      y={y}
      draw={draw}
      eventMode={highlighted ? 'static' : 'auto'}
      cursor={highlighted ? 'pointer' : 'default'}
      onPointerDown={highlighted && onClick ? onClick : undefined}
    />
  );
}

import { useCallback } from 'react';
import type { Graphics } from 'pixi.js';
import type { EdgeId, EdgeRoad } from '~/engine/types';
import { PlayerColor } from '~/engine/types';
import { edgeEndpoints } from '~/engine/board';
import { vertexToPixel } from './layout';
import { PLAYER_COLORS } from './textures';

interface EdgeProps {
  edge: EdgeId;
  road?: EdgeRoad;
  highlighted?: boolean;
  onClick?: () => void;
}

export function Edge({ edge, road, highlighted, onClick }: EdgeProps) {
  const [v1, v2] = edgeEndpoints(edge);
  const p1 = vertexToPixel(v1);
  const p2 = vertexToPixel(v2);
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (road) {
        const playerColors = Object.values(PlayerColor) as PlayerColor[];
        const color = PLAYER_COLORS[playerColors[road.playerIndex]] ?? 0xffffff;
        g.moveTo(p1.x - mx, p1.y - my);
        g.lineTo(p2.x - mx, p2.y - my);
        g.stroke({ color, width: 6 });
      } else if (highlighted) {
        // Highlighted edge - bright yellow glow
        g.moveTo(p1.x - mx, p1.y - my);
        g.lineTo(p2.x - mx, p2.y - my);
        g.stroke({ color: 0xf1c40f, width: 8, alpha: 0.5 });
        g.moveTo(p1.x - mx, p1.y - my);
        g.lineTo(p2.x - mx, p2.y - my);
        g.stroke({ color: 0xffffff, width: 4, alpha: 0.8 });
      } else {
        // Empty edge indicator
        g.moveTo(p1.x - mx, p1.y - my);
        g.lineTo(p2.x - mx, p2.y - my);
        g.stroke({ color: 0xffffff, alpha: 0.15, width: 2 });
      }
    },
    [road, highlighted, p1.x, p1.y, p2.x, p2.y, mx, my],
  );

  return (
    <pixiGraphics
      x={mx}
      y={my}
      draw={draw}
      eventMode={highlighted ? 'static' : 'auto'}
      cursor={highlighted ? 'pointer' : 'default'}
      onPointerTap={highlighted && onClick ? onClick : undefined}
      hitArea={
        highlighted
          ? {
              contains: (hx: number, hy: number) => {
                // Line hit area: distance from point to line segment
                const ax = p1.x - mx;
                const ay = p1.y - my;
                const bx = p2.x - mx;
                const by = p2.y - my;
                const dx = bx - ax;
                const dy = by - ay;
                const len2 = dx * dx + dy * dy;
                if (len2 === 0) return Math.hypot(hx - ax, hy - ay) < 10;
                const t = Math.max(0, Math.min(1, ((hx - ax) * dx + (hy - ay) * dy) / len2));
                const projX = ax + t * dx;
                const projY = ay + t * dy;
                return Math.hypot(hx - projX, hy - projY) < 10;
              },
            }
          : undefined
      }
    />
  );
}

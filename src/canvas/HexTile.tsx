import { useCallback } from 'react';
import type { Graphics } from 'pixi.js';
import type { HexTile as HexTileType } from '~/engine/types';
import { pips } from '~/engine/constants';
import { hexCorners, HEX_SIZE, axialToPixel } from './layout';
import { TERRAIN_COLORS, NUMBER_TOKEN_COLORS, darkenColor } from './textures';

interface HexTileProps {
  tile: HexTileType;
  highlighted?: boolean;
  onClick?: () => void;
}

export function HexTile({ tile, highlighted, onClick }: HexTileProps) {
  const { x, y } = axialToPixel(tile.coord);
  const corners = hexCorners(0, 0, HEX_SIZE);
  const terrainColor = TERRAIN_COLORS[tile.terrain];

  const drawHex = useCallback(
    (g: Graphics) => {
      g.clear();

      // 1. Drop shadow — offset (3, 3), darker color, semi-transparent
      const shadowCorners = corners.map((c) => ({ x: c.x + 3, y: c.y + 3 }));
      g.poly(shadowCorners.flatMap((c) => [c.x, c.y]));
      g.fill({ color: darkenColor(terrainColor, 0.4), alpha: 0.5 });

      // 2. Elevation shading — concentric hex fills, dark at edges → bright center
      const shadeSteps = 6;
      for (let i = 0; i < shadeSteps; i++) {
        const t = i / (shadeSteps - 1); // 0 (edge) → 1 (center)
        const scale = 1.0 - t * 0.45; // 1.0 → 0.55
        const brightness = 0.75 + t * 0.25; // 0.75 → 1.0
        const scaled = corners.map((c) => ({ x: c.x * scale, y: c.y * scale }));
        g.poly(scaled.flatMap((c) => [c.x, c.y]));
        g.fill({ color: darkenColor(terrainColor, brightness) });
      }

      // 3. Edge highlights (bevel effect)
      // Pointy-top corners (starting at -30°):
      //   0: top-right, 1: bottom-right, 2: bottom
      //   3: bottom-left, 4: top-left, 5: top
      // Light edges (top-left side): 3→4, 4→5, 5→0
      const lightEdges = [
        [3, 4],
        [4, 5],
        [5, 0],
      ];
      for (const [from, to] of lightEdges) {
        g.moveTo(corners[from].x, corners[from].y);
        g.lineTo(corners[to].x, corners[to].y);
        g.stroke({ color: 0xffffff, width: 2, alpha: 0.3 });
      }

      // Dark edges (bottom-right side): 0→1, 1→2, 2→3
      const darkEdges = [
        [0, 1],
        [1, 2],
        [2, 3],
      ];
      for (const [from, to] of darkEdges) {
        g.moveTo(corners[from].x, corners[from].y);
        g.lineTo(corners[to].x, corners[to].y);
        g.stroke({ color: 0x000000, width: 2, alpha: 0.3 });
      }

      // 5. Border stroke
      g.poly(corners.flatMap((c) => [c.x, c.y]));
      if (highlighted) {
        g.stroke({ color: 0xf1c40f, width: 4 });
      } else {
        g.stroke({ color: 0x000000, width: 2 });
      }
    },
    [terrainColor, highlighted],
  );

  const drawToken = useCallback(
    (g: Graphics) => {
      if (tile.numberToken === null) return;
      g.clear();
      g.circle(0, 0, 18);
      g.fill({ color: 0xfaf0dc });
      g.stroke({ color: 0x000000, width: 1 });

      // Pip dots showing roll probability
      const pipCount = pips(tile.numberToken);
      const isHigh = tile.numberToken === 6 || tile.numberToken === 8;
      const dotColor = isHigh ? NUMBER_TOKEN_COLORS.high : NUMBER_TOKEN_COLORS.normal;
      const dotRadius = 2;
      const dotSpacing = 5;
      const totalWidth = (pipCount - 1) * dotSpacing;
      const startX = -totalWidth / 2;
      for (let i = 0; i < pipCount; i++) {
        g.circle(startX + i * dotSpacing, 8, dotRadius);
        g.fill({ color: dotColor });
      }
    },
    [tile.numberToken],
  );

  const isHighProb = tile.numberToken === 6 || tile.numberToken === 8;

  return (
    <pixiContainer
      x={x}
      y={y}
      eventMode={highlighted ? 'static' : 'auto'}
      cursor={highlighted ? 'pointer' : 'default'}
      onPointerTap={highlighted && onClick ? onClick : undefined}
    >
      <pixiGraphics draw={drawHex} />
      {tile.numberToken !== null && (
        <>
          <pixiGraphics draw={drawToken} />
          <pixiText
            text={String(tile.numberToken)}
            x={0}
            y={-3}
            anchor={0.5}
            resolution={3}
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              fill: isHighProb ? NUMBER_TOKEN_COLORS.high : NUMBER_TOKEN_COLORS.normal,
            }}
          />
        </>
      )}
    </pixiContainer>
  );
}

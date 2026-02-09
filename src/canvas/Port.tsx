import { useCallback } from 'react';
import type { Graphics } from 'pixi.js';
import type { Port as PortType } from '~/engine/types';
import { PortType as PortTypeEnum, parseVertexKey } from '~/engine/types';
import { vertexToPixel } from './layout';
import { PORT_COLORS } from './textures';

const PORT_ICONS: Record<string, string> = {
  [PortTypeEnum.Generic]: '?',
  [PortTypeEnum.Wood]: '\u{1FAB5}',
  [PortTypeEnum.Brick]: '\u{1F9F1}',
  [PortTypeEnum.Sheep]: '\u{1F411}',
  [PortTypeEnum.Wheat]: '\u{1F33E}',
  [PortTypeEnum.Ore]: '\u26CF\uFE0F',
};

const PORT_RATIOS: Record<string, string> = {
  [PortTypeEnum.Generic]: '3:1',
  [PortTypeEnum.Wood]: '2:1',
  [PortTypeEnum.Brick]: '2:1',
  [PortTypeEnum.Sheep]: '2:1',
  [PortTypeEnum.Wheat]: '2:1',
  [PortTypeEnum.Ore]: '2:1',
};

interface PortProps {
  port: PortType;
}

export function Port({ port }: PortProps) {
  const v1 = parseVertexKey(port.vertices[0]);
  const v2 = parseVertexKey(port.vertices[1]);
  const p1 = vertexToPixel(v1);
  const p2 = vertexToPixel(v2);

  // Port position is outside the board, offset from midpoint of the two vertices
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  // Push outward from board center (0,0)
  const dist = Math.sqrt(mx * mx + my * my);
  const scale = dist > 0 ? 1.3 : 1;
  const px = mx * scale;
  const py = my * scale;

  const color = PORT_COLORS[port.type] ?? PORT_COLORS[PortTypeEnum.Generic];

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();

      // Connection lines from port circle to each vertex
      g.moveTo(p1.x - px, p1.y - py);
      g.lineTo(0, 0);
      g.stroke({ color, width: 2, alpha: 0.5 });

      g.moveTo(p2.x - px, p2.y - py);
      g.lineTo(0, 0);
      g.stroke({ color, width: 2, alpha: 0.5 });

      // Port circle
      g.circle(0, 0, 16);
      g.fill({ color });
      g.stroke({ color: 0x000000, width: 1.5 });
    },
    [color, p1.x, p1.y, p2.x, p2.y, px, py],
  );

  const icon = PORT_ICONS[port.type] ?? '?';
  const ratio = PORT_RATIOS[port.type] ?? '3:1';

  return (
    <pixiContainer x={px} y={py}>
      <pixiGraphics draw={draw} />
      <pixiText
        text={icon}
        x={0}
        y={-5}
        anchor={0.5}
        resolution={3}
        style={{
          fontSize: 12,
          fill: 0xffffff,
        }}
      />
      <pixiText
        text={ratio}
        x={0}
        y={8}
        anchor={0.5}
        resolution={3}
        style={{
          fontSize: 8,
          fontWeight: 'bold',
          fill: 0xffffff,
        }}
      />
    </pixiContainer>
  );
}

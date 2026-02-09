import { TerrainType, PlayerColor, PortType } from '~/engine/types';

export function darkenColor(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

export const TERRAIN_COLORS: Record<TerrainType, number> = {
  [TerrainType.Forest]: 0x2d5a1b,
  [TerrainType.Hills]: 0xc4622d,
  [TerrainType.Pasture]: 0x7ec850,
  [TerrainType.Fields]: 0xe8c84a,
  [TerrainType.Mountains]: 0x8a8a8a,
  [TerrainType.Desert]: 0xe8d5a3,
};

export const PLAYER_COLORS: Record<PlayerColor, number> = {
  [PlayerColor.Red]: 0xe74c3c,
  [PlayerColor.Blue]: 0x3498db,
  [PlayerColor.White]: 0xecf0f1,
  [PlayerColor.Orange]: 0xe67e22,
};

export const NUMBER_TOKEN_COLORS = {
  high: 0xcc0000, // for 6 and 8
  normal: 0x333333,
};

export const OCEAN_COLOR = 0x1a5276;
export const PORT_COLORS: Record<PortType, number> = {
  [PortType.Generic]: 0xd4a437,
  [PortType.Wood]: 0x166534,
  [PortType.Brick]: 0x991b1b,
  [PortType.Sheep]: 0x3f6212,
  [PortType.Wheat]: 0xa16207,
  [PortType.Ore]: 0x4b5563,
};

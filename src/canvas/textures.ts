import { TerrainType, PlayerColor } from '~/engine/types'

export const TERRAIN_COLORS: Record<TerrainType, number> = {
  [TerrainType.Forest]: 0x2d5a1b,
  [TerrainType.Hills]: 0xc4622d,
  [TerrainType.Pasture]: 0x7ec850,
  [TerrainType.Fields]: 0xe8c84a,
  [TerrainType.Mountains]: 0x8a8a8a,
  [TerrainType.Desert]: 0xe8d5a3,
}

export const PLAYER_COLORS: Record<PlayerColor, number> = {
  [PlayerColor.Red]: 0xe74c3c,
  [PlayerColor.Blue]: 0x3498db,
  [PlayerColor.White]: 0xecf0f1,
  [PlayerColor.Orange]: 0xe67e22,
}

export const NUMBER_TOKEN_COLORS = {
  high: 0xcc0000, // for 6 and 8
  normal: 0x333333,
}

export const OCEAN_COLOR = 0x1a5276
export const PORT_COLOR = 0xd4a437

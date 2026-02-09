import { ResourceBundle, ResourceType, TerrainType, DevelopmentCardType, PortType } from './types';

export const TERRAIN_DISTRIBUTION: TerrainType[] = [
  TerrainType.Forest,
  TerrainType.Forest,
  TerrainType.Forest,
  TerrainType.Forest,
  TerrainType.Fields,
  TerrainType.Fields,
  TerrainType.Fields,
  TerrainType.Fields,
  TerrainType.Pasture,
  TerrainType.Pasture,
  TerrainType.Pasture,
  TerrainType.Pasture,
  TerrainType.Hills,
  TerrainType.Hills,
  TerrainType.Hills,
  TerrainType.Mountains,
  TerrainType.Mountains,
  TerrainType.Mountains,
  TerrainType.Desert,
];

// Standard Catan number tokens in spiral order
export const NUMBER_TOKENS: number[] = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

export const SETTLEMENT_COST: ResourceBundle = { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 };
export const CITY_COST: ResourceBundle = { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 };
export const ROAD_COST: ResourceBundle = { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 };
export const DEV_CARD_COST: ResourceBundle = { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 };

export const EMPTY_RESOURCES: ResourceBundle = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

export const DEV_CARD_DECK_COMPOSITION: DevelopmentCardType[] = [
  ...Array(14).fill(DevelopmentCardType.Knight),
  ...Array(5).fill(DevelopmentCardType.VictoryPoint),
  ...Array(2).fill(DevelopmentCardType.RoadBuilding),
  ...Array(2).fill(DevelopmentCardType.YearOfPlenty),
  ...Array(2).fill(DevelopmentCardType.Monopoly),
];

export const TERRAIN_TO_RESOURCE: Partial<Record<TerrainType, ResourceType>> = {
  [TerrainType.Forest]: ResourceType.Wood,
  [TerrainType.Hills]: ResourceType.Brick,
  [TerrainType.Pasture]: ResourceType.Sheep,
  [TerrainType.Fields]: ResourceType.Wheat,
  [TerrainType.Mountains]: ResourceType.Ore,
};

export const RESOURCE_TYPES: ResourceType[] = [
  ResourceType.Wood,
  ResourceType.Brick,
  ResourceType.Sheep,
  ResourceType.Wheat,
  ResourceType.Ore,
];

// Pip count: probability indicator for a number token
export function pips(numberToken: number): number {
  return 6 - Math.abs(7 - numberToken);
}

// Standard port layout - 9 ports around the board perimeter
// Each entry: [hexEdge position, PortType]
// We'll define the port positions as pairs of vertex keys that face the ocean
export const PORT_TYPES: PortType[] = [
  PortType.Generic,
  PortType.Generic,
  PortType.Generic,
  PortType.Generic,
  PortType.Wood,
  PortType.Brick,
  PortType.Sheep,
  PortType.Wheat,
  PortType.Ore,
];

// Starting pieces per player
export const INITIAL_SETTLEMENTS = 5;
export const INITIAL_CITIES = 4;
export const INITIAL_ROADS = 15;

// Victory
export const VICTORY_POINTS_TO_WIN = 10;
export const LONGEST_ROAD_MINIMUM = 5;
export const LARGEST_ARMY_MINIMUM = 3;

// Max hand size before discard on 7
export const MAX_HAND_SIZE_BEFORE_DISCARD = 7;

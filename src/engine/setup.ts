import {
  GameState,
  GamePhase,
  HexTile,
  Port,
  PortType,
  DevelopmentCardType,
  PlayerColor,
  PlayerState,
  AxialCoord,
  hexKey,
} from './types';
import {
  TERRAIN_DISTRIBUTION,
  NUMBER_TOKENS,
  DEV_CARD_DECK_COMPOSITION,
  EMPTY_RESOURCES,
  INITIAL_SETTLEMENTS,
  INITIAL_CITIES,
  INITIAL_ROADS,
  PORT_TYPES,
} from './constants';
import { generateBoardHexes, buildBoardGraph, hexVertices } from './board';
import type { TerrainType, BoardGraph } from './types';

// Seeded PRNG (mulberry32)
export function createSeededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle
export function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate the board: shuffle terrains onto hexes, assign number tokens
export function generateBoard(seed: number): { hexTiles: HexTile[]; robberHex: AxialCoord } {
  const rng = createSeededRng(seed);
  const hexCoords = generateBoardHexes();
  const terrains = shuffle([...TERRAIN_DISTRIBUTION], rng);

  let tokenIndex = 0;
  let robberHex: AxialCoord = { q: 0, r: 0 };
  const hexTiles: HexTile[] = hexCoords.map((coord, i) => {
    const terrain = terrains[i];
    if (terrain === 'desert') {
      robberHex = coord;
      return { coord, terrain, numberToken: null };
    }
    const numberToken = NUMBER_TOKENS[tokenIndex++];
    return { coord, terrain, numberToken };
  });

  return { hexTiles, robberHex };
}

// Generate ports at standard positions around the board perimeter
// A board has 9 ports at fixed edge positions
export function generatePorts(boardGraph: BoardGraph, rng: () => number): Port[] {
  // Find perimeter vertices: vertices that touch fewer than 3 board hexes
  // We'll place them at evenly-spaced positions around the edge

  const hexSet = new Set(boardGraph.hexes.map(hexKey));

  // Find perimeter edges: edges where one endpoint vertex touches < 3 hexes
  // Group perimeter vertices into pairs for port placement
  const perimeterVertexKeys = new Set<string>();
  for (const [vk, hexes] of boardGraph.vertexToHexes) {
    if (hexes.length < 3) {
      perimeterVertexKeys.add(vk);
    }
  }

  // Find perimeter edges (both endpoints are perimeter vertices, and both endpoints are on the board)
  const perimeterEdges: [string, string][] = [];
  for (const [ek, [v1, v2]] of boardGraph.edgeToVertices) {
    const vk1 = `${v1.q},${v1.r},${v1.d}`;
    const vk2 = `${v2.q},${v2.r},${v2.d}`;
    if (perimeterVertexKeys.has(vk1) && perimeterVertexKeys.has(vk2)) {
      // Check both vertices touch at least 1 hex (they're actual board vertices)
      const h1 = boardGraph.vertexToHexes.get(vk1);
      const h2 = boardGraph.vertexToHexes.get(vk2);
      if (h1 && h1.length > 0 && h2 && h2.length > 0) {
        // Additionally, check that this edge borders exactly 1 hex (not 2)
        // An edge borders a hex if both its endpoints are vertices of that hex
        let hexCount = 0;
        for (const hex of boardGraph.hexes) {
          const hverts = new Set(
            boardGraph.hexToVertices.get(hexKey(hex))?.map((v) => `${v.q},${v.r},${v.d}`),
          );
          if (hverts.has(vk1) && hverts.has(vk2)) hexCount++;
        }
        if (hexCount === 1) {
          perimeterEdges.push([vk1, vk2]);
        }
      }
    }
  }

  // We need exactly 9 ports from the perimeter edges
  // Pick 9 evenly spaced edges
  const portTypes = shuffle([...PORT_TYPES], rng);

  // Sort perimeter edges by angle from center for even distribution
  const edgesWithAngle = perimeterEdges.map(([vk1, vk2]) => {
    // Compute midpoint angle
    const [q1, r1] = vk1.split(',').map(Number);
    const [q2, r2] = vk2.split(',').map(Number);
    const midQ = (q1 + q2) / 2;
    const midR = (r1 + r2) / 2;
    // Convert to approximate pixel for angle
    const x = Math.sqrt(3) * (midQ + midR / 2);
    const y = 1.5 * midR;
    const angle = Math.atan2(y, x);
    return { vk1, vk2, angle };
  });
  edgesWithAngle.sort((a, b) => a.angle - b.angle);

  // Pick 9 evenly-spaced edges
  const step = perimeterEdges.length / 9;
  const ports: Port[] = [];
  for (let i = 0; i < 9; i++) {
    const idx = Math.floor(i * step) % edgesWithAngle.length;
    const { vk1, vk2 } = edgesWithAngle[idx];
    ports.push({ type: portTypes[i], vertices: [vk1, vk2] });
  }

  return ports;
}

// Create shuffled dev card deck
export function createDevCardDeck(rng: () => number): DevelopmentCardType[] {
  return shuffle([...DEV_CARD_DECK_COMPOSITION], rng);
}

// Snake draft order for setup: [0,1,2,3,3,2,1,0]
export function getSetupOrder(numPlayers: number): number[] {
  const forward = Array.from({ length: numPlayers }, (_, i) => i);
  const reverse = [...forward].reverse();
  return [...forward, ...reverse];
}

const PLAYER_COLORS: PlayerColor[] = [
  PlayerColor.Red,
  PlayerColor.Blue,
  PlayerColor.White,
  PlayerColor.Orange,
];

// Create initial player state
function createPlayer(id: string, name: string, color: PlayerColor): PlayerState {
  return {
    id,
    name,
    color,
    resources: { ...EMPTY_RESOURCES },
    developmentCards: [],
    newDevCards: [],
    playedKnights: 0,
    hasPlayedDevCardThisTurn: false,
    settlements: INITIAL_SETTLEMENTS,
    cities: INITIAL_CITIES,
    roads: INITIAL_ROADS,
    ports: [],
  };
}

export interface GameConfig {
  gameId: string;
  seed?: number;
  playerNames: string[];
  playerIds: string[];
}

// Initialize a complete game state
export function initializeGame(config: GameConfig): GameState {
  const seed = config.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = createSeededRng(seed);
  const { hexTiles, robberHex } = generateBoard(seed);
  const boardGraph = buildBoardGraph();
  const ports = generatePorts(boardGraph, rng);
  const devCardDeck = createDevCardDeck(rng);

  // Shuffle player order so starting position is random
  const playerOrder = shuffle(
    config.playerIds.map((id, i) => ({ id, name: config.playerNames[i] || `Player ${i + 1}` })),
    rng,
  );
  const players = playerOrder.map((p, i) => createPlayer(p.id, p.name, PLAYER_COLORS[i]));

  return {
    gameId: config.gameId,
    randomSeed: seed,
    hexTiles,
    ports,
    vertexBuildings: {},
    edgeRoads: {},
    robberHex,
    players,
    currentPlayerIndex: 0,
    phase: GamePhase.SetupSettlement,
    turnNumber: 0,
    setupRound: 1,
    lastDiceRoll: null,
    devCardDeck,
    pendingTrade: null,
    playersNeedingToDiscard: [],
    robberStealTargets: null,
    longestRoadPlayer: null,
    longestRoadLength: 0,
    largestArmyPlayer: null,
    largestArmySize: 0,
    roadBuildingRoadsLeft: 0,
    log: [],
    winner: null,
    boardGraph,
  };
}

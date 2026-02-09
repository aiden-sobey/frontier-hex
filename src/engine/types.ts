// Coordinates
export interface AxialCoord {
  q: number;
  r: number;
}

// Vertex: identified by hex coord + direction (N or S for flat-top hexes)
export interface VertexId {
  q: number;
  r: number;
  d: 'N' | 'S';
}

// Edge: identified by hex coord + direction (NE, E, or SE — only 3 needed, canonicalized)
export interface EdgeId {
  q: number;
  r: number;
  d: 'NE' | 'E' | 'SE';
}

// Enums
export enum ResourceType {
  Wood = 'wood',
  Brick = 'brick',
  Sheep = 'sheep',
  Wheat = 'wheat',
  Ore = 'ore',
}
export enum TerrainType {
  Forest = 'forest',
  Hills = 'hills',
  Pasture = 'pasture',
  Fields = 'fields',
  Mountains = 'mountains',
  Desert = 'desert',
}
export enum BuildingType {
  Settlement = 'settlement',
  City = 'city',
}
export enum DevelopmentCardType {
  Knight = 'knight',
  VictoryPoint = 'victoryPoint',
  RoadBuilding = 'roadBuilding',
  YearOfPlenty = 'yearOfPlenty',
  Monopoly = 'monopoly',
}
export enum PlayerColor {
  Red = 'red',
  Blue = 'blue',
  White = 'white',
  Orange = 'orange',
}
export enum PortType {
  Generic = 'generic',
  Wood = 'wood',
  Brick = 'brick',
  Sheep = 'sheep',
  Wheat = 'wheat',
  Ore = 'ore',
}
export enum GamePhase {
  SetupSettlement = 'setupSettlement',
  SetupRoad = 'setupRoad',
  PreRoll = 'preRoll',
  Discard = 'discard',
  MoveRobber = 'moveRobber',
  StealResource = 'stealResource',
  Main = 'main',
  RoadBuilding = 'roadBuilding',
  GameOver = 'gameOver',
}

// Resource bundle
export interface ResourceBundle {
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
}

// Board tiles
export interface HexTile {
  coord: AxialCoord;
  terrain: TerrainType;
  numberToken: number | null;
}
export interface Port {
  type: PortType;
  vertices: [string, string];
}

// Buildings on the board
export interface VertexBuilding {
  type: BuildingType;
  playerIndex: number;
}
export interface EdgeRoad {
  playerIndex: number;
}

// Player state
export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColor;
  resources: ResourceBundle;
  developmentCards: DevelopmentCardType[];
  newDevCards: DevelopmentCardType[];
  playedKnights: number;
  hasPlayedDevCardThisTurn: boolean;
  settlements: number;
  cities: number;
  roads: number;
  ports: PortType[];
}

// Trade offer
export interface TradeOffer {
  fromPlayer: number;
  offering: ResourceBundle;
  requesting: ResourceBundle;
  responses: Record<number, 'accept' | 'reject'>;
}

// Game log entry
export interface GameLogEntry {
  message: string;
  timestamp: number;
  playerIndex?: number;
}

// Full game state (server-authoritative)
export interface GameState {
  gameId: string;
  randomSeed: number;
  hexTiles: HexTile[];
  ports: Port[];
  vertexBuildings: Record<string, VertexBuilding>;
  edgeRoads: Record<string, EdgeRoad>;
  robberHex: AxialCoord;
  players: PlayerState[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turnNumber: number;
  setupRound: number;
  lastDiceRoll: [number, number] | null;
  devCardDeck: DevelopmentCardType[];
  pendingTrade: TradeOffer | null;
  playersNeedingToDiscard: number[];
  robberStealTargets: number[] | null;
  longestRoadPlayer: number | null;
  longestRoadLength: number;
  largestArmyPlayer: number | null;
  largestArmySize: number;
  roadBuildingRoadsLeft: number;
  log: GameLogEntry[];
  winner: number | null;
  boardGraph: BoardGraph;
}

// Client view (redacted)
export interface ClientPlayerState extends Omit<PlayerState, 'developmentCards' | 'newDevCards'> {
  developmentCardCount: number;
  developmentCards: DevelopmentCardType[];
  newDevCards: DevelopmentCardType[];
}

export interface ClientGameState extends Omit<GameState, 'devCardDeck' | 'players' | 'randomSeed'> {
  players: ClientPlayerState[];
  devCardDeckSize: number;
}

// ---- Action types ----
export interface RollDiceAction {
  type: 'rollDice';
  playerIndex: number;
}
export interface BuildSettlementAction {
  type: 'buildSettlement';
  playerIndex: number;
  vertexKey: string;
}
export interface BuildRoadAction {
  type: 'buildRoad';
  playerIndex: number;
  edgeKey: string;
}
export interface BuildCityAction {
  type: 'buildCity';
  playerIndex: number;
  vertexKey: string;
}
export interface BuyDevCardAction {
  type: 'buyDevCard';
  playerIndex: number;
}
export interface PlayKnightAction {
  type: 'playKnight';
  playerIndex: number;
}
export interface PlayRoadBuildingAction {
  type: 'playRoadBuilding';
  playerIndex: number;
}
export interface PlayYearOfPlentyAction {
  type: 'playYearOfPlenty';
  playerIndex: number;
  resource1: ResourceType;
  resource2: ResourceType;
}
export interface PlayMonopolyAction {
  type: 'playMonopoly';
  playerIndex: number;
  resource: ResourceType;
}
export interface MoveRobberAction {
  type: 'moveRobber';
  playerIndex: number;
  hex: AxialCoord;
}
export interface StealResourceAction {
  type: 'stealResource';
  playerIndex: number;
  targetPlayerIndex: number;
}
export interface DiscardResourcesAction {
  type: 'discardResources';
  playerIndex: number;
  resources: ResourceBundle;
}
export interface TradeBankAction {
  type: 'tradeBank';
  playerIndex: number;
  give: ResourceType;
  receive: ResourceType;
}
export interface TradeOfferAction {
  type: 'tradeOffer';
  playerIndex: number;
  offering: ResourceBundle;
  requesting: ResourceBundle;
}
export interface TradeAcceptAction {
  type: 'tradeAccept';
  playerIndex: number;
}
export interface TradeRejectAction {
  type: 'tradeReject';
  playerIndex: number;
}
export interface TradeConfirmAction {
  type: 'tradeConfirm';
  playerIndex: number;
  targetPlayerIndex: number;
}
export interface TradeCancelAction {
  type: 'tradeCancel';
  playerIndex: number;
}
export interface EndTurnAction {
  type: 'endTurn';
  playerIndex: number;
}
export interface SetupPlaceSettlementAction {
  type: 'setupPlaceSettlement';
  playerIndex: number;
  vertexKey: string;
}
export interface SetupPlaceRoadAction {
  type: 'setupPlaceRoad';
  playerIndex: number;
  edgeKey: string;
}

export type GameAction =
  | RollDiceAction
  | BuildSettlementAction
  | BuildRoadAction
  | BuildCityAction
  | BuyDevCardAction
  | PlayKnightAction
  | PlayRoadBuildingAction
  | PlayYearOfPlentyAction
  | PlayMonopolyAction
  | MoveRobberAction
  | StealResourceAction
  | DiscardResourcesAction
  | TradeBankAction
  | TradeOfferAction
  | TradeAcceptAction
  | TradeRejectAction
  | TradeConfirmAction
  | TradeCancelAction
  | EndTurnAction
  | SetupPlaceSettlementAction
  | SetupPlaceRoadAction;

// Action result
export interface GameEvent {
  type: string;
  [key: string]: unknown;
}
export interface ActionResult {
  valid: boolean;
  error?: string;
  state: GameState;
  events: GameEvent[];
}

// Board graph (pre-computed topology)
export interface BoardGraph {
  hexes: AxialCoord[];
  vertices: VertexId[];
  edges: EdgeId[];
  vertexToHexes: Map<string, AxialCoord[]>;
  vertexToEdges: Map<string, EdgeId[]>;
  vertexToVertices: Map<string, VertexId[]>;
  edgeToVertices: Map<string, [VertexId, VertexId]>;
  hexToVertices: Map<string, VertexId[]>;
}

// Socket event types
export interface ClientToServerEvents {
  'join-game': (
    data: { gameId: string; playerId: string },
    ack: (res: { success: boolean; error?: string }) => void,
  ) => void;
  'game-action': (
    action: GameAction,
    ack: (res: { success: boolean; error?: string }) => void,
  ) => void;
  'chat-message': (message: string) => void;
}
export interface ServerToClientEvents {
  'full-state': (data: { state: ClientGameState }) => void;
  'state-update': (data: {
    state: ClientGameState;
    events: GameEvent[];
    action: GameAction;
  }) => void;
  'action-error': (data: { error: string }) => void;
  'player-status': (data: { playerId: string; status: 'connected' | 'disconnected' }) => void;
}

// Key serialization helpers
export function vertexKey(v: VertexId): string {
  return `${v.q},${v.r},${v.d}`;
}
export function edgeKey(e: EdgeId): string {
  return `${e.q},${e.r},${e.d}`;
}
export function parseVertexKey(key: string): VertexId {
  const [q, r, d] = key.split(',');
  return { q: parseInt(q), r: parseInt(r), d: d as 'N' | 'S' };
}
export function parseEdgeKey(key: string): EdgeId {
  const [q, r, d] = key.split(',');
  return { q: parseInt(q), r: parseInt(r), d: d as 'NE' | 'E' | 'SE' };
}
export function hexKey(c: AxialCoord): string {
  return `${c.q},${c.r}`;
}

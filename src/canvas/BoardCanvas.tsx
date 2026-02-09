import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Application, extend, useApplication } from '@pixi/react';
import { Container, Graphics, Text } from 'pixi.js';
import type { EventSystem, Ticker } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import type { GameState, ClientGameState, GameAction } from '~/engine/types';
import { vertexKey, edgeKey, GamePhase } from '~/engine/types';
import { useUIStore } from '~/stores/ui-store';
import { useGameStore } from '~/stores/game-store';
import { useGameActions } from '~/hooks/useGameActions';
import { hasResources } from '~/engine/validators/helpers';
import { SETTLEMENT_COST, ROAD_COST, CITY_COST } from '~/engine/constants';
import {
  getValidSettlementLocations,
  getValidRoadLocations,
  getValidCityLocations,
} from '~/engine/actions';
import { HexGrid } from './HexGrid';
import { Vertex } from './Vertex';
import { Edge } from './Edge';
import { RobberPiece } from './RobberPiece';
import { Port } from './Port';
import { OCEAN_COLOR } from './textures';

// Register PixiJS components for React JSX usage (including Viewport)
extend({ Container, Graphics, Text, Viewport });

// Type augmentation for <pixiViewport> JSX
declare module '@pixi/react' {
  interface PixiElements {
    pixiViewport: PixiElements['pixiContainer'] & {
      events?: EventSystem;
      ticker?: Ticker;
      screenWidth?: number;
      screenHeight?: number;
      worldWidth?: number;
      worldHeight?: number;
      passiveWheel?: boolean;
    };
  }
}

const WORLD_SIZE = 900;

interface BoardCanvasProps {
  gameState: GameState | ClientGameState;
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>;
}

export function BoardCanvas({ gameState, sendAction }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Application background={OCEAN_COLOR} resizeTo={containerRef}>
        <BoardContent gameState={gameState} sendAction={sendAction} />
      </Application>
    </div>
  );
}

function BoardContent({ gameState, sendAction }: BoardCanvasProps) {
  const { app } = useApplication();
  const viewportRef = useRef<Viewport | null>(null);

  const { hexTiles, ports, robberHex, vertexBuildings, edgeRoads, boardGraph } = gameState;

  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex);
  const selectedAction = useUIStore((s) => s.selectedAction);
  const highlightedVertices = useUIStore((s) => s.highlightedVertices);
  const highlightedEdges = useUIStore((s) => s.highlightedEdges);
  const highlightedHexes = useUIStore((s) => s.highlightedHexes);

  const actions = useGameActions(sendAction);

  // Convert UI store arrays to Sets for O(1) lookup
  const highlightedVertexSet = useMemo(() => new Set(highlightedVertices), [highlightedVertices]);
  const highlightedEdgeSet = useMemo(() => new Set(highlightedEdges), [highlightedEdges]);
  const highlightedHexSet = useMemo(() => new Set(highlightedHexes), [highlightedHexes]);

  // Auto-compute valid build locations during Main phase
  const validSettlementVertices = useMemo(() => {
    if (
      myPlayerIndex === null ||
      gameState.phase !== GamePhase.Main ||
      gameState.currentPlayerIndex !== myPlayerIndex
    )
      return new Set<string>();
    const player = gameState.players[myPlayerIndex];
    if (player.settlements <= 0 || !hasResources(player.resources, SETTLEMENT_COST))
      return new Set<string>();
    return new Set(getValidSettlementLocations(gameState as GameState, myPlayerIndex));
  }, [gameState, myPlayerIndex]);

  const validCityVertices = useMemo(() => {
    if (
      myPlayerIndex === null ||
      gameState.phase !== GamePhase.Main ||
      gameState.currentPlayerIndex !== myPlayerIndex
    )
      return new Set<string>();
    const player = gameState.players[myPlayerIndex];
    if (player.cities <= 0 || !hasResources(player.resources, CITY_COST))
      return new Set<string>();
    return new Set(getValidCityLocations(gameState as GameState, myPlayerIndex));
  }, [gameState, myPlayerIndex]);

  const validRoadEdges = useMemo(() => {
    if (
      myPlayerIndex === null ||
      gameState.phase !== GamePhase.Main ||
      gameState.currentPlayerIndex !== myPlayerIndex
    )
      return new Set<string>();
    const player = gameState.players[myPlayerIndex];
    if (player.roads <= 0 || !hasResources(player.resources, ROAD_COST))
      return new Set<string>();
    return new Set(getValidRoadLocations(gameState as GameState, myPlayerIndex));
  }, [gameState, myPlayerIndex]);

  // Merge auto-computed sets with UI store sets (setup/robber/road-building)
  const mergedVertexSet = useMemo(() => {
    const merged = new Set(highlightedVertexSet);
    for (const v of validSettlementVertices) merged.add(v);
    for (const v of validCityVertices) merged.add(v);
    return merged;
  }, [highlightedVertexSet, validSettlementVertices, validCityVertices]);

  const mergedEdgeSet = useMemo(() => {
    const merged = new Set(highlightedEdgeSet);
    for (const e of validRoadEdges) merged.add(e);
    return merged;
  }, [highlightedEdgeSet, validRoadEdges]);

  const handleVertexClick = useCallback(
    (vk: string) => {
      if (gameState.phase === GamePhase.SetupSettlement) {
        actions.setupPlaceSettlement(vk);
      } else if (validCityVertices.has(vk)) {
        actions.buildCity(vk);
      } else if (validSettlementVertices.has(vk)) {
        actions.buildSettlement(vk);
      }
    },
    [actions, gameState.phase, validCityVertices, validSettlementVertices],
  );

  const handleEdgeClick = useCallback(
    (ek: string) => {
      if (gameState.phase === GamePhase.SetupRoad) {
        actions.setupPlaceRoad(ek);
      } else if (validRoadEdges.has(ek) || highlightedEdgeSet.has(ek)) {
        actions.buildRoad(ek);
      }
    },
    [actions, gameState.phase, validRoadEdges, highlightedEdgeSet],
  );

  const handleHexClick = useCallback(
    (hk: string) => {
      if (selectedAction === 'moveRobber') {
        const [q, r] = hk.split(',').map(Number);
        actions.moveRobber({ q, r });
      }
    },
    [selectedAction, actions],
  );

  // Configure viewport plugins on mount
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.drag()
      .pinch()
      .wheel({ smooth: 5, percent: 0.1 })
      .decelerate({ friction: 0.93 })
      .clampZoom({ minScale: 0.3, maxScale: 3 });
    vp.fit(true, WORLD_SIZE, WORLD_SIZE);
    vp.moveCenter(0, 0);
  }, []);

  // Handle resize: update viewport screen dimensions
  const handleResize = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.resize(app.screen.width, app.screen.height);
    vp.fit(true, WORLD_SIZE, WORLD_SIZE);
    vp.moveCenter(0, 0);
  }, [app]);

  useEffect(() => {
    app.renderer.on('resize', handleResize);
    return () => {
      app.renderer.off('resize', handleResize);
    };
  }, [app, handleResize]);

  return (
    <pixiViewport
      ref={viewportRef}
      events={app.renderer.events}
      ticker={app.ticker}
      screenWidth={app.screen.width}
      screenHeight={app.screen.height}
      worldWidth={WORLD_SIZE}
      worldHeight={WORLD_SIZE}
      passiveWheel={false}
      eventMode="static"
    >
      {/* Hex tiles (bottom layer) */}
      <HexGrid
        hexTiles={hexTiles}
        highlightedHexes={highlightedHexSet}
        onHexClick={handleHexClick}
      />
      {/* Ports */}
      {ports.map((port, i) => (
        <Port key={i} port={port} />
      ))}
      {/* Edges (roads) - above hexes so highlights and roads are visible */}
      {boardGraph.edges.map((edge) => {
        const ek = edgeKey(edge);
        const isHighlighted = mergedEdgeSet.has(ek);
        return (
          <Edge
            key={ek}
            edge={edge}
            road={edgeRoads[ek]}
            highlighted={isHighlighted}
            onClick={isHighlighted ? () => handleEdgeClick(ek) : undefined}
          />
        );
      })}
      {/* Vertices (buildings) */}
      {boardGraph.vertices.map((vertex) => {
        const vk = vertexKey(vertex);
        const isHighlighted = mergedVertexSet.has(vk);
        return (
          <Vertex
            key={vk}
            vertex={vertex}
            building={vertexBuildings[vk]}
            highlighted={isHighlighted}
            onClick={isHighlighted ? () => handleVertexClick(vk) : undefined}
          />
        );
      })}
      {/* Robber */}
      <RobberPiece hex={robberHex} />
    </pixiViewport>
  );
}

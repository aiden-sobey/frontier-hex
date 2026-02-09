import { useCallback, useMemo } from 'react'
import { Application, extend } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import type { GameState, ClientGameState, GameAction } from '~/engine/types'
import { vertexKey, edgeKey, GamePhase } from '~/engine/types'
import { useUIStore } from '~/stores/ui-store'
import { useGameActions } from '~/hooks/useGameActions'
import { HexGrid } from './HexGrid'
import { Vertex } from './Vertex'
import { Edge } from './Edge'
import { RobberPiece } from './RobberPiece'
import { Port } from './Port'
import { OCEAN_COLOR } from './textures'

// Register PixiJS components for React JSX usage
extend({ Container, Graphics, Text })

interface BoardCanvasProps {
  gameState: GameState | ClientGameState
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>
}

export function BoardCanvas({ gameState, sendAction }: BoardCanvasProps) {
  const { hexTiles, ports, robberHex, vertexBuildings, edgeRoads, boardGraph } =
    gameState

  const selectedAction = useUIStore((s) => s.selectedAction)
  const highlightedVertices = useUIStore((s) => s.highlightedVertices)
  const highlightedEdges = useUIStore((s) => s.highlightedEdges)
  const highlightedHexes = useUIStore((s) => s.highlightedHexes)

  const actions = useGameActions(sendAction)

  // Convert arrays to Sets for O(1) lookup
  const highlightedVertexSet = useMemo(
    () => new Set(highlightedVertices),
    [highlightedVertices],
  )
  const highlightedEdgeSet = useMemo(
    () => new Set(highlightedEdges),
    [highlightedEdges],
  )
  const highlightedHexSet = useMemo(
    () => new Set(highlightedHexes),
    [highlightedHexes],
  )

  const handleVertexClick = useCallback(
    (vk: string) => {
      if (gameState.phase === GamePhase.SetupSettlement) {
        actions.setupPlaceSettlement(vk)
      } else if (selectedAction === 'buildSettlement') {
        actions.buildSettlement(vk)
      } else if (selectedAction === 'buildCity') {
        actions.buildCity(vk)
      }
    },
    [selectedAction, actions, gameState.phase],
  )

  const handleEdgeClick = useCallback(
    (ek: string) => {
      if (gameState.phase === GamePhase.SetupRoad) {
        actions.setupPlaceRoad(ek)
      } else if (selectedAction === 'buildRoad') {
        actions.buildRoad(ek)
      }
    },
    [selectedAction, actions, gameState.phase],
  )

  const handleHexClick = useCallback(
    (hk: string) => {
      if (selectedAction === 'moveRobber') {
        const [q, r] = hk.split(',').map(Number)
        actions.moveRobber({ q, r })
      }
    },
    [selectedAction, actions],
  )

  return (
    <Application
      background={OCEAN_COLOR}
      resizeTo={undefined}
      width={900}
      height={700}
    >
      <pixiContainer x={450} y={350}>
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
          const ek = edgeKey(edge)
          const isHighlighted = highlightedEdgeSet.has(ek)
          return (
            <Edge
              key={ek}
              edge={edge}
              road={edgeRoads[ek]}
              highlighted={isHighlighted}
              onClick={isHighlighted ? () => handleEdgeClick(ek) : undefined}
            />
          )
        })}
        {/* Vertices (buildings) */}
        {boardGraph.vertices.map((vertex) => {
          const vk = vertexKey(vertex)
          const isHighlighted = highlightedVertexSet.has(vk)
          return (
            <Vertex
              key={vk}
              vertex={vertex}
              building={vertexBuildings[vk]}
              highlighted={isHighlighted}
              onClick={isHighlighted ? () => handleVertexClick(vk) : undefined}
            />
          )
        })}
        {/* Robber */}
        <RobberPiece hex={robberHex} />
      </pixiContainer>
    </Application>
  )
}

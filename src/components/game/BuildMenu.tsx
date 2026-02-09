import { useGameStore } from '~/stores/game-store'
import { useUIStore } from '~/stores/ui-store'
import { useGameActions } from '~/hooks/useGameActions'
import { Button } from '~/components/ui/Button'
import { GamePhase } from '~/engine/types'
import type { GameAction } from '~/engine/types'
import {
  SETTLEMENT_COST,
  ROAD_COST,
  CITY_COST,
  DEV_CARD_COST,
} from '~/engine/constants'
import { hasResources } from '~/engine/validators/helpers'
import {
  getValidSettlementLocations,
  getValidRoadLocations,
  getValidCityLocations,
} from '~/engine/actions'
import type { SelectedAction } from '~/stores/ui-store'

interface BuildMenuProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>
}

export function BuildMenu({ sendAction }: BuildMenuProps) {
  const gameState = useGameStore((s) => s.gameState)
  const clientState = useGameStore((s) => s.clientState)
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex)
  const selectedAction = useUIStore((s) => s.selectedAction)
  const setSelectedAction = useUIStore((s) => s.setSelectedAction)
  const setHighlightedVertices = useUIStore((s) => s.setHighlightedVertices)
  const setHighlightedEdges = useUIStore((s) => s.setHighlightedEdges)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const actions = useGameActions(sendAction)

  const state = gameState ?? clientState
  if (!state || myPlayerIndex === null) return null

  const player = state.players[myPlayerIndex]
  const isMyTurn = state.currentPlayerIndex === myPlayerIndex
  const isMain = state.phase === GamePhase.Main

  const canBuildSettlement =
    isMyTurn && isMain && player.settlements > 0 && hasResources(player.resources, SETTLEMENT_COST)
  const canBuildRoad =
    isMyTurn && isMain && player.roads > 0 && hasResources(player.resources, ROAD_COST)
  const canBuildCity =
    isMyTurn && isMain && player.cities > 0 && hasResources(player.resources, CITY_COST)
  const canBuyDevCard =
    isMyTurn &&
    isMain &&
    hasResources(player.resources, DEV_CARD_COST) &&
    (gameState ? gameState.devCardDeck.length > 0 : true)

  function handleToggleAction(action: SelectedAction) {
    if (selectedAction === action) {
      clearSelection()
      return
    }

    // We need full gameState for location helpers; for online play these would come from server
    if (!gameState) {
      setSelectedAction(action)
      return
    }

    setSelectedAction(action)

    switch (action) {
      case 'buildSettlement': {
        const locs = getValidSettlementLocations(gameState, myPlayerIndex)
        setHighlightedVertices(locs)
        break
      }
      case 'buildRoad': {
        const locs = getValidRoadLocations(gameState, myPlayerIndex)
        setHighlightedEdges(locs)
        break
      }
      case 'buildCity': {
        const locs = getValidCityLocations(gameState, myPlayerIndex)
        setHighlightedVertices(locs)
        break
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={selectedAction === 'buildSettlement' ? 'primary' : 'secondary'}
        disabled={!canBuildSettlement}
        onClick={() => handleToggleAction('buildSettlement')}
        title="Settlement: 1 Wood, 1 Brick, 1 Sheep, 1 Wheat"
      >
        Settlement
      </Button>
      <Button
        variant={selectedAction === 'buildRoad' ? 'primary' : 'secondary'}
        disabled={!canBuildRoad}
        onClick={() => handleToggleAction('buildRoad')}
        title="Road: 1 Wood, 1 Brick"
      >
        Road
      </Button>
      <Button
        variant={selectedAction === 'buildCity' ? 'primary' : 'secondary'}
        disabled={!canBuildCity}
        onClick={() => handleToggleAction('buildCity')}
        title="City: 2 Wheat, 3 Ore"
      >
        City
      </Button>
      <Button
        variant="secondary"
        disabled={!canBuyDevCard}
        onClick={() => actions.buyDevCard()}
        title="Dev Card: 1 Sheep, 1 Wheat, 1 Ore"
      >
        Dev Card
      </Button>
      {isMyTurn && isMain && (
        <Button variant="danger" onClick={() => actions.endTurn()}>
          End Turn
        </Button>
      )}
    </div>
  )
}

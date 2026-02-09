import { useState } from 'react'
import { useGameStore } from '~/stores/game-store'
import { useUIStore } from '~/stores/ui-store'
import { useGameActions } from '~/hooks/useGameActions'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'
import {
  DevelopmentCardType,
  GamePhase,
  ResourceType,
} from '~/engine/types'
import type { GameAction } from '~/engine/types'
import { RESOURCE_TYPES } from '~/engine/constants'

const DEV_CARD_INFO: Record<DevelopmentCardType, { label: string; description: string }> = {
  [DevelopmentCardType.Knight]: {
    label: 'Knight',
    description: 'Move the robber and steal a resource.',
  },
  [DevelopmentCardType.VictoryPoint]: {
    label: 'Victory Point',
    description: '+1 VP (always kept, never played).',
  },
  [DevelopmentCardType.RoadBuilding]: {
    label: 'Road Building',
    description: 'Build 2 roads for free.',
  },
  [DevelopmentCardType.YearOfPlenty]: {
    label: 'Year of Plenty',
    description: 'Take any 2 resources from the bank.',
  },
  [DevelopmentCardType.Monopoly]: {
    label: 'Monopoly',
    description: 'Take all of one resource from all players.',
  },
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.Wood]: 'Wood',
  [ResourceType.Brick]: 'Brick',
  [ResourceType.Sheep]: 'Sheep',
  [ResourceType.Wheat]: 'Wheat',
  [ResourceType.Ore]: 'Ore',
}

interface DevCardHandProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>
}

export function DevCardHand({ sendAction }: DevCardHandProps) {
  const gameState = useGameStore((s) => s.gameState)
  const clientState = useGameStore((s) => s.clientState)
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex)
  const showDevCards = useUIStore((s) => s.showDevCards)
  const setShowDevCards = useUIStore((s) => s.setShowDevCards)
  const actions = useGameActions(sendAction)

  const [yopPicking, setYopPicking] = useState(false)
  const [yopFirst, setYopFirst] = useState<ResourceType | null>(null)
  const [monopolyPicking, setMonopolyPicking] = useState(false)

  const state = gameState ?? clientState
  if (!state || myPlayerIndex === null) return null

  const player = state.players[myPlayerIndex]
  const isMyTurn = state.currentPlayerIndex === myPlayerIndex
  const canPlay =
    isMyTurn &&
    !player.hasPlayedDevCardThisTurn &&
    (state.phase === GamePhase.Main || state.phase === GamePhase.PreRoll)

  const cards = player.developmentCards
  const newCards = new Set(
    'newDevCards' in player ? (player.newDevCards as DevelopmentCardType[]) : [],
  )

  // Count cards by type
  const cardCounts = new Map<DevelopmentCardType, number>()
  for (const card of cards) {
    cardCounts.set(card, (cardCounts.get(card) ?? 0) + 1)
  }

  // Count new (unplayable) cards per type
  const newCardCounts = new Map<DevelopmentCardType, number>()
  if ('newDevCards' in player) {
    for (const card of player.newDevCards as DevelopmentCardType[]) {
      newCardCounts.set(card, (newCardCounts.get(card) ?? 0) + 1)
    }
  }

  function handlePlay(cardType: DevelopmentCardType) {
    switch (cardType) {
      case DevelopmentCardType.Knight:
        actions.playKnight()
        break
      case DevelopmentCardType.RoadBuilding:
        actions.playRoadBuilding()
        break
      case DevelopmentCardType.YearOfPlenty:
        setYopPicking(true)
        setYopFirst(null)
        return // Don't close modal yet
      case DevelopmentCardType.Monopoly:
        setMonopolyPicking(true)
        return // Don't close modal yet
      case DevelopmentCardType.VictoryPoint:
        return // VP cards are never played
    }
    setShowDevCards(false)
  }

  function handleYopSelect(resource: ResourceType) {
    if (!yopFirst) {
      setYopFirst(resource)
    } else {
      actions.playYearOfPlenty(yopFirst, resource)
      setYopPicking(false)
      setYopFirst(null)
      setShowDevCards(false)
    }
  }

  function handleMonopolySelect(resource: ResourceType) {
    actions.playMonopoly(resource)
    setMonopolyPicking(false)
    setShowDevCards(false)
  }

  const totalCards = cards.length

  return (
    <div>
      <button
        onClick={() => setShowDevCards(!showDevCards)}
        className="w-full text-left px-3 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <span className="font-medium text-sm">Dev Cards</span>
        <span className="ml-2 text-gray-400 text-xs">({totalCards})</span>
      </button>

      <Modal
        open={showDevCards}
        onClose={() => {
          setShowDevCards(false)
          setYopPicking(false)
          setMonopolyPicking(false)
          setYopFirst(null)
        }}
        title="Development Cards"
      >
        {yopPicking ? (
          <div>
            <p className="text-sm text-gray-300 mb-3">
              {yopFirst
                ? `First pick: ${RESOURCE_LABELS[yopFirst]}. Choose second resource:`
                : 'Choose first resource:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {RESOURCE_TYPES.map((r) => (
                <Button key={r} variant="secondary" onClick={() => handleYopSelect(r)}>
                  {RESOURCE_LABELS[r]}
                </Button>
              ))}
            </div>
          </div>
        ) : monopolyPicking ? (
          <div>
            <p className="text-sm text-gray-300 mb-3">Choose a resource to monopolize:</p>
            <div className="flex flex-wrap gap-2">
              {RESOURCE_TYPES.map((r) => (
                <Button key={r} variant="secondary" onClick={() => handleMonopolySelect(r)}>
                  {RESOURCE_LABELS[r]}
                </Button>
              ))}
            </div>
          </div>
        ) : totalCards === 0 ? (
          <p className="text-gray-400 text-sm">No development cards in hand.</p>
        ) : (
          <div className="space-y-2">
            {Array.from(cardCounts.entries()).map(([cardType, count]) => {
              const info = DEV_CARD_INFO[cardType]
              const newCount = newCardCounts.get(cardType) ?? 0
              const playableCount = count - newCount
              const isVP = cardType === DevelopmentCardType.VictoryPoint
              const isPlayable = canPlay && playableCount > 0 && !isVP

              return (
                <div
                  key={cardType}
                  className="flex items-center justify-between p-2 rounded bg-gray-700"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {info.label}
                      <span className="text-gray-400 ml-1">x{count}</span>
                      {newCount > 0 && (
                        <span className="text-yellow-500 text-xs ml-1">
                          ({newCount} new)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{info.description}</div>
                  </div>
                  {!isVP && (
                    <Button
                      variant="primary"
                      disabled={!isPlayable}
                      onClick={() => handlePlay(cardType)}
                    >
                      Play
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}

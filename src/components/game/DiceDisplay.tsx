import { useGameStore } from '~/stores/game-store'
import { useGameActions } from '~/hooks/useGameActions'
import { Button } from '~/components/ui/Button'
import { GamePhase } from '~/engine/types'
import type { GameAction } from '~/engine/types'

// Simple unicode dice faces
const DICE_FACES: Record<number, string> = {
  1: '\u2680',
  2: '\u2681',
  3: '\u2682',
  4: '\u2683',
  5: '\u2684',
  6: '\u2685',
}

interface DiceDisplayProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>
}

export function DiceDisplay({ sendAction }: DiceDisplayProps) {
  const gameState = useGameStore((s) => s.gameState)
  const clientState = useGameStore((s) => s.clientState)
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex)
  const actions = useGameActions(sendAction)

  const state = gameState ?? clientState
  if (!state || myPlayerIndex === null) return null

  const isMyTurn = state.currentPlayerIndex === myPlayerIndex
  const isPreRoll = state.phase === GamePhase.PreRoll
  const lastRoll = state.lastDiceRoll

  return (
    <div className="flex items-center gap-2">
      {lastRoll ? (
        <div className="flex items-center gap-1">
          <span className="text-3xl" title={`Die 1: ${lastRoll[0]}`}>
            {DICE_FACES[lastRoll[0]]}
          </span>
          <span className="text-3xl" title={`Die 2: ${lastRoll[1]}`}>
            {DICE_FACES[lastRoll[1]]}
          </span>
          <span className="text-sm text-gray-400 ml-1">
            = {lastRoll[0] + lastRoll[1]}
          </span>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">No roll yet</div>
      )}
      {isMyTurn && isPreRoll && (
        <Button variant="primary" onClick={() => actions.rollDice()}>
          Roll Dice
        </Button>
      )}
    </div>
  )
}

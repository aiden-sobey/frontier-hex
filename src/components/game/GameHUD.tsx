import { Suspense, lazy } from 'react'
import { useGameStore } from '~/stores/game-store'
import { useUIStore } from '~/stores/ui-store'
import { PlayerPanel } from './PlayerPanel'
import { ResourceBar } from './ResourceBar'
import { BuildMenu } from './BuildMenu'
import { DiceDisplay } from './DiceDisplay'
import { DevCardHand } from './DevCardHand'
import { TradeDialog } from './TradeDialog'
import { VictoryOverlay } from './VictoryOverlay'
import { ChatPanel } from './ChatPanel'
import { PhaseIndicator } from './PhaseIndicator'
import { Button } from '~/components/ui/Button'
import type { GameAction } from '~/engine/types'

const BoardCanvas = lazy(() =>
  import('~/canvas/BoardCanvas').then((m) => ({ default: m.BoardCanvas })),
)

interface GameHUDProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>
}

export function GameHUD({ sendAction }: GameHUDProps) {
  const gameState = useGameStore((s) => s.gameState)
  const clientState = useGameStore((s) => s.clientState)
  const setShowTradeDialog = useUIStore((s) => s.setShowTradeDialog)

  const state = gameState ?? clientState
  if (!state) return null

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Top: Player panels */}
      <div className="flex-none px-4 py-2 bg-gray-900/90 border-b border-gray-800">
        <PlayerPanel />
      </div>

      {/* Middle: Board + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: Canvas + Phase indicator */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Phase indicator overlay */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 w-auto">
            <PhaseIndicator sendAction={sendAction} />
          </div>

          <Suspense
            fallback={
              <div className="w-[900px] h-[700px] flex items-center justify-center bg-gray-800 rounded-lg">
                <p className="text-gray-400">Loading canvas...</p>
              </div>
            }
          >
            <BoardCanvas gameState={state} sendAction={sendAction} />
          </Suspense>
        </div>

        {/* Right sidebar */}
        <div className="flex-none w-60 flex flex-col border-l border-gray-800 bg-gray-900/90">
          <div className="p-2">
            <DevCardHand sendAction={sendAction} />
          </div>
          <div className="p-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowTradeDialog(true)}
            >
              Trade
            </Button>
          </div>
          <div className="flex-1 p-2 min-h-0">
            <ChatPanel />
          </div>
        </div>
      </div>

      {/* Bottom: Resources + Build + Dice */}
      <div className="flex-none px-4 py-2 bg-gray-900/90 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <ResourceBar />
          <BuildMenu sendAction={sendAction} />
          <DiceDisplay sendAction={sendAction} />
        </div>
      </div>

      {/* Overlays */}
      <TradeDialog sendAction={sendAction} />
      <VictoryOverlay />
    </div>
  )
}

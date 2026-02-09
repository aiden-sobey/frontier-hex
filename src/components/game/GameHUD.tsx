import { Suspense, lazy } from 'react';
import { useGameStore } from '~/stores/game-store';
import { useUIStore } from '~/stores/ui-store';
import { PlayerPanel } from './PlayerPanel';
import { ResourceBar } from './ResourceBar';
import { BuildMenu } from './BuildMenu';
import { DiceDisplay } from './DiceDisplay';
import { DevCardHand } from './DevCardHand';
import { TradeDialog } from './TradeDialog';
import { VictoryOverlay } from './VictoryOverlay';
import { ChatPanel } from './ChatPanel';
import { PhaseIndicator } from './PhaseIndicator';
import { Button } from '~/components/ui/Button';
import type { GameAction } from '~/engine/types';

const BoardCanvas = lazy(() =>
  import('~/canvas/BoardCanvas').then((m) => ({ default: m.BoardCanvas })),
);

interface GameHUDProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>;
}

export function GameHUD({ sendAction }: GameHUDProps) {
  const gameState = useGameStore((s) => s.gameState);
  const clientState = useGameStore((s) => s.clientState);
  const setShowTradeDialog = useUIStore((s) => s.setShowTradeDialog);

  const state = gameState ?? clientState;
  if (!state) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-900">
      {/* Top: Player panels */}
      <div className="flex-none border-b border-gray-800 bg-gray-900/90 px-4 py-2">
        <PlayerPanel />
      </div>

      {/* Middle: Board + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Canvas + Phase indicator */}
        <div className="relative flex flex-1 flex-col items-center justify-center">
          {/* Phase indicator overlay */}
          <div className="absolute top-2 left-1/2 z-10 w-auto -translate-x-1/2">
            <PhaseIndicator sendAction={sendAction} />
          </div>

          <Suspense
            fallback={
              <div className="flex h-[700px] w-[900px] items-center justify-center rounded-lg bg-gray-800">
                <p className="text-gray-400">Loading canvas...</p>
              </div>
            }
          >
            <BoardCanvas gameState={state} sendAction={sendAction} />
          </Suspense>
        </div>

        {/* Right sidebar */}
        <div className="flex w-60 flex-none flex-col border-l border-gray-800 bg-gray-900/90">
          <div className="p-2">
            <DevCardHand sendAction={sendAction} />
          </div>
          <div className="p-2">
            <Button variant="secondary" className="w-full" onClick={() => setShowTradeDialog(true)}>
              Trade
            </Button>
          </div>
          <div className="min-h-0 flex-1 p-2">
            <ChatPanel />
          </div>
        </div>
      </div>

      {/* Bottom: Resources + Build + Dice */}
      <div className="flex-none border-t border-gray-800 bg-gray-900/90 px-4 py-2">
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
  );
}

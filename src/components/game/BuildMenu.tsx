import { useGameStore } from '~/stores/game-store';
import { useGameActions } from '~/hooks/useGameActions';
import { Button } from '~/components/ui/Button';
import { GamePhase } from '~/engine/types';
import type { GameAction } from '~/engine/types';
import { DEV_CARD_COST } from '~/engine/constants';
import { hasResources } from '~/engine/validators/helpers';

interface BuildMenuProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>;
}

export function BuildMenu({ sendAction }: BuildMenuProps) {
  const gameState = useGameStore((s) => s.gameState);
  const clientState = useGameStore((s) => s.clientState);
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex);
  const actions = useGameActions(sendAction);

  const state = gameState ?? clientState;
  if (!state || myPlayerIndex === null) return null;

  const player = state.players[myPlayerIndex];
  const isMyTurn = state.currentPlayerIndex === myPlayerIndex;
  const isMain = state.phase === GamePhase.Main;

  const canBuyDevCard =
    isMyTurn &&
    isMain &&
    hasResources(player.resources, DEV_CARD_COST) &&
    (gameState ? gameState.devCardDeck.length > 0 : true);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        disabled={!canBuyDevCard}
        onClick={() => actions.buyDevCard()}
        title="Dev Card: 1 Sheep, 1 Wheat, 1 Ore"
      >
        Dev Card
      </Button>
    </div>
  );
}

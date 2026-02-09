import { useState, useEffect } from 'react';
import { useGameStore } from '~/stores/game-store';
import { useGameActions } from '~/hooks/useGameActions';
import { Button } from '~/components/ui/Button';
import { Modal } from '~/components/ui/Modal';
import { DevelopmentCardType, GamePhase, ResourceType } from '~/engine/types';
import type { GameAction } from '~/engine/types';
import { RESOURCE_TYPES } from '~/engine/constants';

const DEV_CARD_INFO: Record<
  DevelopmentCardType,
  { label: string; description: string; icon: string; colors: string }
> = {
  [DevelopmentCardType.Knight]: {
    label: 'Knight',
    description: 'Move the robber and steal a resource.',
    icon: '\u2694\uFE0F',
    colors: 'border-blue-500 bg-blue-900/90',
  },
  [DevelopmentCardType.VictoryPoint]: {
    label: 'Victory Point',
    description: '+1 VP (always kept, never played).',
    icon: '\u2B50',
    colors: 'border-yellow-500 bg-yellow-900/90',
  },
  [DevelopmentCardType.RoadBuilding]: {
    label: 'Road Building',
    description: 'Build 2 roads for free.',
    icon: '\uD83D\uDEE4\uFE0F',
    colors: 'border-green-500 bg-green-900/90',
  },
  [DevelopmentCardType.YearOfPlenty]: {
    label: 'Year of Plenty',
    description: 'Take any 2 resources from the bank.',
    icon: '\uD83C\uDF3E',
    colors: 'border-purple-500 bg-purple-900/90',
  },
  [DevelopmentCardType.Monopoly]: {
    label: 'Monopoly',
    description: 'Take all of one resource from all players.',
    icon: '\uD83D\uDC51',
    colors: 'border-red-500 bg-red-900/90',
  },
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.Wood]: 'Wood',
  [ResourceType.Brick]: 'Brick',
  [ResourceType.Sheep]: 'Sheep',
  [ResourceType.Wheat]: 'Wheat',
  [ResourceType.Ore]: 'Ore',
};

const RESOURCE_TILE: Record<ResourceType, { icon: string; bg: string }> = {
  [ResourceType.Wood]: { icon: '🪵', bg: 'bg-green-800' },
  [ResourceType.Brick]: { icon: '🧱', bg: 'bg-red-800' },
  [ResourceType.Sheep]: { icon: '🐑', bg: 'bg-lime-700' },
  [ResourceType.Wheat]: { icon: '🌾', bg: 'bg-yellow-700' },
  [ResourceType.Ore]: { icon: '⛏️', bg: 'bg-gray-600' },
};

const ZERO_PICKS: Record<ResourceType, number> = {
  [ResourceType.Wood]: 0,
  [ResourceType.Brick]: 0,
  [ResourceType.Sheep]: 0,
  [ResourceType.Wheat]: 0,
  [ResourceType.Ore]: 0,
};

interface DevCardHandProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>;
}

export function DevCardHand({ sendAction }: DevCardHandProps) {
  const gameState = useGameStore((s) => s.gameState);
  const clientState = useGameStore((s) => s.clientState);
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex);
  const actions = useGameActions(sendAction);

  const [yopPicking, setYopPicking] = useState(false);
  const [yopPicks, setYopPicks] = useState<Record<ResourceType, number>>({ ...ZERO_PICKS });
  const [monopolyPicking, setMonopolyPicking] = useState(false);

  // Reset picks when modal opens or closes
  useEffect(() => {
    if (yopPicking) {
      setYopPicks({ ...ZERO_PICKS });
    }
  }, [yopPicking]);

  const totalPicked = Object.values(yopPicks).reduce((a, b) => a + b, 0);

  const state = gameState ?? clientState;
  if (!state || myPlayerIndex === null) return null;

  const player = state.players[myPlayerIndex];
  const isMyTurn = state.currentPlayerIndex === myPlayerIndex;
  const canPlay =
    isMyTurn &&
    !player.hasPlayedDevCardThisTurn &&
    (state.phase === GamePhase.Main || state.phase === GamePhase.PreRoll);

  const playableCards = player.developmentCards;
  const newCardsArray: DevelopmentCardType[] =
    'newDevCards' in player ? (player.newDevCards as DevelopmentCardType[]) : [];

  // Build individual card list with playability info
  const allCards: { type: DevelopmentCardType; isNew: boolean }[] = [
    ...playableCards.map((type) => ({ type, isNew: false })),
    ...newCardsArray.map((type) => ({ type, isNew: true })),
  ];

  if (allCards.length === 0) return null;

  function handlePlay(cardType: DevelopmentCardType) {
    switch (cardType) {
      case DevelopmentCardType.Knight:
        actions.playKnight();
        break;
      case DevelopmentCardType.RoadBuilding:
        actions.playRoadBuilding();
        break;
      case DevelopmentCardType.YearOfPlenty:
        setYopPicking(true);
        return;
      case DevelopmentCardType.Monopoly:
        setMonopolyPicking(true);
        return;
      case DevelopmentCardType.VictoryPoint:
        return;
    }
  }

  function incrementYop(resource: ResourceType) {
    if (totalPicked < 2) {
      setYopPicks((prev) => ({ ...prev, [resource]: prev[resource] + 1 }));
    }
  }

  function decrementYop(resource: ResourceType) {
    setYopPicks((prev) => ({ ...prev, [resource]: Math.max(0, prev[resource] - 1) }));
  }

  function confirmYop() {
    const picked: ResourceType[] = [];
    for (const r of RESOURCE_TYPES) {
      for (let i = 0; i < yopPicks[r]; i++) picked.push(r);
    }
    if (picked.length === 2) {
      actions.playYearOfPlenty(picked[0], picked[1]);
      setYopPicking(false);
    }
  }

  function handleMonopolySelect(resource: ResourceType) {
    actions.playMonopoly(resource);
    setMonopolyPicking(false);
  }

  return (
    <>
      <div className="absolute bottom-full left-1/2 z-0 flex -translate-x-1/2 translate-y-[36px] items-end gap-1.5">
        {allCards.map((card, i) => {
          const info = DEV_CARD_INFO[card.type];
          const isVP = card.type === DevelopmentCardType.VictoryPoint;
          const isPlayable = canPlay && !card.isNew && !isVP;

          return (
            <div
              key={i}
              className={`flex h-20 w-14 flex-col items-center justify-start rounded-lg border-2 pt-2 shadow-lg transition-transform duration-150 ${info.colors} ${isPlayable ? 'cursor-pointer hover:-translate-y-3' : 'cursor-default opacity-50'}`}
              onClick={() => isPlayable && handlePlay(card.type)}
              title={info.description}
            >
              <span className="text-xl">{info.icon}</span>
              <span className="mt-1 text-center text-[9px] font-bold leading-tight text-white">
                {info.label}
              </span>
              {card.isNew && (
                <span className="mt-0.5 text-[8px] font-bold text-yellow-400">NEW</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Resource picker modals for YoP and Monopoly */}
      <Modal
        open={yopPicking}
        onClose={() => setYopPicking(false)}
        title="Year of Plenty"
      >
        <div>
          <p className="mb-3 text-sm text-gray-300">Pick 2 resources from the bank:</p>
          <div className="flex justify-center gap-3">
            {RESOURCE_TYPES.map((r) => {
              const tile = RESOURCE_TILE[r];
              const count = yopPicks[r];
              return (
                <div
                  key={r}
                  className={`relative flex h-16 w-14 cursor-pointer flex-col items-center
                    justify-center rounded-lg ${tile.bg} transition-transform
                    ${totalPicked < 2 || count > 0 ? 'hover:scale-105' : 'opacity-40 cursor-default'}`}
                  onClick={() => incrementYop(r)}
                >
                  <span className="text-2xl">{tile.icon}</span>
                  <span className="text-[10px] font-medium text-white/80">
                    {RESOURCE_LABELS[r]}
                  </span>
                  {count > 0 && (
                    <div
                      className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center
                        rounded-full bg-white text-xs font-bold text-gray-900 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        decrementYop(r);
                      }}
                    >
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            disabled={totalPicked !== 2}
            onClick={confirmYop}
            className="mt-4 w-full"
          >
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal
        open={monopolyPicking}
        onClose={() => setMonopolyPicking(false)}
        title="Monopoly"
      >
        <div>
          <p className="mb-3 text-sm text-gray-300">Choose a resource to monopolize:</p>
          <div className="flex flex-wrap gap-2">
            {RESOURCE_TYPES.map((r) => (
              <Button key={r} variant="secondary" onClick={() => handleMonopolySelect(r)}>
                {RESOURCE_LABELS[r]}
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}

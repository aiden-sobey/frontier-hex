import { ResourceType } from '~/engine/types';
import type { ResourceBundle } from '~/engine/types';
import { useGameStore } from '~/stores/game-store';
import { useUIStore } from '~/stores/ui-store';

const RESOURCE_CONFIG: Record<ResourceType, { label: string; icon: string; bg: string }> = {
  [ResourceType.Wood]: { label: 'Wood', icon: '\u{1FAB5}', bg: 'bg-green-800' },
  [ResourceType.Brick]: { label: 'Brick', icon: '\u{1F9F1}', bg: 'bg-red-800' },
  [ResourceType.Sheep]: { label: 'Sheep', icon: '\u{1F411}', bg: 'bg-lime-700' },
  [ResourceType.Wheat]: { label: 'Wheat', icon: '\u{1F33E}', bg: 'bg-yellow-700' },
  [ResourceType.Ore]: { label: 'Ore', icon: '\u26CF\uFE0F', bg: 'bg-gray-600' },
};

const RESOURCE_ORDER: ResourceType[] = [
  ResourceType.Wood,
  ResourceType.Brick,
  ResourceType.Sheep,
  ResourceType.Wheat,
  ResourceType.Ore,
];

export function ResourceBar() {
  const gameState = useGameStore((s) => s.gameState);
  const clientState = useGameStore((s) => s.clientState);
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex);
  const setTradeOfferResource = useUIStore((s) => s.setTradeOfferResource);
  const setShowTradeDialog = useUIStore((s) => s.setShowTradeDialog);

  const state = gameState ?? clientState;
  if (!state || myPlayerIndex === null) return null;

  const player = state.players[myPlayerIndex];
  if (!player) return null;

  const resources: ResourceBundle = player.resources;

  return (
    <div className="flex items-center gap-2">
      {RESOURCE_ORDER.map((type) => {
        const config = RESOURCE_CONFIG[type];
        const count = resources[type];
        return (
          <div
            key={type}
            className={`${config.bg} relative flex h-16 w-14 cursor-pointer flex-col items-center
              justify-center rounded-lg transition-transform hover:scale-105`}
            title={config.label}
            onClick={() => {
              setTradeOfferResource(type);
              setShowTradeDialog(true);
            }}
          >
            <span className="text-2xl">{config.icon}</span>
            <span className="text-[10px] font-medium text-white/80">{config.label}</span>
            {count > 0 && (
              <div
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center
                  rounded-full bg-white text-xs font-bold text-gray-900"
              >
                {count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

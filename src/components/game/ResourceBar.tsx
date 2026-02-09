import { ResourceType } from '~/engine/types';
import type { ResourceBundle } from '~/engine/types';
import { useGameStore } from '~/stores/game-store';

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

  const state = gameState ?? clientState;
  if (!state || myPlayerIndex === null) return null;

  const player = state.players[myPlayerIndex];
  if (!player) return null;

  const resources: ResourceBundle = player.resources;

  return (
    <div className="flex items-center gap-1.5">
      {RESOURCE_ORDER.map((type) => {
        const config = RESOURCE_CONFIG[type];
        const count = resources[type];
        return (
          <div
            key={type}
            className={`${config.bg} flex min-w-[60px] items-center justify-center gap-1.5 rounded px-2.5 py-1.5`}
            title={config.label}
          >
            <span className="text-lg">{config.icon}</span>
            <span className="text-sm font-bold text-white">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

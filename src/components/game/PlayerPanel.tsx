import { useGameStore } from '~/stores/game-store';
import { PlayerColor } from '~/engine/types';
import type { PlayerState, ClientPlayerState } from '~/engine/types';
import { totalResources } from '~/engine/validators/helpers';

const PLAYER_COLOR_CSS: Record<PlayerColor, string> = {
  [PlayerColor.Red]: 'border-red-500 bg-red-500/10',
  [PlayerColor.Blue]: 'border-blue-500 bg-blue-500/10',
  [PlayerColor.White]: 'border-gray-300 bg-gray-300/10',
  [PlayerColor.Orange]: 'border-orange-500 bg-orange-500/10',
};

const PLAYER_COLOR_AVATAR: Record<PlayerColor, string> = {
  [PlayerColor.Red]: 'bg-red-500',
  [PlayerColor.Blue]: 'bg-blue-500',
  [PlayerColor.White]: 'bg-gray-300',
  [PlayerColor.Orange]: 'bg-orange-500',
};

function getVP(
  player: PlayerState | ClientPlayerState,
  playerIndex: number,
  longestRoadPlayer: number | null,
  largestArmyPlayer: number | null,
): number {
  const settlementsOnBoard = 5 - player.settlements;
  const citiesOnBoard = 4 - player.cities;
  let vp = settlementsOnBoard + citiesOnBoard * 2;

  if (longestRoadPlayer === playerIndex) vp += 2;
  if (largestArmyPlayer === playerIndex) vp += 2;

  // VP from dev cards are hidden until game over, skip for now
  return vp;
}

function PersonSilhouette() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white/80">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function CardIcon({
  bgColor,
  badgeColor,
  count,
}: {
  bgColor: string;
  badgeColor: string;
  count: number;
}) {
  return (
    <div className="relative flex-shrink-0">
      <div className={`h-[18px] w-3 rounded-sm border ${bgColor}`} />
      <div
        className={`absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full ${badgeColor}`}
      >
        <span className="text-[9px] font-bold text-white">{count}</span>
      </div>
    </div>
  );
}

function CrownBadge({ vp }: { vp: number }) {
  return (
    <div className="absolute -top-3 -right-2.5 w-6 h-6">
      <svg viewBox="0 0 28 28" className="w-full h-full drop-shadow-md">
        <defs>
          <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
        {/* Crown body */}
        <path
          d="M5 21 L3 10 L8.5 14 L14 6 L19.5 14 L25 10 L23 21Z"
          fill="url(#crownGrad)"
          stroke="#a16207"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        {/* Base band */}
        <rect x="5" y="19.5" width="18" height="2.5" rx="0.5" fill="#ca8a04" opacity="0.35" />
        {/* Tip jewels */}
        <circle cx="3" cy="10" r="1.8" fill="#fde047" stroke="#a16207" strokeWidth="0.5" />
        <circle cx="14" cy="6" r="1.8" fill="#fde047" stroke="#a16207" strokeWidth="0.5" />
        <circle cx="25" cy="10" r="1.8" fill="#fde047" stroke="#a16207" strokeWidth="0.5" />
        {/* VP number */}
        <text
          x="14"
          y="18.5"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="#422006"
        >
          {vp}
        </text>
      </svg>
    </div>
  );
}

export function PlayerPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const clientState = useGameStore((s) => s.clientState);
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex);

  const state = gameState ?? clientState;
  if (!state) return null;

  return (
    <div className="flex gap-2">
      {state.players.map((player, i) => {
        const isCurrentTurn = state.currentPlayerIndex === i;
        const isMe = i === myPlayerIndex;
        const color = player.color;
        const resourceCount = totalResources(player.resources);
        const devCardCount =
          'developmentCardCount' in player
            ? (player as ClientPlayerState).developmentCardCount
            : (player as PlayerState).developmentCards.length;
        const vp = getVP(player, i, state.longestRoadPlayer, state.largestArmyPlayer);
        const hasLR = state.longestRoadPlayer === i;
        const hasLA = state.largestArmyPlayer === i;

        return (
          <div
            key={i}
            className={`rounded-lg border-2 px-1.5 py-1.5 md:px-2 md:py-1 transition-all flex flex-col items-center gap-1 md:flex-row md:gap-2 ${PLAYER_COLOR_CSS[color]} ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''} ${isMe ? 'ring-1 ring-white/30' : ''}`}
          >
            {/* Avatar with crown VP badge */}
            <div className="relative flex-shrink-0">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full ${PLAYER_COLOR_AVATAR[color]}`}
              >
                <PersonSilhouette />
              </div>
              <CrownBadge vp={vp} />
            </div>

            {/* Name + LR/LA */}
            <div className="text-center md:text-left md:min-w-0 md:flex-1">
              <span className="block truncate text-[10px] md:text-xs font-semibold">
                {player.name}
                {isMe && <span className="ml-0.5 text-[10px] text-gray-400">(you)</span>}
              </span>
              {(hasLR || hasLA) && (
                <div className="flex gap-1 justify-center md:justify-start">
                  {hasLR && (
                    <span
                      className="rounded bg-yellow-500/20 px-1 text-[9px] font-bold text-yellow-400"
                      title="Longest Road"
                    >
                      LR
                    </span>
                  )}
                  {hasLA && (
                    <span
                      className="rounded bg-yellow-500/20 px-1 text-[9px] font-bold text-yellow-400"
                      title="Largest Army"
                    >
                      LA
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Card icons */}
            <div className="flex gap-2">
              <CardIcon
                bgColor="bg-purple-700 border-purple-500"
                badgeColor="bg-purple-600"
                count={devCardCount}
              />
              <CardIcon
                bgColor="bg-amber-700 border-amber-500"
                badgeColor="bg-amber-600"
                count={resourceCount}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

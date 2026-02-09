import { useGameStore } from '~/stores/game-store';
import { PlayerColor, GamePhase } from '~/engine/types';
import type { PlayerState, ClientPlayerState } from '~/engine/types';
import { totalResources } from '~/engine/validators/helpers';

const PLAYER_COLOR_CSS: Record<PlayerColor, string> = {
  [PlayerColor.Red]: 'border-red-500 bg-red-500/10',
  [PlayerColor.Blue]: 'border-blue-500 bg-blue-500/10',
  [PlayerColor.White]: 'border-gray-300 bg-gray-300/10',
  [PlayerColor.Orange]: 'border-orange-500 bg-orange-500/10',
};

const PLAYER_COLOR_DOT: Record<PlayerColor, string> = {
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

        return (
          <div
            key={i}
            className={`min-w-[140px] rounded-lg border-2 px-3 py-2 transition-all ${PLAYER_COLOR_CSS[color]} ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''} ${isMe ? 'ring-1 ring-white/30' : ''} `}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${PLAYER_COLOR_DOT[color]}`} />
              <span className="truncate text-sm font-semibold">
                {player.name}
                {isMe && <span className="ml-1 text-xs text-gray-400">(you)</span>}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-300">
              <span>VP: {vp}</span>
              <span>Cards: {resourceCount}</span>
              <span>Dev: {devCardCount}</span>
              <span>Knights: {player.playedKnights}</span>
              <span>
                {state.longestRoadPlayer === i && (
                  <span className="text-yellow-400" title="Longest Road">
                    LR
                  </span>
                )}
                {state.largestArmyPlayer === i && (
                  <span className="ml-1 text-yellow-400" title="Largest Army">
                    LA
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

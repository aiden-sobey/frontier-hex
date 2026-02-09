import { useGameStore } from '~/stores/game-store';
import { GamePhase, PlayerColor } from '~/engine/types';

const COLOR_TEXT: Record<PlayerColor, string> = {
  [PlayerColor.Red]: 'text-red-400',
  [PlayerColor.Blue]: 'text-blue-400',
  [PlayerColor.White]: 'text-gray-200',
  [PlayerColor.Orange]: 'text-orange-400',
};

export function VictoryOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const clientState = useGameStore((s) => s.clientState);

  const state = gameState ?? clientState;
  if (!state || state.phase !== GamePhase.GameOver || state.winner === null) {
    return null;
  }

  const winner = state.players[state.winner];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold">Game Over!</h1>
        <p className="mb-2 text-2xl">
          <span className={`font-bold ${COLOR_TEXT[winner.color]}`}>{winner.name}</span>
          {winner.name === 'You' ? ' win!' : ' wins!'}
        </p>
        <p className="text-gray-400">Congratulations to the new ruler of the Frontier.</p>
      </div>
    </div>
  );
}

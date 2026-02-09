import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createGame } from '~/functions/games';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handlePlayVsBots() {
    setLoading(true);
    try {
      // Generate a unique human player ID
      const humanPlayerId = `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const result = await createGame({
        data: {
          playerNames: ['You', 'Bot Alice', 'Bot Bob', 'Bot Carol'],
          playerIds: [humanPlayerId, 'bot-alice', 'bot-bob', 'bot-carol'],
        },
      });

      // Store the human player ID in sessionStorage before navigating
      sessionStorage.setItem(`catan-player-${result.gameId}`, humanPlayerId);

      navigate({ to: '/game/$gameId', params: { gameId: result.gameId } });
    } catch (err) {
      console.error('Failed to create game:', err);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-5xl font-bold">Catan Online</h1>
      <p className="text-xl text-gray-400">Build. Trade. Settle.</p>
      <button
        onClick={handlePlayVsBots}
        disabled={loading}
        className="rounded-lg bg-amber-600 px-8 py-4 text-xl font-semibold transition-colors hover:bg-amber-500 disabled:cursor-wait disabled:bg-amber-800"
      >
        {loading ? 'Creating Game...' : 'Play vs Bots'}
      </button>
      <Link
        to="/game/$gameId"
        params={{ gameId: 'demo' }}
        className="rounded-lg bg-gray-700 px-6 py-3 text-lg transition-colors hover:bg-gray-600"
      >
        View Demo Board
      </Link>
    </div>
  );
}

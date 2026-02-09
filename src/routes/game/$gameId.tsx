import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useGameStore } from '~/stores/game-store'
import { useSocket } from '~/hooks/useSocket'
import { GameHUD } from '~/components/game/GameHUD'

export const Route = createFileRoute('/game/$gameId')({
  component: GamePage,
})

function GamePage() {
  const { gameId } = Route.useParams()
  const isDemo = gameId === 'demo'

  if (isDemo) {
    return <DemoGame />
  }

  return <OnlineGame gameId={gameId} />
}

function DemoGame() {
  const { gameState, initDemo } = useGameStore()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (!gameState) {
      initDemo()
    }
  }, [gameState, initDemo])

  if (!isClient || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-400">Loading board...</p>
      </div>
    )
  }

  return <GameHUD />
}

function OnlineGame({ gameId }: { gameId: string }) {
  const setClientState = useGameStore((s) => s.setClientState)
  const setMyPlayerIndex = useGameStore((s) => s.setMyPlayerIndex)
  const clientState = useGameStore((s) => s.clientState)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // For online play, we need a player ID. In a real app this would come from auth.
  // For now, use a simple generated ID stored in sessionStorage.
  const [playerId] = useState(() => {
    if (typeof window === 'undefined') return 'player'
    const stored = sessionStorage.getItem(`catan-player-${gameId}`)
    if (stored) return stored
    const id = `player-${Date.now()}`
    sessionStorage.setItem(`catan-player-${gameId}`, id)
    return id
  })

  const { connected, sendAction } = useSocket({
    gameId,
    playerId,
    onFullState: (state) => {
      setClientState(state)
      // Determine our player index from the state
      const idx = state.players.findIndex((p) => p.id === playerId)
      if (idx !== -1) {
        setMyPlayerIndex(idx)
      }
    },
    onStateUpdate: ({ state }) => {
      setClientState(state)
    },
    onError: (err) => {
      setError(err)
    },
  })

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-2">Error</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!connected || !clientState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-400">
          {connected ? 'Waiting for game state...' : 'Connecting...'}
        </p>
      </div>
    )
  }

  return <GameHUD sendAction={sendAction} />
}

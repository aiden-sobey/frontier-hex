import { create } from 'zustand'
import type {
  GameState,
  ClientGameState,
  BoardGraph,
  GameAction,
  ActionResult,
} from '~/engine/types'
import { initializeGame } from '~/engine/setup'
import { applyAction } from '~/engine/actions'
import { buildBoardGraph } from '~/engine/board'

interface GameStore {
  gameState: GameState | null
  clientState: ClientGameState | null
  boardGraph: BoardGraph | null
  myPlayerIndex: number | null

  setGameState: (state: GameState) => void
  setClientState: (state: ClientGameState) => void
  setMyPlayerIndex: (index: number) => void
  initDemo: () => void

  // For local play, apply action directly
  applyLocalAction: (action: GameAction) => ActionResult | null
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  clientState: null,
  boardGraph: null,
  myPlayerIndex: null,

  setGameState: (state) =>
    set({ gameState: state, boardGraph: state.boardGraph }),

  setClientState: (state) => {
    // boardGraph Maps are lost during JSON serialization over the socket.
    // Rebuild the deterministic board topology on the client.
    const boardGraph = buildBoardGraph()
    set({ clientState: { ...state, boardGraph }, boardGraph })
  },

  setMyPlayerIndex: (index) => set({ myPlayerIndex: index }),

  initDemo: () => {
    const state = initializeGame({
      gameId: 'demo',
      seed: Date.now(),
      playerNames: ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
      playerIds: ['human', 'bot1', 'bot2', 'bot3'],
    })
    set({ gameState: state, boardGraph: state.boardGraph, myPlayerIndex: 0 })
  },

  applyLocalAction: (action) => {
    const { gameState } = get()
    if (!gameState) return null
    const result = applyAction(gameState, action)
    if (result.valid) {
      set({ gameState: result.state, boardGraph: result.state.boardGraph })
    }
    return result
  },
}))

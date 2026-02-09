import { Server as SocketServer } from 'socket.io'
import type {
  GameState,
  GameAction,
  ClientGameState,
  ClientPlayerState,
  GameEvent,
} from '../engine/types'
import { applyAction } from '../engine/actions'

export class GameRoom {
  private gameState: GameState
  private io: SocketServer
  private roomId: string
  private playerSocketMap: Map<string, string> // playerId -> socketId
  private socketPlayerMap: Map<string, string> // socketId -> playerId

  constructor(io: SocketServer, roomId: string, gameState: GameState) {
    this.io = io
    this.roomId = roomId
    this.gameState = gameState
    this.playerSocketMap = new Map()
    this.socketPlayerMap = new Map()
  }

  /**
   * Join a player to the room. Associates their playerId with the given socketId
   * and adds the socket to the Socket.IO room.
   */
  addPlayer(playerId: string, socketId: string): void {
    // If this player was already connected with a different socket, clean up the old mapping
    const existingSocketId = this.playerSocketMap.get(playerId)
    if (existingSocketId && existingSocketId !== socketId) {
      this.socketPlayerMap.delete(existingSocketId)
    }

    this.playerSocketMap.set(playerId, socketId)
    this.socketPlayerMap.set(socketId, playerId)

    // Add the socket to the Socket.IO room
    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      socket.join(this.roomId)
    }
  }

  /**
   * Remove a player by their socketId (e.g., on disconnect).
   * Returns the playerId if found, or undefined.
   */
  removePlayer(socketId: string): string | undefined {
    const playerId = this.socketPlayerMap.get(socketId)
    if (!playerId) return undefined

    this.socketPlayerMap.delete(socketId)
    this.playerSocketMap.delete(playerId)

    // Remove the socket from the Socket.IO room
    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      socket.leave(this.roomId)
    }

    return playerId
  }

  /**
   * Process a game action through the engine.
   * Returns success/error status. On success, broadcasts the state update.
   */
  processAction(action: GameAction): { success: boolean; error?: string } {
    const result = applyAction(this.gameState, action)

    if (!result.valid) {
      return { success: false, error: result.error ?? 'Invalid action' }
    }

    this.gameState = result.state
    this.broadcastStateUpdate(action, result.events)

    return { success: true }
  }

  /**
   * Convert the full server state to a client view for a specific player.
   * Redacts: devCardDeck (replaced with devCardDeckSize), randomSeed,
   * and other players' development cards (replaced with developmentCardCount).
   */
  getClientState(playerId: string): ClientGameState {
    const state = this.gameState

    // Find the requesting player's index
    const requestingPlayerIndex = state.players.findIndex((p) => p.id === playerId)

    const clientPlayers: ClientPlayerState[] = state.players.map((player, index) => {
      const isRequestingPlayer = index === requestingPlayerIndex

      return {
        id: player.id,
        name: player.name,
        color: player.color,
        resources: player.resources,
        playedKnights: player.playedKnights,
        hasPlayedDevCardThisTurn: player.hasPlayedDevCardThisTurn,
        settlements: player.settlements,
        cities: player.cities,
        roads: player.roads,
        ports: player.ports,
        developmentCardCount: player.developmentCards.length + player.newDevCards.length,
        // Show the requesting player's own cards; hide other players' cards
        developmentCards: isRequestingPlayer ? player.developmentCards : [],
        newDevCards: isRequestingPlayer ? player.newDevCards : [],
      }
    })

    // Build the client state, omitting devCardDeck and randomSeed
    const {
      devCardDeck: _devCardDeck,
      randomSeed: _randomSeed,
      players: _players,
      ...rest
    } = state

    return {
      ...rest,
      players: clientPlayers,
      devCardDeckSize: state.devCardDeck.length,
    }
  }

  /**
   * Broadcast a state update to all players in the room.
   * Each player receives their own redacted view of the state.
   */
  broadcastStateUpdate(action: GameAction, events: GameEvent[]): void {
    for (const [playerId, socketId] of this.playerSocketMap) {
      const socket = this.io.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit('state-update', {
          state: this.getClientState(playerId),
          events,
          action,
        })
      }
    }
  }

  /**
   * Send the full (redacted) state to a specific player.
   */
  sendFullState(playerId: string): void {
    const socketId = this.playerSocketMap.get(playerId)
    if (!socketId) return

    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      socket.emit('full-state', {
        state: this.getClientState(playerId),
      })
    }
  }

  /**
   * Get the underlying (unredacted) game state.
   */
  getGameState(): GameState {
    return this.gameState
  }

  /**
   * Check if all players in the game are currently connected via sockets.
   */
  isReady(): boolean {
    return this.gameState.players.every((player) => this.playerSocketMap.has(player.id))
  }

  /**
   * Get the room ID (game ID).
   */
  getRoomId(): string {
    return this.roomId
  }

  /**
   * Get the player ID for a given socket ID.
   */
  getPlayerIdBySocket(socketId: string): string | undefined {
    return this.socketPlayerMap.get(socketId)
  }

  /**
   * Get the socket ID for a given player ID.
   */
  getSocketIdByPlayer(playerId: string): string | undefined {
    return this.playerSocketMap.get(playerId)
  }
}

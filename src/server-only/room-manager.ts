import { Server as SocketServer } from 'socket.io'
import type { GameState } from '../engine/types'
import { GameRoom } from './game-room'

export class RoomManager {
  private rooms: Map<string, GameRoom>
  private io: SocketServer

  constructor(io: SocketServer) {
    this.rooms = new Map()
    this.io = io
  }

  /**
   * Create a new game room with the given ID and initial state.
   * Throws if a room with the same ID already exists.
   */
  createRoom(gameId: string, gameState: GameState): GameRoom {
    if (this.rooms.has(gameId)) {
      throw new Error(`Room "${gameId}" already exists`)
    }

    const room = new GameRoom(this.io, gameId, gameState)
    this.rooms.set(gameId, room)
    return room
  }

  /**
   * Get an existing game room by ID.
   */
  getRoom(gameId: string): GameRoom | undefined {
    return this.rooms.get(gameId)
  }

  /**
   * Delete a game room by ID.
   */
  deleteRoom(gameId: string): void {
    this.rooms.delete(gameId)
  }

  /**
   * Get all active room IDs.
   */
  getRoomIds(): string[] {
    return Array.from(this.rooms.keys())
  }
}

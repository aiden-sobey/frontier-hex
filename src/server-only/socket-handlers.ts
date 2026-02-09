import type { Server as SocketServer, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../engine/types'
import type { RoomManager } from './room-manager'
import { BotController } from './bot-controller'

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>

/**
 * Register all Socket.IO event handlers on the server.
 * This wires up join-game, game-action, chat-message, and disconnect events.
 */
export function registerSocketHandlers(io: SocketServer, roomManager: RoomManager): void {
  // Track bot controllers and socket-to-gameId mappings
  const botControllers = new Map<string, BotController>()
  const socketToGameId = new Map<string, string>()

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as TypedSocket

    /**
     * join-game: Player requests to join a game room.
     * Validates the room exists and the player is a participant, then sends full state.
     */
    socket.on('join-game', (data, ack) => {
      const { gameId, playerId } = data

      const room = roomManager.getRoom(gameId)
      if (!room) {
        ack({ success: false, error: 'Game not found' })
        return
      }

      // Verify the player is part of this game
      const gameState = room.getGameState()
      const playerExists = gameState.players.some((p) => p.id === playerId)
      if (!playerExists) {
        ack({ success: false, error: 'Player not found in this game' })
        return
      }

      // Add the player to the room
      room.addPlayer(playerId, socket.id)

      // Track which game this socket belongs to
      socketToGameId.set(socket.id, gameId)

      // Notify other players that this player connected
      socket.to(gameId).emit('player-status', {
        playerId,
        status: 'connected',
      })

      // Send the full state to the joining player
      room.sendFullState(playerId)

      ack({ success: true })

      // Initialize bot controller for this game if not already done
      if (!botControllers.has(gameId)) {
        const botIndices = gameState.players
          .map((p, i) => ({ id: p.id, index: i }))
          .filter(({ id }) => id.startsWith('bot-'))
          .map(({ index }) => index)

        if (botIndices.length > 0) {
          const controller = new BotController(room, botIndices)
          botControllers.set(gameId, controller)
          // Start initial bot tick (for setup phase where bots may go first)
          controller.tick()
        }
      }
    })

    /**
     * game-action: Player submits a game action.
     * Finds the room the socket belongs to, validates, and processes.
     */
    socket.on('game-action', (action, ack) => {
      // Find which room this socket is in
      const gameId = socketToGameId.get(socket.id)
      const room = gameId ? roomManager.getRoom(gameId) : findRoomForSocket(socket, roomManager)
      if (!room) {
        ack({ success: false, error: 'Not in a game room' })
        return
      }

      // Verify the socket corresponds to the player making the action
      const playerId = room.getPlayerIdBySocket(socket.id)
      if (!playerId) {
        ack({ success: false, error: 'Player not identified' })
        return
      }

      // Verify the action's playerIndex matches the socket's player
      const gameState = room.getGameState()
      const playerIndex = gameState.players.findIndex((p) => p.id === playerId)
      if (playerIndex === -1 || action.playerIndex !== playerIndex) {
        ack({ success: false, error: 'Action playerIndex does not match your player' })
        return
      }

      // Process the action
      const result = room.processAction(action)
      ack({ success: result.success, error: result.error })

      if (!result.success && result.error) {
        socket.emit('action-error', { error: result.error })
      }

      // After a successful human action, let bots respond
      if (result.success) {
        const resolvedGameId = gameId ?? room.getRoomId()
        const controller = botControllers.get(resolvedGameId)
        if (controller) {
          controller.tick() // Fire and forget — don't await
        }
      }
    })

    /**
     * chat-message: Player sends a chat message to their game room.
     * Broadcasts to all other players in the room.
     */
    socket.on('chat-message', (message) => {
      const room = findRoomForSocket(socket, roomManager)
      if (!room) return

      const playerId = room.getPlayerIdBySocket(socket.id)
      if (!playerId) return

      // Broadcast the chat message to the room (including sender)
      io.to(room.getRoomId()).emit('player-status', {
        playerId,
        status: 'connected', // Using player-status as a workaround; a dedicated chat event would be better
      })

      // For now, re-broadcast via the room. In a full implementation,
      // there would be a dedicated 'chat-message' server-to-client event.
      // Since the ServerToClientEvents don't include chat, we just relay via socket rooms.
      socket.to(room.getRoomId()).emit('action-error', {
        error: `[Chat] ${playerId}: ${message}`,
      })
    })

    /**
     * disconnect: Clean up when a socket disconnects.
     * Removes the player from their room and notifies others.
     */
    socket.on('disconnect', () => {
      // Clean up the socket-to-gameId mapping
      const gameId = socketToGameId.get(socket.id)
      socketToGameId.delete(socket.id)

      if (gameId) {
        const room = roomManager.getRoom(gameId)
        if (room) {
          const playerId = room.removePlayer(socket.id)
          if (playerId) {
            io.to(gameId).emit('player-status', {
              playerId,
              status: 'disconnected',
            })
          }
        }
        return
      }

      // Fallback: check all rooms for this socket
      const roomIds = roomManager.getRoomIds()
      for (const roomId of roomIds) {
        const room = roomManager.getRoom(roomId)
        if (!room) continue

        const playerId = room.removePlayer(socket.id)
        if (playerId) {
          // Notify remaining players that this player disconnected
          io.to(roomId).emit('player-status', {
            playerId,
            status: 'disconnected',
          })
          break // A socket should only be in one room
        }
      }
    })
  })
}

/**
 * Find which GameRoom a socket belongs to by checking all rooms.
 */
function findRoomForSocket(
  socket: TypedSocket,
  roomManager: RoomManager,
): ReturnType<RoomManager['getRoom']> {
  const roomIds = roomManager.getRoomIds()
  for (const roomId of roomIds) {
    const room = roomManager.getRoom(roomId)
    if (room && room.getPlayerIdBySocket(socket.id)) {
      return room
    }
  }
  return undefined
}

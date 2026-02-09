import type { Plugin } from 'vite'
import { Server as SocketServer } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../engine/types'
import { RoomManager } from './room-manager'
import { registerSocketHandlers } from './socket-handlers'

// Module-level references so they survive HMR reloads
let io: SocketServer<ClientToServerEvents, ServerToClientEvents> | null = null
let roomManager: RoomManager | null = null

/**
 * Get the RoomManager singleton. Used by server functions to create/access rooms.
 * Returns undefined if the socket server hasn't been initialized yet.
 */
export function getRoomManager(): RoomManager | undefined {
  return roomManager ?? (globalThis as any).__catanRoomManager ?? undefined
}

/**
 * Vite plugin that attaches a Socket.IO server to the Vite dev server's HTTP server.
 * This enables WebSocket support during development without modifying the TanStack Start server entry.
 */
export function socketDevPlugin(): Plugin {
  return {
    name: 'socket-io-dev',
    configureServer(server) {
      if (!server.httpServer) {
        console.warn('[socket-io-dev] No httpServer available on Vite dev server. Socket.IO will not be attached.')
        return
      }

      // Only create once (survives HMR)
      if (!io) {
        io = new SocketServer(server.httpServer, {
          path: '/socket.io',
          cors: {
            origin: '*',
            methods: ['GET', 'POST'],
          },
          // Avoid conflicts with Vite's own WebSocket for HMR
          serveClient: false,
        })

        roomManager = new RoomManager(io)
        ;(globalThis as any).__catanRoomManager = roomManager
        registerSocketHandlers(io, roomManager)

        console.log('[socket-io-dev] Socket.IO server attached to Vite dev server')
      }
    },
  }
}

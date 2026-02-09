import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '~/engine/types'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TypedSocket | null = null

/**
 * Get the Socket.IO client singleton.
 * Creates the socket instance on first call with autoConnect disabled,
 * so the caller controls when the connection is established.
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      autoConnect: false,
    }) as TypedSocket
  }
  return socket
}

/**
 * Disconnect and destroy the socket singleton.
 * Useful for cleanup when leaving a game entirely.
 */
export function destroySocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

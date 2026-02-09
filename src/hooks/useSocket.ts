import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket, destroySocket } from '~/lib/socket-client';
import type { ClientGameState, GameAction, GameEvent } from '~/engine/types';

interface UseSocketOptions {
  gameId: string;
  playerId: string;
  onFullState?: (state: ClientGameState) => void;
  onStateUpdate?: (data: {
    state: ClientGameState;
    events: GameEvent[];
    action: GameAction;
  }) => void;
  onError?: (error: string) => void;
  onPlayerStatus?: (data: { playerId: string; status: 'connected' | 'disconnected' }) => void;
}

interface UseSocketReturn {
  connected: boolean;
  joinGame: () => Promise<{ success: boolean; error?: string }>;
  sendAction: (action: GameAction) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
}

/**
 * React hook for managing Socket.IO connection lifecycle and game events.
 *
 * Connects on mount, joins the specified game room, registers event handlers,
 * and disconnects on unmount.
 */
export function useSocket(options: UseSocketOptions): UseSocketReturn {
  const { gameId, playerId, onFullState, onStateUpdate, onError, onPlayerStatus } = options;
  const [connected, setConnected] = useState(false);
  const joinedRef = useRef(false);

  // Store callbacks in refs so we don't re-register listeners on every render
  const onFullStateRef = useRef(onFullState);
  const onStateUpdateRef = useRef(onStateUpdate);
  const onErrorRef = useRef(onError);
  const onPlayerStatusRef = useRef(onPlayerStatus);

  onFullStateRef.current = onFullState;
  onStateUpdateRef.current = onStateUpdate;
  onErrorRef.current = onError;
  onPlayerStatusRef.current = onPlayerStatus;

  useEffect(() => {
    const socket = getSocket();

    // --- Connection lifecycle events ---
    function handleConnect() {
      setConnected(true);

      // Auto-join the game room once connected
      if (!joinedRef.current) {
        socket.emit('join-game', { gameId, playerId }, (res) => {
          if (!res.success) {
            onErrorRef.current?.(res.error ?? 'Failed to join game');
          } else {
            joinedRef.current = true;
          }
        });
      }
    }

    function handleDisconnect() {
      setConnected(false);
      joinedRef.current = false;
    }

    // --- Game event handlers ---
    function handleFullState(data: { state: ClientGameState }) {
      onFullStateRef.current?.(data.state);
    }

    function handleStateUpdate(data: {
      state: ClientGameState;
      events: GameEvent[];
      action: GameAction;
    }) {
      onStateUpdateRef.current?.(data);
    }

    function handleActionError(data: { error: string }) {
      onErrorRef.current?.(data.error);
    }

    function handlePlayerStatus(data: { playerId: string; status: 'connected' | 'disconnected' }) {
      onPlayerStatusRef.current?.(data);
    }

    // Register all listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('full-state', handleFullState);
    socket.on('state-update', handleStateUpdate);
    socket.on('action-error', handleActionError);
    socket.on('player-status', handlePlayerStatus);

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      // Already connected (e.g., HMR), trigger join immediately
      handleConnect();
    }

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('full-state', handleFullState);
      socket.off('state-update', handleStateUpdate);
      socket.off('action-error', handleActionError);
      socket.off('player-status', handlePlayerStatus);

      joinedRef.current = false;
      socket.disconnect();
    };
  }, [gameId, playerId]);

  /**
   * Manually join a game room. Normally this happens automatically on connect,
   * but can be called explicitly if needed (e.g., after reconnection).
   */
  const joinGame = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('join-game', { gameId, playerId }, (res) => {
        if (res.success) {
          joinedRef.current = true;
        }
        resolve(res);
      });
    });
  }, [gameId, playerId]);

  /**
   * Send a game action to the server.
   * Returns a promise that resolves with the server's acknowledgment.
   */
  const sendAction = useCallback(
    (action: GameAction): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        const socket = getSocket();
        if (!socket.connected) {
          resolve({ success: false, error: 'Socket not connected' });
          return;
        }

        socket.emit('game-action', action, (res) => {
          resolve(res);
        });
      });
    },
    [],
  );

  /**
   * Disconnect the socket and destroy the singleton.
   */
  const disconnect = useCallback(() => {
    destroySocket();
    setConnected(false);
    joinedRef.current = false;
  }, []);

  return { connected, joinGame, sendAction, disconnect };
}

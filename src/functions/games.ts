import { createServerFn } from '@tanstack/react-start';
import { initializeGame } from '~/engine/setup';

/**
 * Server function to create a new game.
 * Generates a random game ID, initializes the game state, and registers
 * the room with the RoomManager if available.
 *
 * Returns the gameId so the client can navigate to the game page and
 * connect via Socket.IO.
 */
export const createGame = createServerFn({ method: 'POST' })
  .inputValidator((data: { playerNames: string[]; playerIds: string[] }) => data)
  .handler(async ({ data }) => {
    const { playerNames, playerIds } = data;

    if (playerNames.length < 2 || playerNames.length > 4) {
      throw new Error('Game requires 2-4 players');
    }
    if (playerNames.length !== playerIds.length) {
      throw new Error('playerNames and playerIds must have the same length');
    }

    const gameId = generateGameId();
    const seed = Math.floor(Math.random() * 2147483647);

    const gameState = initializeGame({
      gameId,
      seed,
      playerNames,
      playerIds,
    });

    // Dynamically import the room manager to avoid bundling server-only code on the client.
    // This import will only resolve on the server.
    try {
      const { getRoomManager } = await import('~/server-only/dev-socket-server');
      const roomManager = getRoomManager();
      if (roomManager) {
        roomManager.createRoom(gameId, gameState);
      }
    } catch {
      // Room manager not available (e.g., production without socket plugin).
      // The room will need to be created when the first player connects.
      console.warn(`[createGame] RoomManager not available. Game ${gameId} state not registered.`);
    }

    return { gameId };
  });

/**
 * Generate a short, URL-friendly game ID.
 */
function generateGameId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

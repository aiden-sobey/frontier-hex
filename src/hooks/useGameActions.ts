import { useCallback } from 'react';
import { useGameStore } from '~/stores/game-store';
import { useUIStore } from '~/stores/ui-store';
import type { GameAction, ResourceType, ResourceBundle, AxialCoord } from '~/engine/types';

interface ActionResult {
  success: boolean;
  error?: string;
}

interface GameActions {
  rollDice: () => ActionResult;
  buildSettlement: (vertexKey: string) => ActionResult;
  buildRoad: (edgeKey: string) => ActionResult;
  buildCity: (vertexKey: string) => ActionResult;
  buyDevCard: () => ActionResult;
  playKnight: () => ActionResult;
  playRoadBuilding: () => ActionResult;
  playYearOfPlenty: (resource1: ResourceType, resource2: ResourceType) => ActionResult;
  playMonopoly: (resource: ResourceType) => ActionResult;
  moveRobber: (hex: AxialCoord) => ActionResult;
  stealResource: (targetPlayerIndex: number) => ActionResult;
  discardResources: (resources: ResourceBundle) => ActionResult;
  tradeBank: (give: ResourceType, receive: ResourceType) => ActionResult;
  tradeOffer: (offering: ResourceBundle, requesting: ResourceBundle) => ActionResult;
  tradeAccept: () => ActionResult;
  tradeReject: () => ActionResult;
  tradeConfirm: (targetPlayerIndex: number) => ActionResult;
  tradeCancel: () => ActionResult;
  endTurn: () => ActionResult;
  setupPlaceSettlement: (vertexKey: string) => ActionResult;
  setupPlaceRoad: (edgeKey: string) => ActionResult;
}

/**
 * Hook that provides action dispatch functions.
 * For local/demo play: applies actions directly via game-store.
 * For online play: would send via socket (sendAction callback).
 */
export function useGameActions(
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>,
): GameActions {
  const applyLocalAction = useGameStore((s) => s.applyLocalAction);
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex);
  const clearSelection = useUIStore((s) => s.clearSelection);

  const dispatch = useCallback(
    (action: GameAction): ActionResult => {
      if (sendAction) {
        // Online mode: fire-and-forget, state comes back via socket
        sendAction(action);
        clearSelection();
        return { success: true };
      }

      // Local mode: apply directly
      const result = applyLocalAction(action);
      clearSelection();
      if (!result) return { success: false, error: 'No game state' };
      if (!result.valid) return { success: false, error: result.error };
      return { success: true };
    },
    [sendAction, applyLocalAction, clearSelection],
  );

  const pi = myPlayerIndex ?? 0;

  const rollDice = useCallback(
    () => dispatch({ type: 'rollDice', playerIndex: pi }),
    [dispatch, pi],
  );

  const buildSettlement = useCallback(
    (vertexKey: string) => dispatch({ type: 'buildSettlement', playerIndex: pi, vertexKey }),
    [dispatch, pi],
  );

  const buildRoad = useCallback(
    (edgeKey: string) => dispatch({ type: 'buildRoad', playerIndex: pi, edgeKey }),
    [dispatch, pi],
  );

  const buildCity = useCallback(
    (vertexKey: string) => dispatch({ type: 'buildCity', playerIndex: pi, vertexKey }),
    [dispatch, pi],
  );

  const buyDevCard = useCallback(
    () => dispatch({ type: 'buyDevCard', playerIndex: pi }),
    [dispatch, pi],
  );

  const playKnight = useCallback(
    () => dispatch({ type: 'playKnight', playerIndex: pi }),
    [dispatch, pi],
  );

  const playRoadBuilding = useCallback(
    () => dispatch({ type: 'playRoadBuilding', playerIndex: pi }),
    [dispatch, pi],
  );

  const playYearOfPlenty = useCallback(
    (resource1: ResourceType, resource2: ResourceType) =>
      dispatch({ type: 'playYearOfPlenty', playerIndex: pi, resource1, resource2 }),
    [dispatch, pi],
  );

  const playMonopoly = useCallback(
    (resource: ResourceType) => dispatch({ type: 'playMonopoly', playerIndex: pi, resource }),
    [dispatch, pi],
  );

  const moveRobberAction = useCallback(
    (hex: AxialCoord) => dispatch({ type: 'moveRobber', playerIndex: pi, hex }),
    [dispatch, pi],
  );

  const stealResource = useCallback(
    (targetPlayerIndex: number) =>
      dispatch({ type: 'stealResource', playerIndex: pi, targetPlayerIndex }),
    [dispatch, pi],
  );

  const discardResources = useCallback(
    (resources: ResourceBundle) =>
      dispatch({ type: 'discardResources', playerIndex: pi, resources }),
    [dispatch, pi],
  );

  const tradeBank = useCallback(
    (give: ResourceType, receive: ResourceType) =>
      dispatch({ type: 'tradeBank', playerIndex: pi, give, receive }),
    [dispatch, pi],
  );

  const tradeOffer = useCallback(
    (offering: ResourceBundle, requesting: ResourceBundle) =>
      dispatch({ type: 'tradeOffer', playerIndex: pi, offering, requesting }),
    [dispatch, pi],
  );

  const tradeAccept = useCallback(
    () => dispatch({ type: 'tradeAccept', playerIndex: pi }),
    [dispatch, pi],
  );

  const tradeReject = useCallback(
    () => dispatch({ type: 'tradeReject', playerIndex: pi }),
    [dispatch, pi],
  );

  const tradeConfirm = useCallback(
    (targetPlayerIndex: number) =>
      dispatch({ type: 'tradeConfirm', playerIndex: pi, targetPlayerIndex }),
    [dispatch, pi],
  );

  const tradeCancel = useCallback(
    () => dispatch({ type: 'tradeCancel', playerIndex: pi }),
    [dispatch, pi],
  );

  const endTurn = useCallback(() => dispatch({ type: 'endTurn', playerIndex: pi }), [dispatch, pi]);

  const setupPlaceSettlement = useCallback(
    (vertexKey: string) => dispatch({ type: 'setupPlaceSettlement', playerIndex: pi, vertexKey }),
    [dispatch, pi],
  );

  const setupPlaceRoad = useCallback(
    (edgeKey: string) => dispatch({ type: 'setupPlaceRoad', playerIndex: pi, edgeKey }),
    [dispatch, pi],
  );

  return {
    rollDice,
    buildSettlement,
    buildRoad,
    buildCity,
    buyDevCard,
    playKnight,
    playRoadBuilding,
    playYearOfPlenty,
    playMonopoly,
    moveRobber: moveRobberAction,
    stealResource,
    discardResources,
    tradeBank,
    tradeOffer,
    tradeAccept,
    tradeReject,
    tradeConfirm,
    tradeCancel,
    endTurn,
    setupPlaceSettlement,
    setupPlaceRoad,
  };
}

import {
  GameState,
  GamePhase,
  ActionResult,
  TradeBankAction,
  TradeOfferAction,
  TradeAcceptAction,
  TradeRejectAction,
  TradeConfirmAction,
  TradeCancelAction,
} from '../types';
import {
  cloneState,
  hasResources,
  subtractResources,
  addResources,
  totalResources,
} from './helpers';
import { getTradeRatio } from '../trade-ratios';
import { RESOURCE_TYPES } from '../constants';

// ---- Bank Trade ----

export function validateTradeBank(state: GameState, action: TradeBankAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only trade in Main phase';
  }

  const ratio = getTradeRatio(state, action.playerIndex, action.give);
  const player = state.players[action.playerIndex];

  if (player.resources[action.give] < ratio) {
    return `Need ${ratio} ${action.give} to trade (have ${player.resources[action.give]})`;
  }

  if (action.give === action.receive) {
    return 'Cannot trade a resource for itself';
  }

  return null;
}

export function applyTradeBank(state: GameState, action: TradeBankAction): ActionResult {
  const newState = cloneState(state);
  const ratio = getTradeRatio(state, action.playerIndex, action.give);
  const player = { ...newState.players[action.playerIndex] };

  player.resources = {
    ...player.resources,
    [action.give]: player.resources[action.give] - ratio,
    [action.receive]: player.resources[action.receive] + 1,
  };

  const newPlayers = [...newState.players];
  newPlayers[action.playerIndex] = player;
  newState.players = newPlayers;

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} traded ${ratio} ${action.give} for 1 ${action.receive} with the bank`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [
      {
        type: 'bankTraded',
        playerIndex: action.playerIndex,
        give: action.give,
        receive: action.receive,
        ratio,
      },
    ],
  };
}

// ---- Trade Offer ----

export function validateTradeOffer(state: GameState, action: TradeOfferAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only trade in Main phase';
  }
  if (state.pendingTrade !== null) {
    return 'A trade is already pending';
  }

  const player = state.players[action.playerIndex];
  if (!hasResources(player.resources, action.offering)) {
    return 'Insufficient resources to offer';
  }

  if (totalResources(action.offering) === 0) {
    return 'Must offer at least one resource';
  }
  if (totalResources(action.requesting) === 0) {
    return 'Must request at least one resource';
  }

  return null;
}

export function applyTradeOffer(state: GameState, action: TradeOfferAction): ActionResult {
  const newState = cloneState(state);

  newState.pendingTrade = {
    fromPlayer: action.playerIndex,
    offering: { ...action.offering },
    requesting: { ...action.requesting },
    responses: {},
  };

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} proposed a trade`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [
      {
        type: 'tradeOffered',
        playerIndex: action.playerIndex,
        offering: action.offering,
        requesting: action.requesting,
      },
    ],
  };
}

// ---- Trade Accept ----

export function validateTradeAccept(state: GameState, action: TradeAcceptAction): string | null {
  if (state.phase !== GamePhase.Main) {
    return 'Can only trade in Main phase';
  }
  if (!state.pendingTrade) {
    return 'No pending trade';
  }
  if (action.playerIndex === state.pendingTrade.fromPlayer) {
    return 'Cannot accept your own trade';
  }

  const player = state.players[action.playerIndex];
  if (!hasResources(player.resources, state.pendingTrade.requesting)) {
    return 'Insufficient resources to accept this trade';
  }

  return null;
}

export function applyTradeAccept(state: GameState, action: TradeAcceptAction): ActionResult {
  const newState = cloneState(state);

  newState.pendingTrade = {
    ...state.pendingTrade!,
    responses: { ...state.pendingTrade!.responses, [action.playerIndex]: 'accept' },
  };

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} accepted the trade`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [{ type: 'tradeAccepted', playerIndex: action.playerIndex }],
  };
}

// ---- Trade Reject ----

export function validateTradeReject(state: GameState, action: TradeRejectAction): string | null {
  if (state.phase !== GamePhase.Main) {
    return 'Can only trade in Main phase';
  }
  if (!state.pendingTrade) {
    return 'No pending trade';
  }
  if (action.playerIndex === state.pendingTrade.fromPlayer) {
    return 'Cannot reject your own trade';
  }

  return null;
}

export function applyTradeReject(state: GameState, action: TradeRejectAction): ActionResult {
  const newState = cloneState(state);

  newState.pendingTrade = {
    ...state.pendingTrade!,
    responses: { ...state.pendingTrade!.responses, [action.playerIndex]: 'reject' },
  };

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} rejected the trade`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [{ type: 'tradeRejected', playerIndex: action.playerIndex }],
  };
}

// ---- Trade Confirm ----

export function validateTradeConfirm(state: GameState, action: TradeConfirmAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only trade in Main phase';
  }
  if (!state.pendingTrade) {
    return 'No pending trade';
  }
  if (state.pendingTrade.fromPlayer !== action.playerIndex) {
    return 'Only the offering player can confirm';
  }

  const targetResponse = state.pendingTrade.responses[action.targetPlayerIndex];
  if (targetResponse !== 'accept') {
    return 'Target player has not accepted';
  }

  // Re-check both sides have the resources
  const offerer = state.players[action.playerIndex];
  const accepter = state.players[action.targetPlayerIndex];

  if (!hasResources(offerer.resources, state.pendingTrade.offering)) {
    return 'Offering player no longer has the resources';
  }
  if (!hasResources(accepter.resources, state.pendingTrade.requesting)) {
    return 'Accepting player no longer has the resources';
  }

  return null;
}

export function applyTradeConfirm(state: GameState, action: TradeConfirmAction): ActionResult {
  const newState = cloneState(state);
  const trade = state.pendingTrade!;

  const offerer = { ...newState.players[action.playerIndex] };
  const accepter = { ...newState.players[action.targetPlayerIndex] };

  // Swap resources
  offerer.resources = addResources(
    subtractResources(offerer.resources, trade.offering),
    trade.requesting,
  );
  accepter.resources = addResources(
    subtractResources(accepter.resources, trade.requesting),
    trade.offering,
  );

  const newPlayers = [...newState.players];
  newPlayers[action.playerIndex] = offerer;
  newPlayers[action.targetPlayerIndex] = accepter;
  newState.players = newPlayers;

  newState.pendingTrade = null;

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} traded with Player ${action.targetPlayerIndex}`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [
      {
        type: 'tradeConfirmed',
        playerIndex: action.playerIndex,
        targetPlayerIndex: action.targetPlayerIndex,
      },
    ],
  };
}

// ---- Trade Cancel ----

export function validateTradeCancel(state: GameState, action: TradeCancelAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only trade in Main phase';
  }
  if (!state.pendingTrade) {
    return 'No pending trade';
  }
  if (state.pendingTrade.fromPlayer !== action.playerIndex) {
    return 'Only the offering player can cancel';
  }

  return null;
}

export function applyTradeCancel(state: GameState, action: TradeCancelAction): ActionResult {
  const newState = cloneState(state);
  newState.pendingTrade = null;

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} cancelled the trade`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [{ type: 'tradeCancelled', playerIndex: action.playerIndex }],
  };
}

import {
  GameState,
  GamePhase,
  DevelopmentCardType,
  ResourceType,
  ActionResult,
  PlayKnightAction,
  PlayRoadBuildingAction,
  PlayYearOfPlentyAction,
  PlayMonopolyAction,
} from '../types';
import { RESOURCE_TYPES } from '../constants';
import { cloneState, addResource } from './helpers';
import { updateLargestArmy } from '../largest-army';
import { checkVictory } from '../victory';

// ---- Knight ----

export function validateKnight(state: GameState, action: PlayKnightAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.PreRoll && state.phase !== GamePhase.Main) {
    return 'Can only play knight in PreRoll or Main phase';
  }
  const player = state.players[action.playerIndex];
  if (player.hasPlayedDevCardThisTurn) {
    return 'Already played a development card this turn';
  }

  // Must have knight in developmentCards (not newDevCards)
  if (!player.developmentCards.includes(DevelopmentCardType.Knight)) {
    return 'No knight card in hand';
  }

  return null;
}

export function applyKnight(state: GameState, action: PlayKnightAction): ActionResult {
  const newState = cloneState(state);
  const player = { ...newState.players[action.playerIndex] };

  // Remove knight from hand
  const cardIdx = player.developmentCards.indexOf(DevelopmentCardType.Knight);
  player.developmentCards = [...player.developmentCards];
  player.developmentCards.splice(cardIdx, 1);
  player.playedKnights += 1;
  player.hasPlayedDevCardThisTurn = true;

  const newPlayers = [...newState.players];
  newPlayers[action.playerIndex] = player;
  newState.players = newPlayers;

  // Store whether we were in PreRoll (needed for steal phase to know where to return)
  // We use a convention: if knight played pre-roll, after steal go to PreRoll
  // We track this via the phase transition
  newState.phase = GamePhase.MoveRobber;

  // Update largest army
  const updatedState = updateLargestArmy(newState);

  // Check victory
  const winner = checkVictory(updatedState);
  if (winner !== null) {
    updatedState.winner = winner;
    updatedState.phase = GamePhase.GameOver;
  }

  updatedState.log = [
    ...updatedState.log,
    {
      message: `Player ${action.playerIndex} played a knight`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: updatedState,
    events: [{ type: 'knightPlayed', playerIndex: action.playerIndex }],
  };
}

// ---- Road Building ----

export function validateRoadBuilding(
  state: GameState,
  action: PlayRoadBuildingAction,
): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only play road building in Main phase';
  }
  const player = state.players[action.playerIndex];
  if (player.hasPlayedDevCardThisTurn) {
    return 'Already played a development card this turn';
  }
  if (!player.developmentCards.includes(DevelopmentCardType.RoadBuilding)) {
    return 'No road building card in hand';
  }
  if (player.roads <= 0) {
    return 'No road pieces remaining';
  }

  return null;
}

export function applyRoadBuilding(state: GameState, action: PlayRoadBuildingAction): ActionResult {
  const newState = cloneState(state);
  const player = { ...newState.players[action.playerIndex] };

  // Remove card from hand
  const cardIdx = player.developmentCards.indexOf(DevelopmentCardType.RoadBuilding);
  player.developmentCards = [...player.developmentCards];
  player.developmentCards.splice(cardIdx, 1);
  player.hasPlayedDevCardThisTurn = true;

  const newPlayers = [...newState.players];
  newPlayers[action.playerIndex] = player;
  newState.players = newPlayers;

  // Set road building phase
  newState.phase = GamePhase.RoadBuilding;
  newState.roadBuildingRoadsLeft = Math.min(2, player.roads);

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} played road building`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [{ type: 'roadBuildingPlayed', playerIndex: action.playerIndex }],
  };
}

// ---- Year of Plenty ----

export function validateYearOfPlenty(
  state: GameState,
  action: PlayYearOfPlentyAction,
): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only play year of plenty in Main phase';
  }
  const player = state.players[action.playerIndex];
  if (player.hasPlayedDevCardThisTurn) {
    return 'Already played a development card this turn';
  }
  if (!player.developmentCards.includes(DevelopmentCardType.YearOfPlenty)) {
    return 'No year of plenty card in hand';
  }

  // Validate resource choices
  if (!RESOURCE_TYPES.includes(action.resource1) || !RESOURCE_TYPES.includes(action.resource2)) {
    return 'Invalid resource type';
  }

  return null;
}

export function applyYearOfPlenty(state: GameState, action: PlayYearOfPlentyAction): ActionResult {
  const newState = cloneState(state);
  const player = { ...newState.players[action.playerIndex] };

  // Remove card from hand
  const cardIdx = player.developmentCards.indexOf(DevelopmentCardType.YearOfPlenty);
  player.developmentCards = [...player.developmentCards];
  player.developmentCards.splice(cardIdx, 1);
  player.hasPlayedDevCardThisTurn = true;

  // Add 2 resources
  player.resources = addResource(
    addResource(player.resources, action.resource1, 1),
    action.resource2,
    1,
  );

  const newPlayers = [...newState.players];
  newPlayers[action.playerIndex] = player;
  newState.players = newPlayers;

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} played year of plenty (${action.resource1}, ${action.resource2})`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [
      {
        type: 'yearOfPlentyPlayed',
        playerIndex: action.playerIndex,
        resource1: action.resource1,
        resource2: action.resource2,
      },
    ],
  };
}

// ---- Monopoly ----

export function validateMonopoly(state: GameState, action: PlayMonopolyAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.Main) {
    return 'Can only play monopoly in Main phase';
  }
  const player = state.players[action.playerIndex];
  if (player.hasPlayedDevCardThisTurn) {
    return 'Already played a development card this turn';
  }
  if (!player.developmentCards.includes(DevelopmentCardType.Monopoly)) {
    return 'No monopoly card in hand';
  }
  if (!RESOURCE_TYPES.includes(action.resource)) {
    return 'Invalid resource type';
  }

  return null;
}

export function applyMonopoly(state: GameState, action: PlayMonopolyAction): ActionResult {
  const newState = cloneState(state);
  const newPlayers = newState.players.map((p) => ({ ...p, resources: { ...p.resources } }));

  // Remove card from hand
  const player = newPlayers[action.playerIndex];
  const cardIdx = player.developmentCards.indexOf(DevelopmentCardType.Monopoly);
  player.developmentCards = [...player.developmentCards];
  player.developmentCards.splice(cardIdx, 1);
  player.hasPlayedDevCardThisTurn = true;

  // Take all of chosen resource from all other players
  let totalStolen = 0;
  for (let i = 0; i < newPlayers.length; i++) {
    if (i === action.playerIndex) continue;
    const amount = newPlayers[i].resources[action.resource];
    if (amount > 0) {
      totalStolen += amount;
      newPlayers[i].resources = { ...newPlayers[i].resources, [action.resource]: 0 };
    }
  }

  player.resources = {
    ...player.resources,
    [action.resource]: player.resources[action.resource] + totalStolen,
  };

  newState.players = newPlayers;

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} played monopoly on ${action.resource}, took ${totalStolen}`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events: [
      {
        type: 'monopolyPlayed',
        playerIndex: action.playerIndex,
        resource: action.resource,
        totalStolen,
      },
    ],
  };
}

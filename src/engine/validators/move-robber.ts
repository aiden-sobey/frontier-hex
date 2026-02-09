import { GameState, GamePhase, MoveRobberAction, ActionResult, hexKey, vertexKey } from '../types';
import { cloneState } from './helpers';

export function validate(state: GameState, action: MoveRobberAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.MoveRobber) {
    return 'Not in MoveRobber phase';
  }

  // Target hex must be different from current
  if (hexKey(action.hex) === hexKey(state.robberHex)) {
    return 'Must move robber to a different hex';
  }

  // Target hex must exist on the board
  const hexExists = state.boardGraph.hexes.some(
    (h) => h.q === action.hex.q && h.r === action.hex.r,
  );
  if (!hexExists) {
    return 'Invalid hex location';
  }

  return null;
}

export function apply(state: GameState, action: MoveRobberAction): ActionResult {
  const newState = cloneState(state);

  newState.robberHex = { ...action.hex };

  // Check if any OTHER players have buildings on this hex
  const hexVerts = state.boardGraph.hexToVertices.get(hexKey(action.hex));
  const stealTargets = new Set<number>();

  if (hexVerts) {
    for (const v of hexVerts) {
      const vk = vertexKey(v);
      const building = state.vertexBuildings[vk];
      if (building && building.playerIndex !== action.playerIndex) {
        stealTargets.add(building.playerIndex);
      }
    }
  }

  const targetArray = Array.from(stealTargets);

  // Filter out players with no resources
  const targetsWithResources = targetArray.filter((idx) => {
    const p = state.players[idx];
    return (
      p.resources.wood +
        p.resources.brick +
        p.resources.sheep +
        p.resources.wheat +
        p.resources.ore >
      0
    );
  });

  const events: ActionResult['events'] = [{ type: 'robberMoved', hex: action.hex }];

  if (targetsWithResources.length === 0) {
    // No one to steal from, go to Main phase
    // But if knight was played pre-roll and dice haven't been rolled yet, we need to check
    // We determine the return phase: if lastDiceRoll is null for this turn, go to PreRoll
    // Actually, if the knight was played in PreRoll, the dice haven't been rolled yet.
    // If the robber was moved due to rolling a 7, we go to Main.
    // We can detect this: if lastDiceRoll's sum is 7 and phase was MoveRobber, then came from dice roll -> Main.
    // If knight was played, hasPlayedDevCardThisTurn is true.
    // Best approach: check if the last dice roll for this turn is 7 => go Main. Else (knight) => depends on if dice have been rolled.
    newState.phase = getPhaseAfterRobber(state);
    newState.robberStealTargets = null;
  } else if (targetsWithResources.length === 1) {
    // Auto-steal from the single target
    newState.robberStealTargets = targetsWithResources;
    newState.phase = GamePhase.StealResource;
    events.push({ type: 'mustSteal', targets: targetsWithResources });
  } else {
    // Player must choose who to steal from
    newState.robberStealTargets = targetsWithResources;
    newState.phase = GamePhase.StealResource;
    events.push({ type: 'mustSteal', targets: targetsWithResources });
  }

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} moved the robber`,
      timestamp: Date.now(),
      playerIndex: action.playerIndex,
    },
  ];

  return {
    valid: true,
    state: newState,
    events,
  };
}

/**
 * Determine what phase to return to after robber movement/steal.
 * If the dice were rolled this turn (lastDiceRoll is set and it was a 7), go to Main.
 * If knight was played pre-roll (dice not yet rolled), go to PreRoll.
 */
export function getPhaseAfterRobber(state: GameState): GamePhase {
  // If dice were already rolled (roll 7 triggered robber), return to Main
  if (state.lastDiceRoll !== null) {
    const total = state.lastDiceRoll[0] + state.lastDiceRoll[1];
    if (total === 7) {
      return GamePhase.Main;
    }
  }
  // Knight played before dice roll => return to PreRoll
  // Knight played during Main => return to Main
  // We can check: if lastDiceRoll is null, we haven't rolled yet => PreRoll
  if (state.lastDiceRoll === null) {
    return GamePhase.PreRoll;
  }
  return GamePhase.Main;
}

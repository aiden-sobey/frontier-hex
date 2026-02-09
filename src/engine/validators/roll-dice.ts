import { GameState, GamePhase, RollDiceAction, ActionResult } from '../types';
import { MAX_HAND_SIZE_BEFORE_DISCARD } from '../constants';
import { cloneState, totalResources } from './helpers';
import { produceResources } from '../production';
import { createSeededRng } from '../setup';

export function validate(state: GameState, action: RollDiceAction): string | null {
  if (action.playerIndex !== state.currentPlayerIndex) {
    return 'Not your turn';
  }
  if (state.phase !== GamePhase.PreRoll) {
    return 'Can only roll dice in PreRoll phase';
  }
  return null;
}

export function apply(state: GameState, action: RollDiceAction): ActionResult {
  let newState = cloneState(state);

  // Generate dice roll using seeded RNG based on current state
  const rng = createSeededRng(state.randomSeed + state.turnNumber * 1000 + Date.now());
  const die1 = Math.floor(rng() * 6) + 1;
  const die2 = Math.floor(rng() * 6) + 1;
  const total = die1 + die2;

  newState.lastDiceRoll = [die1, die2];

  const events: ActionResult['events'] = [
    { type: 'diceRolled', playerIndex: action.playerIndex, dice: [die1, die2], total },
  ];

  if (total === 7) {
    // Check which players need to discard (> 7 cards)
    const needToDiscard: number[] = [];
    for (let i = 0; i < newState.players.length; i++) {
      if (totalResources(newState.players[i].resources) > MAX_HAND_SIZE_BEFORE_DISCARD) {
        needToDiscard.push(i);
      }
    }

    if (needToDiscard.length > 0) {
      newState.playersNeedingToDiscard = needToDiscard;
      newState.phase = GamePhase.Discard;
      events.push({ type: 'mustDiscard', players: needToDiscard });
    } else {
      newState.phase = GamePhase.MoveRobber;
      events.push({ type: 'moveRobber' });
    }
  } else {
    // Produce resources
    const result = produceResources(newState, total);
    newState = result.state;
    events.push(...result.events);
    newState.phase = GamePhase.Main;
  }

  newState.log = [
    ...newState.log,
    {
      message: `Player ${action.playerIndex} rolled ${die1} + ${die2} = ${total}`,
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

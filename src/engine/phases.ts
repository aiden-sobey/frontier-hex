import { GamePhase } from './types'

// Actions allowed in each game phase
export const PHASE_ALLOWED_ACTIONS: Record<GamePhase, readonly string[]> = {
  [GamePhase.SetupSettlement]: ['setupPlaceSettlement'],
  [GamePhase.SetupRoad]: ['setupPlaceRoad'],
  [GamePhase.PreRoll]: ['rollDice', 'playKnight'],
  [GamePhase.Discard]: ['discardResources'],
  [GamePhase.MoveRobber]: ['moveRobber'],
  [GamePhase.StealResource]: ['stealResource'],
  [GamePhase.Main]: [
    'buildSettlement', 'buildRoad', 'buildCity',
    'buyDevCard', 'playKnight', 'playRoadBuilding', 'playYearOfPlenty', 'playMonopoly',
    'tradeBank', 'tradeOffer', 'tradeAccept', 'tradeReject', 'tradeConfirm', 'tradeCancel',
    'endTurn',
  ],
  [GamePhase.RoadBuilding]: ['buildRoad'],
  [GamePhase.GameOver]: [],
}

export function isActionAllowedInPhase(phase: GamePhase, actionType: string): boolean {
  const allowed = PHASE_ALLOWED_ACTIONS[phase]
  return allowed !== undefined && allowed.includes(actionType)
}

import { useGameStore } from '~/stores/game-store';
import { useUIStore } from '~/stores/ui-store';
import { useGameActions } from '~/hooks/useGameActions';
import { Button } from '~/components/ui/Button';
import { GamePhase, ResourceType } from '~/engine/types';
import type { GameAction, GameState } from '~/engine/types';
import { RESOURCE_TYPES, EMPTY_RESOURCES } from '~/engine/constants';
import { totalResources } from '~/engine/validators/helpers';
import {
  getValidSettlementLocations,
  getValidRoadLocations,
  getValidRobberLocations,
} from '~/engine/actions';
import { useState } from 'react';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.Wood]: '\u{1FAB5}',
  [ResourceType.Brick]: '\u{1F9F1}',
  [ResourceType.Sheep]: '\u{1F411}',
  [ResourceType.Wheat]: '\u{1F33E}',
  [ResourceType.Ore]: '\u26CF\uFE0F',
};

interface PhaseIndicatorProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Contextual banner that appears during special phases to guide the player.
 * Shows instructions and controls for setup, discard, robber, steal, and road building phases.
 */
export function PhaseIndicator({ sendAction }: PhaseIndicatorProps) {
  const clientState = useGameStore((s) => s.clientState);
  const localGameState = useGameStore((s) => s.gameState);
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex);
  const setHighlightedVertices = useUIStore((s) => s.setHighlightedVertices);
  const setHighlightedEdges = useUIStore((s) => s.setHighlightedEdges);
  const setHighlightedHexes = useUIStore((s) => s.setHighlightedHexes);
  const setSelectedAction = useUIStore((s) => s.setSelectedAction);
  const actions = useGameActions(sendAction);

  const [discardAmounts, setDiscardAmounts] = useState({ ...EMPTY_RESOURCES });

  const state = localGameState ?? clientState;
  if (!state || myPlayerIndex === null) return null;

  const isMyTurn = state.currentPlayerIndex === myPlayerIndex;
  const player = state.players[myPlayerIndex];
  const phase = state.phase;

  // Setup settlement phase
  if (phase === GamePhase.SetupSettlement && isMyTurn) {
    // Auto-highlight valid locations
    if (state) {
      const locs = getValidSettlementLocations(state as GameState, myPlayerIndex);
      // Use a microtask to avoid updating during render
      queueMicrotask(() => {
        setHighlightedVertices(locs);
        setSelectedAction('buildSettlement');
      });
    }
    return (
      <div className="rounded bg-amber-900/80 px-4 py-2 text-center text-sm text-amber-100">
        Place your settlement (click a highlighted intersection)
      </div>
    );
  }

  // Setup road phase
  if (phase === GamePhase.SetupRoad && isMyTurn) {
    if (state) {
      const locs = getValidRoadLocations(state as GameState, myPlayerIndex);
      queueMicrotask(() => {
        setHighlightedEdges(locs);
        setSelectedAction('buildRoad');
      });
    }
    return (
      <div className="rounded bg-amber-900/80 px-4 py-2 text-center text-sm text-amber-100">
        Place your road (click a highlighted edge)
      </div>
    );
  }

  // Waiting for other player during setup
  if ((phase === GamePhase.SetupSettlement || phase === GamePhase.SetupRoad) && !isMyTurn) {
    return (
      <div className="rounded bg-gray-700/80 px-4 py-2 text-center text-sm text-gray-300">
        Waiting for {state.players[state.currentPlayerIndex].name} to place...
      </div>
    );
  }

  // Discard phase
  if (phase === GamePhase.Discard && state.playersNeedingToDiscard.includes(myPlayerIndex)) {
    const total = totalResources(player.resources);
    const mustDiscard = Math.floor(total / 2);
    const currentDiscard = Object.values(discardAmounts).reduce((a, b) => a + b, 0);

    return (
      <div className="rounded bg-red-900/80 px-4 py-2 text-sm text-red-100">
        <p className="mb-2 text-center">
          You must discard {mustDiscard} cards (7 rolled, you have {total}).
        </p>
        <div className="mb-2 flex justify-center gap-2">
          {RESOURCE_TYPES.map((r) => (
            <div key={r} className="flex flex-col items-center gap-0.5">
              <span>
                {RESOURCE_ICONS[r]} {player.resources[r]}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  className="h-5 w-5 cursor-pointer rounded bg-red-800 text-xs"
                  onClick={() =>
                    setDiscardAmounts((prev) => ({
                      ...prev,
                      [r]: Math.max(0, prev[r] - 1),
                    }))
                  }
                >
                  -
                </button>
                <span className="w-4 text-center text-xs">{discardAmounts[r]}</span>
                <button
                  className="h-5 w-5 cursor-pointer rounded bg-red-800 text-xs"
                  onClick={() =>
                    setDiscardAmounts((prev) => ({
                      ...prev,
                      [r]: Math.min(player.resources[r], prev[r] + 1),
                    }))
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Button
            variant="danger"
            disabled={currentDiscard !== mustDiscard}
            onClick={() => {
              actions.discardResources(discardAmounts);
              setDiscardAmounts({ ...EMPTY_RESOURCES });
            }}
          >
            Discard ({currentDiscard}/{mustDiscard})
          </Button>
        </div>
      </div>
    );
  }

  // Move robber phase
  if (phase === GamePhase.MoveRobber && isMyTurn) {
    if (state) {
      const locs = getValidRobberLocations(state as GameState);
      queueMicrotask(() => {
        setHighlightedHexes(locs);
        setSelectedAction('moveRobber');
      });
    }
    return (
      <div className="rounded bg-purple-900/80 px-4 py-2 text-center text-sm text-purple-100">
        Move the robber (click a highlighted hex)
      </div>
    );
  }

  // Steal resource phase
  if (phase === GamePhase.StealResource && isMyTurn && state.robberStealTargets) {
    return (
      <div className="rounded bg-purple-900/80 px-4 py-2 text-sm text-purple-100">
        <p className="mb-2 text-center">Choose a player to steal from:</p>
        <div className="flex justify-center gap-2">
          {state.robberStealTargets.map((targetIdx) => (
            <Button
              key={targetIdx}
              variant="secondary"
              onClick={() => actions.stealResource(targetIdx)}
            >
              {state.players[targetIdx].name}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Road building phase
  if (phase === GamePhase.RoadBuilding && isMyTurn) {
    if (state) {
      const locs = getValidRoadLocations(state as GameState, myPlayerIndex);
      queueMicrotask(() => {
        setHighlightedEdges(locs);
        setSelectedAction('buildRoad');
      });
    }
    return (
      <div className="rounded bg-green-900/80 px-4 py-2 text-center text-sm text-green-100">
        Road Building: place road {3 - state.roadBuildingRoadsLeft} of 2
      </div>
    );
  }

  return null;
}

import { create } from 'zustand';
import type { ResourceType } from '~/engine/types';

export type SelectedAction = 'buildSettlement' | 'buildRoad' | 'buildCity' | 'moveRobber' | null;

interface UIStore {
  selectedAction: SelectedAction;
  highlightedVertices: string[];
  highlightedEdges: string[];
  highlightedHexes: string[];
  showTradeDialog: boolean;
  showDevCards: boolean;
  tradeOfferResource: ResourceType | null;

  setSelectedAction: (action: SelectedAction) => void;
  setHighlightedVertices: (keys: string[]) => void;
  setHighlightedEdges: (keys: string[]) => void;
  setHighlightedHexes: (keys: string[]) => void;
  clearSelection: () => void;
  setShowTradeDialog: (show: boolean) => void;
  setShowDevCards: (show: boolean) => void;
  setTradeOfferResource: (r: ResourceType | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedAction: null,
  highlightedVertices: [],
  highlightedEdges: [],
  highlightedHexes: [],
  showTradeDialog: false,
  showDevCards: false,
  tradeOfferResource: null,

  setSelectedAction: (action) => set({ selectedAction: action }),
  setHighlightedVertices: (keys) => set({ highlightedVertices: keys }),
  setHighlightedEdges: (keys) => set({ highlightedEdges: keys }),
  setHighlightedHexes: (keys) => set({ highlightedHexes: keys }),

  clearSelection: () =>
    set({
      selectedAction: null,
      highlightedVertices: [],
      highlightedEdges: [],
      highlightedHexes: [],
    }),

  setShowTradeDialog: (show) =>
    set(show ? { showTradeDialog: true } : { showTradeDialog: false, tradeOfferResource: null }),
  setShowDevCards: (show) => set({ showDevCards: show }),
  setTradeOfferResource: (r) => set({ tradeOfferResource: r }),
}));

import { create } from 'zustand';
import { GameConfig } from '../../core/config/game-config';

export interface ImperialDispatch {
  id: string;
  content: string;
  timestamp: number;
}

export interface UiState {
  playerFactionId: number;
  
  gold: number;
  food: number;
  production: number;

  selectedHex: { id: number; name: string; biome: string; ownerFaction: number } | null;
  selectedArmy: { index: number; faction: number; manpower: number } | null;
  uiMode: 'DEFAULT' | 'COMMAND_MOVE';
  isFogged: boolean;
  pendingMoves: Record<number, number>;
  
  // Epic 9: Navegação
  scene: 'MAIN_MENU' | 'SIMULATION';
  setScene: (scene: 'MAIN_MENU' | 'SIMULATION') => void;

  mapLens: 'PHYSICAL' | 'POLITICAL';
  setMapLens: (lens: 'PHYSICAL' | 'POLITICAL') => void;
  
  macroHistory: string;
  imperialDispatches: ImperialDispatch[];
  hasNewDispatch: boolean;
  isAiEnabled: boolean;
  
  addImperialDispatch: (content: string, summary?: string) => void;
  clearNewDispatchBadge: () => void;
  toggleAi: () => void;
  
  setSelection: (hex: UiState['selectedHex'], army: UiState['selectedArmy'], isFogged?: boolean) => void;
  clearSelection: () => void;
  setUiMode: (mode: 'DEFAULT' | 'COMMAND_MOVE') => void;
  addPendingMove: (armyIndex: number, targetHexId: number) => void;
  removePendingMove: (armyIndex: number) => void;
  
  setTreasury: (gold: number, food: number, prod: number) => void;
  purchaseStructure: () => boolean;
  purchaseArmy: () => boolean;
}

export const useUiStore = create<UiState>((set, get) => ({
  playerFactionId: 1,
  
  gold: 0,
  food: 0,
  production: 0,

  selectedHex: null,
  selectedArmy: null,
  uiMode: 'DEFAULT',
  isFogged: false,
  pendingMoves: {},

  scene: 'MAIN_MENU',
  setScene: (s) => set({ scene: s }),

  mapLens: 'PHYSICAL',
  setMapLens: (lens) => set({ mapLens: lens }),

  macroHistory: "",
  imperialDispatches: [],
  hasNewDispatch: false,
  isAiEnabled: false,

  addImperialDispatch: (content, summary) => set((state) => {
    const newDispatch: ImperialDispatch = {
      id: Date.now().toString(),
      content,
      timestamp: Date.now()
    };
    return {
      imperialDispatches: [newDispatch, ...state.imperialDispatches],
      hasNewDispatch: true,
      macroHistory: summary ? state.macroHistory + " " + summary : state.macroHistory
    };
  }),

  clearNewDispatchBadge: () => set({ hasNewDispatch: false }),
  toggleAi: () => set((state) => ({ isAiEnabled: !state.isAiEnabled })),

  setSelection: (hex, army, fog) => set({ selectedHex: hex, selectedArmy: army, isFogged: fog ?? false }),
  clearSelection: () => set({ selectedHex: null, selectedArmy: null }),
  setUiMode: (mode) => set({ uiMode: mode }),
  
  addPendingMove: (armyIndex, targetHexId) => set((state) => ({
    pendingMoves: { ...state.pendingMoves, [armyIndex]: targetHexId }
  })),
  
  removePendingMove: (armyIndex) => set((state) => {
    const newPending = { ...state.pendingMoves };
    delete newPending[armyIndex];
    return { pendingMoves: newPending };
  }),

  setTreasury: (g, f, p) => set({ gold: g, food: f, production: p }),

  purchaseStructure: () => {
    const { gold } = get();
    if (gold >= GameConfig.economy.COST_FARM_GOLD) {
      set({ gold: gold - GameConfig.economy.COST_FARM_GOLD });
      return true;
    }
    return false;
  },

  purchaseArmy: () => {
    const { food } = get();
    if (food >= GameConfig.economy.COST_ARMY_FOOD) {
      set({ food: food - GameConfig.economy.COST_ARMY_FOOD });
      return true;
    }
    return false;
  }
}));





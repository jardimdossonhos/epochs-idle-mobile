import { create } from 'zustand';

export interface UIDeltas {
  tick: number;
  isPaused: boolean;
  playerGold: number;
  playerFood: number;
  playerWood: number;
  playerIron: number;
  playerFaith: number;
  playerLegitimacy: number;
  playerGoldIncome: number;
  playerFoodIncome: number;
  playerWoodIncome: number;
  playerIronIncome: number;
  playerFaithIncome: number;
  playerLegitimacyIncome: number;
  playerPopulation: number;
  playerRegions: number;
  playerTaxBaseRate: number;
  playerTaxNobleRelief: number;
  playerTaxClergyExemption: number;
  playerTaxTariffRate: number;
  playerCorruption: number;
  playerInflation: number;
  playerEfficiency: number;
  playerBudgetEconomy: number;
  playerBudgetMilitary: number;
  playerBudgetReligion: number;
  playerBudgetAdministration: number;
  playerBudgetTechnology: number;
  playerEventCount: number;
  playerStability: number;
  worldFeed: any[];
  isGodMode: boolean;
}

export const useUIStore = create<UIDeltas>(() => ({
  tick: 0,
  isPaused: true,
  playerGold: 0,
  playerFood: 0,
  playerWood: 0,
  playerIron: 0,
  playerFaith: 0,
  playerLegitimacy: 0,
  playerGoldIncome: 0,
  playerFoodIncome: 0,
  playerWoodIncome: 0,
  playerIronIncome: 0,
  playerFaithIncome: 0,
  playerLegitimacyIncome: 0,
  playerPopulation: 0,
  playerRegions: 0,
  playerTaxBaseRate: 0,
  playerTaxNobleRelief: 0,
  playerTaxClergyExemption: 0,
  playerTaxTariffRate: 0,
  playerCorruption: 0,
  playerInflation: 0,
  playerEfficiency: 1,
  playerBudgetEconomy: 20,
  playerBudgetMilitary: 20,
  playerBudgetReligion: 20,
  playerBudgetAdministration: 20,
  playerBudgetTechnology: 20,
  playerEventCount: 0,
  playerStability: 100,
  worldFeed: [],
  isGodMode: false,
}));

export const syncUI = (deltas: Partial<UIDeltas>) => {
  useUIStore.setState(deltas);
};


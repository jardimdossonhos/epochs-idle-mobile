import { ResourceType } from "./enums";
import type { RegionId } from "./types";

export type ResourceStock = Record<ResourceType, number>;

export interface TaxPolicy {
  baseRate: number;
  nobleRelief: number;
  clergyExemption: number;
  tariffRate: number;
}

export interface BudgetPriority {
  economy: number;
  military: number;
  religion: number;
  administration: number;
  technology: number;
}

export interface EconomyState {
  stock: ResourceStock;
  incomePerTick: ResourceStock;
  upkeepPerTick: ResourceStock;
  productionByRegion: Record<RegionId, Partial<ResourceStock>>;
  taxPolicy: TaxPolicy;
  budgetPriority: BudgetPriority;
  inflation: number;
  corruption: number;
}

export function createEmptyStock(): ResourceStock {
  return {
    [ResourceType.Gold]: 0,
    [ResourceType.Food]: 0,
    [ResourceType.Wood]: 0,
    [ResourceType.Iron]: 0,
    [ResourceType.Faith]: 0,
    [ResourceType.Legitimacy]: 0
  };
}

export function createDefaultBudgetPriority(): BudgetPriority {
  return {
    economy: 20,
    military: 20,
    religion: 20,
    administration: 20,
    technology: 20
  };
}

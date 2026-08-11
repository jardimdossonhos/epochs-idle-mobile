import { TechnologyDomain, TechnologyEra } from "./enums";

export type ModifierTarget =
  | "economy.food_production_multiplier"
  | "economy.tax_income_multiplier"
  | "population.carrying_capacity_multiplier"
  | "population.growth_rate_multiplier"
  | "military.manpower_modifier"
  | "military.reserveManpower"
  | "military.techLevel"
  | "administration.capacity"
  | "administration.corruption"
  | "religion.cohesion"
  | "religion.authority"
  | "religion.tolerance"
  | "population.growthRate"
  | "economy.goldStock"
  | "economy.foodStock"
  | "economy.woodStock"
  | "economy.ironStock"
  | "economy.faithStock"
  | "stability"
  | "legitimacy";

export type EcsModifiers = Partial<Record<ModifierTarget, Float64Array>>;

export interface TechnologyEffect {
  target: ModifierTarget;
  value: number;
  type: "multiplier" | "additive";
}

export interface TechnologyNode {
  id: string;
  domain: TechnologyDomain;
  era: TechnologyEra;
  name: string;
  description: string;
  required: string[];
  cost: number;
  effects: TechnologyEffect[];
  isGateway?: boolean;
  unlockCapabilities?: string[];
  repeatable?: boolean;
  costScaling?: number;
}

export interface TechnologyState {
  unlocked: Record<string, boolean>;
  activeResearchId: string | null;
  researchFocus: TechnologyDomain;
  researchGoalId: string | null;
  accumulatedResearch: number;
  currentEra: TechnologyEra;
  unlockedEras: TechnologyEra[];
  repeatableLevels: Record<string, number>;
}

export type CalculatedTechnologyEffects = Map<string, number>;

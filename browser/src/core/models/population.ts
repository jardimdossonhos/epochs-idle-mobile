import { PopulationClass } from "./enums";

export type PopulationDistribution = Record<PopulationClass, number>;

export interface PopulationPressure {
  taxation: number;
  inequality: number;
  warWeariness: number;
  famineRisk: number;
  zeal: number;
}

export interface PopulationState {
  total: number;
  groups: PopulationDistribution;
  growthRatePerTick: number;
  pressure: PopulationPressure;
  unrest: number;
}

export function createDefaultPopulationDistribution(): PopulationDistribution {
  return {
    [PopulationClass.Peasants]: 0.72,
    [PopulationClass.Nobles]: 0.04,
    [PopulationClass.Clergy]: 0.07,
    [PopulationClass.Soldiers]: 0.09,
    [PopulationClass.Merchants]: 0.08
  };
}

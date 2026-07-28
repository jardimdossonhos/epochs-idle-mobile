import { getTechnologyNode } from "../data/technology-tree";
import type { CalculatedTechnologyEffects, TechnologyState } from "../models/technology";

/**
 * Calculates the aggregated effects from all unlocked technologies.
 *
 * @param state - The current technology state of a kingdom.
 * @returns A map where keys are effect targets (e.g., 'economy.food_production_multiplier')
 *          and values are the summed bonuses.
 */
export function calculateTechnologyBonuses(state: TechnologyState): CalculatedTechnologyEffects {
  const bonuses: CalculatedTechnologyEffects = new Map<string, number>();

  for (const techId of state.unlocked) {
    const node = getTechnologyNode(techId);
    if (!node || !Array.isArray(node.effects)) {
      continue;
    }

    for (const effect of node.effects) {
      const key = effect.target;
      const currentValue = bonuses.get(key) ?? 0;
      bonuses.set(key, currentValue + effect.value);
    }
  }

  return bonuses;
}

/**
 * A convenience wrapper to get a specific bonus value from a calculated effects map.
 *
 * @param bonuses - The map of calculated bonuses.
 * @param key - The target key of the bonus to retrieve.
 * @param defaultValue - The value to return if the key is not found. Defaults to 0.
 * @returns The bonus value or the default value.
 */
export function getTechnologyBonus(bonuses: CalculatedTechnologyEffects, key: string, defaultValue = 0): number {
  return bonuses.get(key) ?? defaultValue;
}
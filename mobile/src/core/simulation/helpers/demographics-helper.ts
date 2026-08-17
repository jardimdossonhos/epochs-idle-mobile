import { clamp } from "../systems/utils";
import { ResourceType } from "../../models/enums";
import type { KingdomState } from "../../models/game-state";

export function calculateRegionGrowthDelta(
  currentPop: number,
  growthRate: number,
  kingdom: KingdomState | undefined,
  tickScale: number = 1
): number {
  if (!kingdom) return 0;
  
  const foodStock = kingdom.economy.stock[ResourceType.Food];
  const requiredFood = kingdom.population.total / 7_000;
  const foodPressure = requiredFood <= 0 ? 0 : clamp((requiredFood - foodStock) / requiredFood, 0, 1);
  const growthPenalty = 1 - foodPressure * 1.6 - kingdom.population.pressure.warWeariness * 0.2;

  return currentPop * growthRate * growthPenalty * tickScale;
}

import { ResourceType } from "../../models/enums";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, roundTo } from "./utils";

export function createPopulationSystem(): SimulationSystem {
  return {
    id: "population",
    run(context): void {
      let eventSeq = 0;

      for (const kingdomId of Object.keys(context.nextState.kingdoms).sort()) {
        const kingdom = context.nextState.kingdoms[kingdomId];
        const foodStock = kingdom.economy.stock[ResourceType.Food];
        const requiredFood = kingdom.population.total / 7_000;
        const foodPressure = requiredFood <= 0 ? 0 : clamp((requiredFood - foodStock) / requiredFood, 0, 1);

        const naturalGrowth = kingdom.population.total * kingdom.population.growthRatePerTick;
        const growthPenalty = 1 - foodPressure * 1.6 - kingdom.population.pressure.warWeariness * 0.2;
        const populationDelta = Math.round(naturalGrowth * growthPenalty);

        kingdom.population.total = Math.max(120_000, kingdom.population.total + populationDelta);

        kingdom.population.pressure.famineRisk = roundTo(clamp(foodPressure, 0, 1));
        kingdom.population.unrest = roundTo(
          clamp(
            kingdom.population.unrest + foodPressure * 0.05 + kingdom.population.pressure.taxation * 0.01 - kingdom.religion.cohesion * 0.01,
            0,
            1
          )
        );

        const stabilityShift = (0.5 - kingdom.population.unrest) * 1.2;
        kingdom.stability = roundTo(clamp(kingdom.stability + stabilityShift, 0, 100));

        if (kingdom.population.unrest > 0.75 && context.nextState.meta.tick % 7 === 0) {
          context.events.push({
            id: createEventId({
              prefix: "evt_unrest",
              tick: context.nextState.meta.tick,
              systemId: "population",
              actorId: kingdom.id,
              sequence: eventSeq++
            }),
            type: "population.unrest_warning",
            actorKingdomId: kingdom.id,
            payload: {
              unrest: kingdom.population.unrest,
              stability: kingdom.stability
            },
            occurredAt: context.now
          });
        }
      }
    }
  };
}

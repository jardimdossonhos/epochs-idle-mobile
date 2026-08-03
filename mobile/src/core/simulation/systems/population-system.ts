import { buildEvent } from "../../ecs/event-pool";
import { ResourceType } from "../../models/enums";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, roundTo } from "./utils";
import type { RegionDefinition } from "../../models/world";

export function createPopulationSystem(orderedDefinitions: RegionDefinition[]): SimulationSystem {
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
        const tribalBaseGrowth = (kingdom.population.total < 2000 && foodPressure === 0) ? 0.35 : 0;
        const growthPenalty = Math.max(0, 1 - foodPressure * 1.6 - kingdom.population.pressure.warWeariness * 0.2);
        const populationDelta = (naturalGrowth + tribalBaseGrowth) * growthPenalty;

        kingdom.population.total = Math.max(10, roundTo(kingdom.population.total + populationDelta));

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
          const evt = buildEvent("population.unrest_warning", context.now, {
              unrest: kingdom.population.unrest,
              stability: kingdom.stability
            }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_unrest", tick: context.nextState.meta.tick, systemId: "population", actorId: kingdom.id, sequence: eventSeq++ });
            context.events.push(evt);
          }
        }
      }

      // Grow region populations
      if (context.nextState.ecs && context.nextState.ecs.populationTotal && context.nextState.ecs.populationGrowthRate) {
        const tickScale = context.tickScale ?? 1;
        for (let i = 0; i < orderedDefinitions.length; i++) {
          const def = orderedDefinitions[i];
          const regionState = context.nextState.world.regions[def.id];
          if (!regionState || regionState.ownerId === "k_nature") continue;

          const kingdom = context.nextState.kingdoms[regionState.ownerId];
          if (!kingdom) continue;

          const foodStock = kingdom.economy.stock[ResourceType.Food];
          const requiredFood = kingdom.population.total / 7_000;
          const foodPressure = requiredFood <= 0 ? 0 : clamp((requiredFood - foodStock) / requiredFood, 0, 1);
          const growthPenalty = 1 - foodPressure * 1.6 - kingdom.population.pressure.warWeariness * 0.2;

          const currentPop = context.nextState.ecs.populationTotal[i];
          const growthRate = context.nextState.ecs.populationGrowthRate[i];
          const delta = currentPop * growthRate * growthPenalty * tickScale;

          context.nextState.ecs.populationTotal[i] = Math.max(0, currentPop + delta);
        }
      }
    }
  };
}

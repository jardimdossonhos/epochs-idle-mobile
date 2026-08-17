import { buildEvent } from "../../ecs/event-pool";
import { ResourceType } from "../../models/enums";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, roundTo } from "./utils";
import type { RegionDefinition } from "../../models/world";
import { calculateRegionGrowthDelta } from "../helpers/demographics-helper";

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

      // Grow region populations and aggregate (Piggybacking)
      if (context.nextState.ecs && context.nextState.ecs.populationTotal && context.nextState.ecs.populationGrowthRate) {
        const ecs = context.nextState.ecs;
        ecs.factionPopulation.fill(0);
        ecs.factionRegions.fill(0);
        ecs.factionPopulationGrowth.fill(0);
        ecs.factionPeasants.fill(0);
        ecs.factionNobles.fill(0);
        ecs.factionClergy.fill(0);
        ecs.factionSoldiers.fill(0);
        ecs.factionMerchants.fill(0);
        ecs.factionPopUnrest.fill(0);

        const tickScale = context.tickScale ?? 1;
        const totalEntities = ecs.regionOwner.length;
        
        for (let i = 0; i < totalEntities; i++) {
          const ownerFactionId = ecs.regionOwner[i];
          
          if (ownerFactionId <= 0 || ownerFactionId >= 256) continue; // k_nature, water or invalid

          // Map faction ID back to kingdom ID
          const kingdomId = ownerFactionId === 1 ? "k_player" : `k_npc_${ownerFactionId - 1}`;
          const kingdom = context.nextState.kingdoms[kingdomId];
          
          if (!kingdom) continue;

          const currentPop = ecs.populationTotal[i];
          const growthRate = ecs.populationGrowthRate[i];
          
          const delta = calculateRegionGrowthDelta(currentPop, growthRate, kingdom, tickScale);
          const newPop = Math.max(0, currentPop + delta);

          ecs.populationTotal[i] = newPop;
          
          // ── Piggybacking: aggregate faction-level O(1) stats for UI ──
          ecs.factionPopulation[ownerFactionId] += newPop;
          ecs.factionRegions[ownerFactionId] += 1;
          ecs.factionPopulationGrowth[ownerFactionId] += delta;

          // Class groups: kingdom.population.groups stores faction-wide ratios (not per-region),
          // so we write once per kingdom; repeated writes of the same value are idempotent.
          const groups = kingdom.population.groups;
          if (groups) {
            ecs.factionPeasants[ownerFactionId]  = groups["peasants"]  ?? 0;
            ecs.factionNobles[ownerFactionId]    = groups["nobles"]    ?? 0;
            ecs.factionClergy[ownerFactionId]    = groups["clergy"]    ?? 0;
            ecs.factionSoldiers[ownerFactionId]  = groups["soldiers"]  ?? 0;
            ecs.factionMerchants[ownerFactionId] = groups["merchants"] ?? 0;
          }

          // Population unrest: also kingdom-wide; write once per kingdom.
          ecs.factionPopUnrest[ownerFactionId] = kingdom.population.unrest ?? 0;
        }
      }
    }
  };
}

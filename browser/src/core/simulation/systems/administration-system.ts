﻿import type { RegionalControl } from "../../models/administration";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, getOwnedRegionIds, roundTo } from "./utils";

function createRegionalControl(regionId: string): RegionalControl {
  return {
    regionId,
    localAutonomy: 0.35,
    taxationEfficiency: 0.62,
    integration: 0.5,
    revoltRisk: 0.24
  };
}

export function createAdministrationSystem(): SimulationSystem {
  return {
    id: "administration",
    run(context): void {
      const state = context.nextState;
      const definitions = context.staticData.definitions;
      let eventSeq = 0;

      for (const kingdomId of Object.keys(state.kingdoms).sort()) {
        const kingdom = state.kingdoms[kingdomId];
        const ownedRegionIds = getOwnedRegionIds(state, kingdom.id);
        const controlsByRegion = new Map(kingdom.administration.regionalControl.map((entry) => [entry.regionId, entry]));

        for (const regionId of ownedRegionIds) {
          if (!controlsByRegion.has(regionId)) {
            const control = createRegionalControl(regionId);
            controlsByRegion.set(regionId, control);
          }
        }

        const nextControls: RegionalControl[] = [];
        let usedCapacity = 0;

        for (const regionId of ownedRegionIds) {
          const region = state.world.regions[regionId];
          const definition = definitions[regionId];

          if (!region || !definition) {
            continue;
          }

          const control = controlsByRegion.get(regionId) ?? createRegionalControl(regionId);
          const desiredAutonomy = clamp(
            kingdom.administration.policy.regionalAutonomyTarget + (1 - region.assimilation) * 0.12 + state.victory.crisisPressure * 0.1,
            0.08,
            0.85
          );

          control.localAutonomy = roundTo(clamp(control.localAutonomy + (desiredAutonomy - control.localAutonomy) * 0.06, 0, 1));

          const capacityPressure = kingdom.administration.usedCapacity / Math.max(1, kingdom.administration.adminCapacity);
          const integrationGain =
            kingdom.administration.policy.assimilationInvestment * (1 - control.localAutonomy) * (1 - capacityPressure * 0.4) * 0.04;

          control.integration = roundTo(clamp(control.integration + integrationGain, 0, 1));
          control.taxationEfficiency = roundTo(
            clamp(0.42 + (1 - control.localAutonomy) * 0.38 + control.integration * 0.2 - kingdom.administration.corruption * 0.25, 0, 1)
          );

          control.revoltRisk = roundTo(
            clamp(
              region.unrest * 0.38 + 
              region.faithUnrest * 0.18 + // O choque cultural e religioso inflama revoltas separatistas
              control.localAutonomy * 0.22 + 
              (1 - control.integration) * 0.3 + 
              state.victory.crisisPressure * 0.25, 
              0, 
              1
            )
          );

          region.autonomy = roundTo(clamp(region.autonomy + (control.localAutonomy - region.autonomy) * 0.12, 0, 1));
          region.assimilation = roundTo(clamp(region.assimilation + integrationGain * 0.6, 0, 1));
          region.unrest = roundTo(
            clamp(
              region.unrest + (control.revoltRisk - 0.5) * 0.012 - kingdom.administration.policy.assimilationInvestment * 0.005,
              0,
              1
            )
          );

          usedCapacity += 7 + definition.strategicValue * 1.5 + (1 - region.assimilation) * 8;

          if (control.revoltRisk > 0.78 && state.meta.tick % 7 === 0) {
            context.events.push({
              id: createEventId({
                prefix: "evt_revolt",
                tick: state.meta.tick,
                systemId: "administration",
                actorId: kingdom.id,
                sequence: eventSeq++
              }),
              type: "administration.revolt_risk",
              actorKingdomId: kingdom.id,
              payload: {
                regionId,
                revoltRisk: control.revoltRisk,
                localAutonomy: control.localAutonomy
              },
              occurredAt: context.now
            });
          }

          nextControls.push(control);
        }

        kingdom.administration.regionalControl = nextControls;
        kingdom.administration.usedCapacity = roundTo(usedCapacity);

        const overCapacity = Math.max(0, kingdom.administration.usedCapacity - kingdom.administration.adminCapacity);
        const antiCorruptionImpact = kingdom.administration.policy.antiCorruptionBudget * 0.024;

        kingdom.administration.corruption = roundTo(
          clamp(kingdom.administration.corruption + overCapacity * 0.0012 - antiCorruptionImpact + state.victory.crisisPressure * 0.01, 0, 1)
        );

        kingdom.economy.corruption = roundTo(clamp((kingdom.economy.corruption + kingdom.administration.corruption) / 2, 0, 1));

        if (overCapacity > 0) {
          kingdom.stability = roundTo(clamp(kingdom.stability - overCapacity * 0.02, 0, 100));
          kingdom.legitimacy = roundTo(clamp(kingdom.legitimacy - overCapacity * 0.014, 0, 100));
        }
      }
    }
  };
}

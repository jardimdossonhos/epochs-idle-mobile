import type { WarResolver } from "../../contracts/services";
import type { SimulationSystem } from "../tick-pipeline";
import { createEventId, roundTo, getCanonicalRegionOwner } from "./utils";
import { buildEvent } from "../../ecs/event-pool";

export function createWarSystem(warResolver: WarResolver): SimulationSystem {
  return {
    id: "war",
    run(context): void {
      if (context.nextState.meta.tick === 0) return;
      const stateBefore = context.nextState;
      let eventSeq = 0;
      const ownersBefore = new Map(
        Object.keys(stateBefore.world.regions)
          .sort()
          .map((regionId) => [regionId, getCanonicalRegionOwner(stateBefore, regionId)] as const)
      );
      const warScoresBefore = new Map(
        Object.keys(stateBefore.wars)
          .sort()
          .map((warId) => [warId, stateBefore.wars[warId].warScore] as const)
      );

      context.nextState = warResolver.resolveTick(context.nextState, context.now);

      const warsAfter = Object.keys(context.nextState.wars)
        .sort()
        .map((warId) => context.nextState.wars[warId]);

      for (const war of warsAfter) {
        const previousScore = warScoresBefore.get(war.id);

        if (previousScore !== undefined && Math.abs(previousScore) < 45 && Math.abs(war.warScore) >= 45) {
          const actorId = war.warScore > 0 ? war.attackers[0] : war.defenders[0];
          const evt = buildEvent(
            "war.escalated",
            context.now,
            { warId: war.id, warScore: roundTo(war.warScore) },
            actorId
          );
          if (evt) {
            evt.id = createEventId({ prefix: "evt_war_escalation", tick: context.nextState.meta.tick, systemId: "war", actorId, sequence: eventSeq++ });
            context.events.push(evt);
          }
        }

        // Processamento de Baixas Físicas (Dreno Populacional)
        if (war.casualties) {
          for (const kingdomId of Object.keys(war.casualties)) {
            const dead = war.casualties[kingdomId];
            if (dead > 0) {
              const evt = buildEvent("war.casualties", context.now, { warId: war.id, amount: dead }, kingdomId, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_war_casualties", tick: context.nextState.meta.tick, systemId: "war", actorId: kingdomId, sequence: eventSeq++ });
            context.events.push(evt);
          }
              // Limpa o buffer após o evento ser despachado para a Thread Principal
              war.casualties[kingdomId] = 0;
            }
          }
        }
      }

      for (const [regionId, previousOwnerId] of ownersBefore.entries()) {
        const regionAfter = context.nextState.world.regions[regionId];
        const regionOwnerAfter = getCanonicalRegionOwner(context.nextState, regionId);
        if (!regionAfter || regionOwnerAfter === previousOwnerId) {
          continue;
        }

        const evt = buildEvent("war.region_captured", context.now, {
            regionId,
            previousOwnerId,
            newOwnerId: regionOwnerAfter
          }, regionOwnerAfter, previousOwnerId);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_war_capture", tick: context.nextState.meta.tick, systemId: "war", actorId: regionOwnerAfter, sequence: eventSeq++ });
            context.events.push(evt);
          }
      }
    }
  };
}

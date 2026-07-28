﻿import type { WarResolver } from "../../contracts/services";
import type { SimulationSystem } from "../tick-pipeline";
import { createEventId, roundTo } from "./utils";

export function createWarSystem(warResolver: WarResolver): SimulationSystem {
  return {
    id: "war",
    run(context): void {
      const stateBefore = context.nextState;
      let eventSeq = 0;
      const ownersBefore = new Map(
        Object.keys(stateBefore.world.regions)
          .sort()
          .map((regionId) => [regionId, stateBefore.world.regions[regionId].ownerId] as const)
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
          context.events.push({
            id: createEventId({
              prefix: "evt_war_escalation",
              tick: context.nextState.meta.tick,
              systemId: "war",
              actorId: war.warScore > 0 ? war.attackers[0] : war.defenders[0],
              sequence: eventSeq++
            }),
            type: "war.escalated",
            actorKingdomId: war.warScore > 0 ? war.attackers[0] : war.defenders[0],
            payload: {
              warId: war.id,
              warScore: roundTo(war.warScore)
            },
            occurredAt: context.now
          });
        }

        // Processamento de Baixas Físicas (Dreno Populacional)
        if (war.casualties) {
          for (const kingdomId of Object.keys(war.casualties)) {
            const dead = war.casualties[kingdomId];
            if (dead > 0) {
              context.events.push({
                id: createEventId({
                  prefix: "evt_war_casualties",
                  tick: context.nextState.meta.tick,
                  systemId: "war",
                  actorId: kingdomId,
                  sequence: eventSeq++
                }),
                type: "war.casualties",
                actorKingdomId: kingdomId,
                payload: { warId: war.id, amount: dead },
                occurredAt: context.now
              });
              // Limpa o buffer após o evento ser despachado para a Thread Principal
              war.casualties[kingdomId] = 0;
            }
          }
        }
      }

      for (const [regionId, previousOwnerId] of ownersBefore.entries()) {
        const regionAfter = context.nextState.world.regions[regionId];
        if (!regionAfter || regionAfter.ownerId === previousOwnerId) {
          continue;
        }

        context.events.push({
          id: createEventId({
            prefix: "evt_war_capture",
            tick: context.nextState.meta.tick,
            systemId: "war",
            actorId: regionAfter.ownerId,
            sequence: eventSeq++
          }),
          type: "war.region_captured",
          actorKingdomId: regionAfter.ownerId,
          targetKingdomId: previousOwnerId,
          payload: {
            regionId,
            previousOwnerId,
            newOwnerId: regionAfter.ownerId
          },
          occurredAt: context.now
        });
      }
    }
  };
}

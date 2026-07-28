import { buildEvent } from "../../ecs/event-pool";
﻿import { VictoryPath } from "../../models/enums";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, getOwnedRegionIds, getPlayerKingdom, roundTo } from "./utils";

export function createVictorySystem(): SimulationSystem {
  return {
    id: "victory",
    run(context): void {
      const state = context.nextState;
      let eventSeq = 0;
      const player = getPlayerKingdom(state);
      const totalRegions = Math.max(1, Object.keys(state.world.regions).length);
      const playerTerritory = getOwnedRegionIds(state, player.id).length;
      const territorialShare = playerTerritory / totalRegions;

      player.victoryProgress[VictoryPath.TerritorialDomination] = roundTo(territorialShare);

      if (state.victory.achievedPath === null) {
        const target = state.campaign.victoryTargets.find((item) => item.path === VictoryPath.TerritorialDomination);

        if (target && territorialShare >= target.threshold) {
          state.victory.achievedPath = VictoryPath.TerritorialDomination;
          state.victory.achievedAt = context.now;
          state.victory.postVictoryMode = true;

          const evt = buildEvent("victory.achieved", context.now, {
              path: VictoryPath.TerritorialDomination,
              territorialShare: roundTo(territorialShare)
            }, player.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_victory", tick: context.nextState.meta.tick, systemId: "victory", actorId: player.id, sequence: context.events.length });
            context.events.push(evt);
          }
        }
      }

      if (state.victory.postVictoryMode) {
        state.victory.crisisPressure = roundTo(
          clamp(state.victory.crisisPressure + 0.002 + Math.max(0, territorialShare - 0.55) * 0.01, 0, 1)
        );
      }
    }
  };
}

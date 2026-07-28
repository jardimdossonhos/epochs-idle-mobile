import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { TickPipeline } from "../src/core/simulation/tick-pipeline";
import { createWarSystem } from "../src/core/simulation/systems/war-system";
import { LocalWarResolver } from "../src/infrastructure/war/local-war-resolver";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";

describe("world activity dynamics", () => {
  it("produces territorial change when an active frontier war is simulated", () => {
    const staticData = createStaticWorldData();
    const warResolver = new LocalWarResolver(staticData);
    const pipeline = new TickPipeline([createWarSystem(warResolver)], staticData);
    let state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const attacker = Object.values(state.kingdoms).find((kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature");
    const defender = state.kingdoms.k_player;

    if (!attacker) {
      throw new Error("Expected at least one NPC kingdom in the initial state.");
    }

    const playerBorder = Object.values(state.world.regions).find((region) => {
      if (region.ownerId !== defender.id) {
        return false;
      }

      return (staticData.neighborsByRegionId[region.regionId] ?? []).some((neighborId) => Boolean(state.world.regions[neighborId]));
    });

    if (!playerBorder) {
      throw new Error("Expected at least one player-owned region with a valid neighboring region.");
    }

    const borderRegionId = (staticData.neighborsByRegionId[playerBorder.regionId] ?? []).find(
      (neighborId) => Boolean(state.world.regions[neighborId])
    );
    if (!borderRegionId) {
      throw new Error("Expected a neighboring region around the simulated frontier.");
    }

    state.world.regions[borderRegionId].ownerId = attacker.id;
    state.world.regions[borderRegionId].controllerId = attacker.id;
    attacker.capitalRegionId = borderRegionId;
    attacker.military.armies[0].stationedRegionId = borderRegionId;
    attacker.military.armies[0].manpower = 120_000;
    attacker.military.armies[0].quality = 0.92;
    defender.military.armies[0].manpower = 4_000;
    defender.military.armies[0].quality = 0.2;
    attacker.diplomacy.relations[defender.id].score.rivalry = 0.95;
    attacker.diplomacy.relations[defender.id].grievance = 0.9;
    attacker.diplomacy.relations[defender.id].score.trust = 0.05;

    state.wars.frontier_war = {
      id: "frontier_war",
      attackers: [attacker.id],
      defenders: [defender.id],
      warScore: 30,
      casualties: {},
      startedAt: state.meta.lastUpdatedAt,
      fronts: [
        {
          regionId: playerBorder.regionId,
          pressureAttackers: 85,
          pressureDefenders: 15
        }
      ]
    };

    let simNow = state.meta.lastUpdatedAt;
    const initialOwnersByRegion = new Map(
      Object.keys(state.world.regions)
        .sort()
        .map((regionId) => [regionId, state.world.regions[regionId].ownerId] as const)
    );

    const ticks = 6;

    for (let index = 0; index < ticks; index += 1) {
      simNow += state.meta.tickDurationMs;
      const result = pipeline.run(state, state.meta.tickDurationMs, simNow);
      state = result.state;
    }

    const changedRegions = Object.keys(state.world.regions)
      .sort()
      .filter((regionId) => state.world.regions[regionId].ownerId !== initialOwnersByRegion.get(regionId)).length;

    expect(changedRegions).toBeGreaterThanOrEqual(1);
  });
});

import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { TickPipeline } from "../src/core/simulation/tick-pipeline";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { createReligionSystem } from "../src/core/simulation/systems/religion-system";

function frontierRegionIds(state: ReturnType<typeof createInitialState>, ownerId: string, rivalId: string, neighborsByRegionId: Record<string, string[]>): string[] {
  return Object.keys(state.world.regions)
    .sort()
    .filter((regionId) => {
      const region = state.world.regions[regionId];
      if (region.ownerId !== ownerId) {
        return false;
      }

      return (neighborsByRegionId[regionId] ?? []).some((neighborId) => state.world.regions[neighborId]?.ownerId === rivalId);
    });
}

function faithShareForRegion(
  region: ReturnType<typeof createInitialState>["world"]["regions"][string],
  faithId: string
): number {
  if (region.dominantFaith === faithId) {
    return region.dominantShare;
  }
  if (region.minorityFaith === faithId) {
    return region.minorityShare ?? 0;
  }
  return 0;
}

describe("religion influence system", () => {
  it("applies deterministic frontier conversion when missionaries pressure is active", () => {
    const staticData = createStaticWorldData();
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const player = state.kingdoms.k_player;
    const target = Object.keys(state.kingdoms)
      .sort()
      .map((kingdomId) => state.kingdoms[kingdomId])
      .find((kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature" && kingdom.religion.stateFaith !== player.religion.stateFaith);
    expect(target).toBeDefined();
    if (!target) {
      return;
    }

    const focusRegionId = (staticData.neighborsByRegionId[player.capitalRegionId] ?? []).find(
      (regionId) => Boolean(state.world.regions[regionId])
    );
    expect(focusRegionId).toBeDefined();
    if (!focusRegionId) {
      return;
    }

    state.world.regions[focusRegionId].ownerId = target.id;
    state.world.regions[focusRegionId].controllerId = target.id;
    target.capitalRegionId = focusRegionId;
    const frontier = [focusRegionId];

    const focusRegion = state.world.regions[focusRegionId];
    focusRegion.dominantFaith = target.religion.stateFaith;
    focusRegion.dominantShare = 0.78;
    focusRegion.minorityFaith = undefined;
    focusRegion.minorityShare = undefined;
    focusRegion.faithUnrest = 0.12;

    target.religion.externalInfluenceIn[player.id] = 0.86;
    target.religion.tolerance = 0.22;
    target.religion.authority = 0.32;
    player.religion.authority = 0.82;
    player.religion.missionaryBudget = 0.7;

    const beforeShare = frontier
      .map((regionId) => state.world.regions[regionId])
      .reduce((sum, region) => sum + faithShareForRegion(region, player.religion.stateFaith), 0);
    const pipeline = new TickPipeline([createReligionSystem()], staticData);
    const result = pipeline.runBatch(state, 1, state.meta.tickDurationMs, state.meta.lastUpdatedAt, {
      collectEvents: true,
      maxCollectedEvents: 1_000
    });
    const afterShare = frontier
      .map((regionId) => result.state.world.regions[regionId])
      .reduce((sum, region) => sum + faithShareForRegion(region, player.religion.stateFaith), 0);

    expect(result.events.some((event) => event.type === "religion.mission_started")).toBe(true);
    expect(afterShare).toBeGreaterThan(beforeShare);
  });

  it("emits deterministic coup risk event under high influence and low stability", () => {
    const staticData = createStaticWorldData();
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const player = state.kingdoms.k_player;
    const target = Object.keys(state.kingdoms)
      .sort()
      .map((kingdomId) => state.kingdoms[kingdomId])
      .find((kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature" && kingdom.religion.stateFaith !== player.religion.stateFaith);
    expect(target).toBeDefined();
    if (!target) {
      return;
    }

    const focusRegionId = (staticData.neighborsByRegionId[player.capitalRegionId] ?? []).find(
      (regionId) => Boolean(state.world.regions[regionId])
    );
    expect(focusRegionId).toBeDefined();
    if (!focusRegionId) {
      return;
    }

    state.world.regions[focusRegionId].ownerId = target.id;
    state.world.regions[focusRegionId].controllerId = target.id;
    target.capitalRegionId = focusRegionId;

    target.religion.externalInfluenceIn[player.id] = 0.93;
    target.religion.tolerance = 0.16;
    target.religion.authority = 0.22;
    target.stability = 24;
    player.religion.authority = 0.86;
    player.religion.missionaryBudget = 0.72;

    const pipeline = new TickPipeline([createReligionSystem()], staticData);
    const result = pipeline.runBatch(state, 1, state.meta.tickDurationMs, state.meta.lastUpdatedAt, {
      collectEvents: true,
      maxCollectedEvents: 1_000
    });

    const coupEvents = result.events.filter((event) => event.type === "religion.coup_risk");
    expect(coupEvents.length).toBeGreaterThan(0);
    expect(coupEvents.every((event) => event.actorKingdomId === player.id)).toBe(true);
    expect(coupEvents.every((event) => event.targetKingdomId === target.id)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";

describe("world state global bootstrap", () => {
  it("initializes all world regions with owners and static definitions", () => {
    const staticData = createStaticWorldData();
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const regionIds = Object.keys(state.world.regions).sort();
    const definitionIds = Object.keys(staticData.definitions).sort();

    expect(regionIds.length).toBeGreaterThanOrEqual(200);
    expect(regionIds.length).toBe(definitionIds.length);
    expect(state.world.mapId).toBe("world_countries_v1");

    const missingOwners = regionIds.filter((regionId) => {
      const ownerId = state.world.regions[regionId].ownerId;
      return typeof ownerId !== "string" || !state.kingdoms[ownerId];
    });

    expect(missingOwners).toHaveLength(0);
  });
});

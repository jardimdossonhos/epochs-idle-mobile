import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { buildRenderGameTextState } from "../src/ui/view-models/render-game-to-text";

describe("buildRenderGameTextState", () => {
  it("serializes the current campaign snapshot with selected region and event chains", () => {
    const staticData = createStaticWorldData();
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const player = Object.values(state.kingdoms).find((kingdom) => kingdom.isPlayer);

    expect(player).toBeDefined();

    const capitalRegionId = player!.capitalRegionId;
    const capitalRegionIndex = WORLD_DEFINITIONS_V1.findIndex((region) => region.id === capitalRegionId);

    state.world.eventChains = {
      economic_crisis_k_player: {
        id: "economic_crisis_k_player",
        kingdomId: player!.id,
        chainType: "economic_crisis",
        stage: 2,
        maxStages: 4,
        startedAt: 3,
        lastTriggered: 8,
        data: {}
      }
    };
    state.events.unshift({
      id: "evt_manual",
      title: "Colheita em risco",
      details: "A cadeia economica esta afetando o suprimento local.",
      severity: "warning",
      occurredAt: state.meta.createdAt
    });
    state.meta.tick = 12;
    state.meta.paused = false;

    const length = WORLD_DEFINITIONS_V1.length;
    const goldData = new Float64Array(length);
    const foodData = new Float64Array(length);
    const woodData = new Float64Array(length);
    const ironData = new Float64Array(length);
    const faithData = new Float64Array(length);
    const legitimacyData = new Float64Array(length);
    const populationTotalData = new Float64Array(length);
    const manpowerData = new Float64Array(length);

    goldData[capitalRegionIndex] = 120;
    foodData[capitalRegionIndex] = 340;
    woodData[capitalRegionIndex] = 90;
    faithData[capitalRegionIndex] = 25;
    legitimacyData[capitalRegionIndex] = 18;
    populationTotalData[capitalRegionIndex] = 4800;
    manpowerData[capitalRegionIndex] = 210;

    const payload = JSON.parse(
      buildRenderGameTextState({
        state,
        player: player!,
        definitions: WORLD_DEFINITIONS_V1,
        simulation: {
          goldData,
          foodData,
          woodData,
          ironData,
          faithData,
          legitimacyData,
          populationTotalData,
          manpowerData
        },
        activeLayer: "owner",
        selectedRegionId: capitalRegionId,
        selectedMapLabel: "Capital"
      })
    );

    expect(payload.mode).toBe("running");
    expect(payload.player.kingdomId).toBe(player!.id);
    expect(payload.player.resources.food).toBe(340);
    expect(payload.player.resources.population).toBe(4800);
    expect(payload.selectedRegion.regionId).toBe(capitalRegionId);
    expect(payload.selectedRegion.label).toBe("Capital");
    expect(payload.activeEventChains).toHaveLength(1);
    expect(payload.activeEventChains[0].chainType).toBe("economic_crisis");
    expect(payload.activeEventChains[0].stage).toBe(2);
    expect(payload.recentEvents[0].title).toBe("Colheita em risco");
  });
});

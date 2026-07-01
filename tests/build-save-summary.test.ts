import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { buildSaveSummary } from "../src/application/save/build-save-summary";

describe("buildSaveSummary", () => {
  it("creates a valid summary", () => {
    const state = createInitialState(undefined, undefined, WORLD_DEFINITIONS_V1);
    state.meta.tick = 12;

    const summary = buildSaveSummary("manual-1", state, 1_700_000_000_000);

    expect(summary.slotId).toBe("manual-1");
    expect(summary.tick).toBe(12);
    expect(summary.playerKingdomName).toBe(state.kingdoms.k_player.name);
    expect(summary.territoryCount).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { buildSaveSummary } from "../src/application/save/build-save-summary";
import { TreatyType } from "../src/core/models/enums";
import { buildTreatyId } from "../src/core/models/identifiers";
import { MANUAL_SLOT_ID } from "../src/infrastructure/persistence/save-slots";
import { normalizeSaveEnvelope, SAVE_SCHEMA_VERSION } from "../src/infrastructure/persistence/save-schema";

describe("save schema migration", () => {
  it("migrates v1 saves to canonical v2 ids", () => {
    const state = createInitialState(undefined, undefined, WORLD_DEFINITIONS_V1);
    state.meta.schemaVersion = 1;

    const attacker = Object.values(state.kingdoms).find((kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature");
    if (!attacker) {
      throw new Error("Expected at least one NPC kingdom in the initial state.");
    }

    const attackerId = attacker.id;
    const defenderId = "k_player";
    const signedAt = 45_000;

    state.wars = {
      war_legacy_reverse: {
        id: "war_legacy_reverse",
        attackers: [attackerId],
        defenders: [defenderId],
        casualties: {},
        warScore: 0,
        startedAt: 30_000,
        fronts: []
      }
    };

    const legacyTreatyA = {
      id: `treaty_${TreatyType.Peace}_${attackerId}_${defenderId}`,
      type: TreatyType.Peace,
      parties: [attackerId, defenderId],
      signedAt,
      expiresAt: signedAt + 12_000,
      terms: { borderFreeze: true }
    };

    const legacyTreatyB = {
      ...legacyTreatyA,
      id: `treaty_${TreatyType.Peace}_${defenderId}_${attackerId}`,
      parties: [defenderId, attackerId]
    };

    state.kingdoms[attackerId].diplomacy.treaties = [legacyTreatyA];
    state.kingdoms[defenderId].diplomacy.treaties = [legacyTreatyB];

    const normalized = normalizeSaveEnvelope({
      schemaVersion: 1,
      storedAt: 90_000,
      snapshot: {
        summary: buildSaveSummary(MANUAL_SLOT_ID, state, 90_000),
        state
      }
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);

    const migratedState = normalized!.snapshot.state;
    expect(migratedState.meta.schemaVersion).toBe(SAVE_SCHEMA_VERSION);

    const warIds = Object.keys(migratedState.wars);
    expect(warIds).toHaveLength(1);
    expect(warIds[0].startsWith("war:")).toBe(true);
    expect(migratedState.wars[warIds[0]].id).toBe(warIds[0]);

    const expectedTreatyId = buildTreatyId(TreatyType.Peace, [attackerId, defenderId], signedAt);
    expect(migratedState.kingdoms[attackerId].diplomacy.treaties[0].id).toBe(expectedTreatyId);
    expect(migratedState.kingdoms[defenderId].diplomacy.treaties[0].id).toBe(expectedTreatyId);
    expect(migratedState.kingdoms[attackerId].diplomacy.treaties[0].parties).toEqual([defenderId, attackerId].sort());
  });
});

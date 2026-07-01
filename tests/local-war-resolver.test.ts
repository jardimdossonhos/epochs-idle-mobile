import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { DiplomaticRelation, TreatyType } from "../src/core/models/enums";
import { LocalWarResolver } from "../src/infrastructure/war/local-war-resolver";

describe("LocalWarResolver", () => {
  it("declares war and enforces peace treaty", () => {
    const staticData = createStaticWorldData();
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const resolver = new LocalWarResolver(staticData);
    const attacker = Object.values(state.kingdoms).find((kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature");

    if (!attacker) {
      throw new Error("Expected at least one NPC kingdom in the initial state.");
    }

    const attackerId = attacker.id;
    const defenderId = "k_player";

    const risk = resolver.evaluateWarRisk(state.kingdoms[attackerId], state.kingdoms[defenderId], state);
    expect(risk).toBeGreaterThanOrEqual(0);
    expect(risk).toBeLessThanOrEqual(1);

    resolver.declareWar(state, attackerId, defenderId);

    const wars = Object.values(state.wars);
    expect(wars.length).toBe(1);

    const war = wars[0];
    expect(war.attackers).toContain(attackerId);
    expect(war.defenders).toContain(defenderId);
    expect(state.kingdoms[attackerId].diplomacy.relations[defenderId].status).toBe(DiplomaticRelation.Hostile);

    resolver.enforcePeace(state, war.id);

    expect(Object.keys(state.wars).length).toBe(0);
    expect(state.kingdoms[attackerId].diplomacy.relations[defenderId].status).toBe(DiplomaticRelation.Truce);

    const hasPeaceTreaty = state.kingdoms[attackerId].diplomacy.treaties.some(
      (treaty) => treaty.type === TreatyType.Peace && treaty.parties.includes(attackerId) && treaty.parties.includes(defenderId)
    );

    expect(hasPeaceTreaty).toBe(true);
  });
});

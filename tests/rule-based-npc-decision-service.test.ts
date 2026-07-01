import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { RuleBasedNpcDecisionService } from "../src/infrastructure/npc/rule-based-npc-decision-service";

function getNpcActor(state: ReturnType<typeof createInitialState>) {
  const actor = Object.values(state.kingdoms).find((kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature");

  if (!actor) {
    throw new Error("Expected at least one NPC kingdom in the initial state.");
  }

  return actor;
}

describe("RuleBasedNpcDecisionService", () => {
  it("proposes war when expansionist NPC has strong advantage", () => {
    const state = createInitialState(undefined, undefined, WORLD_DEFINITIONS_V1);
    const service = new RuleBasedNpcDecisionService();

    const actor = getNpcActor(state);
    const player = state.kingdoms.k_player;
    const relation = actor.diplomacy.relations[player.id];

    relation.score.rivalry = 0.82;
    relation.score.trust = 0.18;
    relation.grievance = 0.76;

    actor.military.armies[0].manpower = 42_000;
    actor.military.armies[0].quality = 0.7;
    player.military.armies[0].manpower = 16_000;
    player.military.armies[0].quality = 0.45;

    const decisions = service.decide(state, actor.id);

    expect(decisions.some((decision) => decision.actionType === "declarar_guerra")).toBe(true);
  });

  it("proposes peace when exhaustion is high during war", () => {
    const state = createInitialState(undefined, undefined, WORLD_DEFINITIONS_V1);
    const service = new RuleBasedNpcDecisionService();

    const actor = getNpcActor(state);
    const player = state.kingdoms.k_player;

    actor.diplomacy.warExhaustion = 0.84;
    actor.stability = 34;
    player.military.armies[0].manpower = 32_000;
    player.military.armies[0].quality = 0.82;
    state.wars.war_live = {
      id: "war_live",
      attackers: [actor.id],
      defenders: [player.id],
      casualties: {},
      warScore: -8,
      startedAt: state.meta.lastUpdatedAt,
      fronts: [
        {
          regionId: player.capitalRegionId,
          pressureAttackers: 50,
          pressureDefenders: 50
        }
      ]
    };

    const decisions = service.decide(state, actor.id);

    expect(decisions.some((decision) => decision.actionType === "proposta_paz")).toBe(true);
  });
});

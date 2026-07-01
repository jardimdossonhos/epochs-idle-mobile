import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { ArmyPosture } from "../src/core/models/enums";
import type { TickContext } from "../src/core/simulation/tick-pipeline";
import { createAutomationSystem } from "../src/core/simulation/systems/automation-system";

function createContext(): TickContext {
  const staticData = createStaticWorldData();
  const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);

  return {
    previousState: state,
    nextState: structuredClone(state),
    staticData,
    deltaMs: state.meta.tickDurationMs,
    tickScale: 1,
    now: state.meta.lastUpdatedAt,
    events: []
  };
}

describe("automation system", () => {
  it("raises economy budget when key reserves are low", () => {
    const context = createContext();
    const player = context.nextState.kingdoms.k_player;

    const previousEconomyBudget = player.economy.budgetPriority.economy;
    player.economy.stock.food = 10;
    player.economy.stock.gold = 20;

    createAutomationSystem(WORLD_DEFINITIONS_V1).run(context);

    expect(player.economy.budgetPriority.economy).toBeGreaterThan(previousEconomyBudget);
  });

  it("switches to defensive posture when kingdom is at war", () => {
    const context = createContext();
    const player = context.nextState.kingdoms.k_player;
    const rival = Object.values(context.nextState.kingdoms).find(
      (kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature"
    );

    if (!rival) {
      throw new Error("Expected at least one NPC kingdom in the initial state.");
    }

    context.nextState.wars.war_test = {
      id: "war_test",
      attackers: [rival.id],
      defenders: [player.id],
      warScore: 0,
      casualties: {},
      startedAt: context.now,
      fronts: [
        {
          regionId: player.capitalRegionId,
          pressureAttackers: 50,
          pressureDefenders: 50
        }
      ]
    };

    createAutomationSystem(WORLD_DEFINITIONS_V1).run(context);

    expect(player.military.posture).toBe(ArmyPosture.Defensive);
    expect(player.military.recruitmentPriority).toBeGreaterThanOrEqual(0.55);
  });
});

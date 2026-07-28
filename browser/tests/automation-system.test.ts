import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { ArmyPosture, AutomationLevel } from "../src/core/models/enums";
import type { TickContext } from "../src/core/simulation/tick-pipeline";
import { createAutomationSystem } from "../src/core/simulation/systems/automation-system";
import { GameSession } from "../src/application/game-session";

class InMemoryGameStateRepository {
  private state: any = null;
  async loadCurrent() { return this.state ? structuredClone(this.state) : null; }
  async saveCurrent(state: any) { this.state = structuredClone(state); }
  async clearCurrent() { this.state = null; }
  saveCurrentSync(state: any) { this.state = structuredClone(state); }
  loadCurrentSync() { return this.state ? structuredClone(this.state) : null; }
  clearCurrentSync() { this.state = null; }
}

class InMemorySaveRepository {
  async saveToSlot() {}
  async loadFromSlot() { return null; }
  async listSlots() { return []; }
  async deleteSlot() {}
}

class NoopCommandLogRepository {
  async append() {}
  async latest() { return null; }
  async listAfter() { return []; }
  async clear() {}
}

class NoopSnapshotRepository {
  async save() {}
  async latest() { return null; }
  async load() { return null; }
  async list() { return []; }
  async delete() {}
}

class InMemoryEventBus {
  private readonly listeners = new Map<string, Array<(event: any) => void>>();
  publish(event: any): void {
    const specific = this.listeners.get(event.type) ?? [];
    const wildcard = this.listeners.get("*") ?? [];
    for (const listener of [...specific, ...wildcard]) {
      listener(event);
    }
  }
  subscribe(eventType: string, listener: (event: any) => void): () => void {
    const list = this.listeners.get(eventType) ?? [];
    list.push(listener);
    this.listeners.set(eventType, list);
    return () => {
      const current = this.listeners.get(eventType) ?? [];
      const index = current.indexOf(listener);
      if (index >= 0) {
        current.splice(index, 1);
      }
      this.listeners.set(eventType, current);
    };
  }
}

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

  it("enables and executes automated missionary campaigns", () => {
    const context = createContext();
    const player = context.nextState.kingdoms.k_player;

    // Enable directive
    player.administration.directives = {
      religious_mission: true
    };

    // Find a border kingdom
    const rival = Object.values(context.nextState.kingdoms).find(
      (k) => !k.isPlayer && k.id !== "k_nature"
    );
    if (!rival) throw new Error("No rival found");

    // Establish a border between player and rival
    const playerRegionId = player.capitalRegionId;
    const rivalRegionId = rival.capitalRegionId;

    context.nextState.world.regions[playerRegionId].ownerId = player.id;
    context.nextState.world.regions[rivalRegionId].ownerId = rival.id;

    // Copy reference to invalidate owned regions cache
    context.nextState.world.regions = { ...context.nextState.world.regions };

    // Make them neighbors in definitions
    const staticData = context.staticData;
    staticData.definitions[playerRegionId].neighbors = [rivalRegionId];
    staticData.definitions[rivalRegionId].neighbors = [playerRegionId];

    // Ensure relations exist
    player.diplomacy.relations[rival.id] = {
      targetKingdomId: rival.id,
      grievance: 0,
      score: { trust: 0.5, fear: 0.2, rivalry: 0.1, borderTension: 0.1 },
      actionCooldowns: {}
    };
    rival.diplomacy.relations[player.id] = {
      targetKingdomId: player.id,
      grievance: 0,
      score: { trust: 0.5, fear: 0.2, rivalry: 0.1, borderTension: 0.1 },
      actionCooldowns: {}
    };

    player.religion.authority = 0.5;
    player.religion.missionaryBudget = 0.2;
    rival.religion.authority = 0.5;
    rival.religion.tolerance = 0.5;
    rival.religion.externalInfluenceIn = {};

    // Set enough resources in both ecs and stock
    const capitalIndex = WORLD_DEFINITIONS_V1.findIndex(d => d.id === player.capitalRegionId);
    if (capitalIndex === -1) throw new Error("Capital index not found");

    if (context.nextState.ecs) {
      context.nextState.ecs.gold = new Float64Array(WORLD_DEFINITIONS_V1.length);
      context.nextState.ecs.faith = new Float64Array(WORLD_DEFINITIONS_V1.length);
      context.nextState.ecs.legitimacy = new Float64Array(WORLD_DEFINITIONS_V1.length);
      context.nextState.ecs.gold[capitalIndex] = 100;
      context.nextState.ecs.faith[capitalIndex] = 100;
      context.nextState.ecs.legitimacy[capitalIndex] = 10;
    }

    player.economy.stock.gold = 100;
    player.economy.stock.faith = 100;
    player.economy.stock.legitimacy = 10;

    // Mock Math.random to always succeed (returns 0.0)
    const originalRandom = Math.random;
    Math.random = () => 0.0;

    try {
      createAutomationSystem(WORLD_DEFINITIONS_V1).run(context);

      // Should deduct costs: Gold 18, Faith 26, Legitimacy 2
      expect(player.economy.stock.gold).toBe(82);
      expect(player.economy.stock.faith).toBe(74);
      expect(player.economy.stock.legitimacy).toBe(8);

      if (context.nextState.ecs) {
        expect(context.nextState.ecs.gold[capitalIndex]).toBe(82);
        expect(context.nextState.ecs.faith[capitalIndex]).toBe(74);
        expect(context.nextState.ecs.legitimacy[capitalIndex]).toBe(8);
      }

      // Cooldown should be set
      expect(player.diplomacy.relations[rival.id].actionCooldowns?.["religion:send_missionaries"]).toBeGreaterThan(context.now);

      // Event should be pushed
      const missionStartedEvent = context.events.find(e => e.type === "religion.mission_started");
      expect(missionStartedEvent).toBeDefined();
    } finally {
      Math.random = originalRandom;
    }
  });

  it("deducts stability on automated missionary campaign failure", () => {
    const context = createContext();
    const player = context.nextState.kingdoms.k_player;

    player.administration.directives = {
      religious_mission: true
    };

    const rival = Object.values(context.nextState.kingdoms).find(
      (k) => !k.isPlayer && k.id !== "k_nature"
    );
    if (!rival) throw new Error("No rival found");

    const playerRegionId = player.capitalRegionId;
    const rivalRegionId = rival.capitalRegionId;

    context.nextState.world.regions[playerRegionId].ownerId = player.id;
    context.nextState.world.regions[rivalRegionId].ownerId = rival.id;

    context.nextState.world.regions = { ...context.nextState.world.regions };

    const staticData = context.staticData;
    staticData.definitions[playerRegionId].neighbors = [rivalRegionId];
    staticData.definitions[rivalRegionId].neighbors = [playerRegionId];

    player.diplomacy.relations[rival.id] = {
      targetKingdomId: rival.id,
      grievance: 0,
      score: { trust: 0.5, fear: 0.2, rivalry: 0.1, borderTension: 0.1 },
      actionCooldowns: {}
    };

    player.religion.authority = 0.5;
    player.religion.missionaryBudget = 0.2;
    rival.religion.authority = 0.5;
    rival.religion.tolerance = 0.5;
    rival.religion.externalInfluenceIn = {};

    const capitalIndex = WORLD_DEFINITIONS_V1.findIndex(d => d.id === player.capitalRegionId);
    if (context.nextState.ecs) {
      context.nextState.ecs.gold = new Float64Array(WORLD_DEFINITIONS_V1.length);
      context.nextState.ecs.faith = new Float64Array(WORLD_DEFINITIONS_V1.length);
      context.nextState.ecs.legitimacy = new Float64Array(WORLD_DEFINITIONS_V1.length);
      context.nextState.ecs.gold[capitalIndex] = 100;
      context.nextState.ecs.faith[capitalIndex] = 100;
      context.nextState.ecs.legitimacy[capitalIndex] = 10;
    }

    player.economy.stock.gold = 100;
    player.economy.stock.faith = 100;
    player.economy.stock.legitimacy = 10;

    const initialStability = player.stability;

    // Mock Math.random to always fail (returns 0.99)
    const originalRandom = Math.random;
    Math.random = () => 0.99;

    try {
      createAutomationSystem(WORLD_DEFINITIONS_V1).run(context);

      // Should still deduct costs
      expect(player.economy.stock.gold).toBe(82);

      // Cooldown should be set
      expect(player.diplomacy.relations[rival.id].actionCooldowns?.["religion:send_missionaries"]).toBeGreaterThan(context.now);

      // Stability should decrease by 0.25
      expect(player.stability).toBe(initialStability - 0.25);

      // Event should NOT be pushed
      const missionStartedEvent = context.events.find(e => e.type === "religion.mission_started");
      expect(missionStartedEvent).toBeUndefined();
    } finally {
      Math.random = originalRandom;
    }
  });

  it("verifies GameSession automation setters and directives toggling", async () => {
    const staticData = createStaticWorldData();
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);

    const mockRepo = new InMemoryGameStateRepository() as any;
    const mockSaveRepo = new InMemorySaveRepository() as any;
    const mockCmdRepo = new NoopCommandLogRepository() as any;
    const mockSnapRepo = new NoopSnapshotRepository() as any;
    const mockClock = { now: () => Date.now(), onTick: () => {} } as any;
    const mockEventBus = new InMemoryEventBus() as any;

    const session = new GameSession({
      gameStateRepository: mockRepo,
      saveRepository: mockSaveRepo,
      commandLogRepository: mockCmdRepo,
      snapshotRepository: mockSnapRepo,
      staticWorldData: staticData,
      clock: mockClock,
      eventBus: mockEventBus,
      systems: [],
      diplomacyResolver: {} as any,
      warResolver: {} as any
    });

    await session.bootstrap(state);

    session.setEconomyAutomation(AutomationLevel.NearlyAutomatic);
    const player = state.kingdoms.k_player;
    expect(player.administration.automation.economy).toBe(AutomationLevel.NearlyAutomatic);
    expect(player.administration.automation.construction).toBe(AutomationLevel.NearlyAutomatic);

    session.setDefenseAutomation(AutomationLevel.Assisted);
    expect(player.administration.automation.defense).toBe(AutomationLevel.Assisted);
    expect(player.administration.automation.expansion).toBe(AutomationLevel.Assisted);

    session.toggleGlobalAutomation(true);
    expect(player.administration.directives?.religious_mission).toBe(true);

    session.toggleGlobalAutomation(false);
    expect(player.administration.directives?.religious_mission).toBe(false);
  });
});

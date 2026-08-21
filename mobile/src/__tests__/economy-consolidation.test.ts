import { GameState } from "../core/models/game-state";
import { createInitialState } from "../application/boot/create-initial-state";
import { EconomySystem } from "../core/simulation/systems/economy-system";
import { TickPipeline } from "../core/simulation/tick-pipeline";
import { getFactionGold, creditGold, debitGold, tryDebitGold } from "../core/ecs/economy-api";
import { ResourceType } from "../core/models/enums";

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe("Phase 2 - Economy Consolidation", () => {
  let staticData: any;
  let state: GameState;
  
  beforeEach(() => {
    const TOTAL_HEXES = 320000;
    const biomes = new Array(TOTAL_HEXES).fill(0);
    for (let i = 0; i < 3000; i++) biomes[i] = 1;
    staticData = {
      definitions: {}, biomes, mapWidth: 800, mapHeight: 400, religions: {}
    };
    for (let i = 0; i < TOTAL_HEXES; i++) {
      staticData.definitions[`r_hex_${i}`] = { id: `r_hex_${i}`, basePopulationCapacity: 100, economyValue: 1, militaryValue: 1, developmentLevel: 1 };
    }
    state = createInitialState(staticData, Date.now());
  });

  test("A - Economia Inicial (Bando Nomade)", () => {
    // gold inicial = valor definido pelo design (100)
    expect(getFactionGold(state, "k_player")).toBe(100);
    
    // Simula 1 tick para ver calcular income/upkeep
    const economySystem = require("../core/simulation/systems/economy-system").createEconomySystem();
    const context = {
      previousState: state,
      nextState: state,
      staticData,
      deltaMs: 1000,
      tickScale: 1,
      now: Date.now(),
      events: []
    };
    
    economySystem.run(context);
    
    const kingdom = state.kingdoms["k_player"];
    const income = kingdom.economy.incomePerTick[ResourceType.Gold];
    const upkeep = kingdom.economy.upkeepPerTick[ResourceType.Gold];
    const netIncome = kingdom.economy.netIncomePerTick[ResourceType.Gold];
    
    expect(upkeep).toBeLessThan(1.0); // O upkeep inicial deve ser bem baixo agora que usedCapacity = 5
    expect(netIncome).toBe(income - upkeep);
  });

  test("B - Um tick", () => {
    const goldBefore = getFactionGold(state, "k_player");
    
    const economySystem = require("../core/simulation/systems/economy-system").createEconomySystem();
    economySystem.run({
      previousState: state,
      nextState: state,
      staticData,
      deltaMs: 1000,
      tickScale: 1,
      now: Date.now(),
      events: []
    });
    
    const goldAfter = getFactionGold(state, "k_player");
    const netIncome = state.kingdoms["k_player"].economy.netIncomePerTick[ResourceType.Gold];
    
    expect(goldAfter - goldBefore).toBeCloseTo(netIncome, 2);
  });

  test("C - Compra (tryDebitGold)", () => {
    const goldBefore = getFactionGold(state, "k_player");
    
    // Deduct 50 gold
    const success = tryDebitGold(state, "k_player", 50, "test_buy");
    expect(success).toBe(true);
    
    const goldAfter = getFactionGold(state, "k_player");
    expect(goldBefore - goldAfter).toBe(50);
    
    // Insufficient funds
    const fail = tryDebitGold(state, "k_player", 1000, "test_buy_fail");
    expect(fail).toBe(false);
    expect(getFactionGold(state, "k_player")).toBe(goldAfter);
  });

  test("D, E, F - API transacional unica garante que todos funcionam sobre o mesmo saldo", () => {
    creditGold(state, "k_player", 20, "diplomacy_fund");
    expect(getFactionGold(state, "k_player")).toBe(120);
    
    debitGold(state, "k_player", 30, "war_pressure");
    expect(getFactionGold(state, "k_player")).toBe(90);
    
    tryDebitGold(state, "k_player", 40, "automation_build");
    expect(getFactionGold(state, "k_player")).toBe(50);
  });

  test("G - Double-dipping is removed", () => {
    const goldBefore = getFactionGold(state, "k_player");
    
    const pipeline = new TickPipeline(
      [require("../core/simulation/systems/economy-system").createEconomySystem()], 
      staticData
    );
    
    const result = pipeline.run(state, 1000, Date.now());
    
    const netIncome = result.state.kingdoms["k_player"].economy.netIncomePerTick[ResourceType.Gold];
    const goldAfter = getFactionGold(result.state, "k_player");
    
    expect(goldAfter - goldBefore).toBeCloseTo(netIncome, 2);
  });
});
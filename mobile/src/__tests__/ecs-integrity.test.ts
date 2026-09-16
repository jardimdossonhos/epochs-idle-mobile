jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { createVirginEcs, assertEcsRuntimeIntegrity } from "../infrastructure/persistence/ecs-factory";
import { createInitialState } from "../application/boot/create-initial-state";
import { createStaticWorldData } from "../application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from "../application/boot/generated/world-definitions-v1";
import { GameSession } from "../application/game-session";

describe("ECS Runtime Integrity P0 Fix", () => {
  const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
  const mockClock = { now: () => 1000, start: jest.fn(), advance: jest.fn() };

  it("A) createInitialState -> assertEcsRuntimeIntegrity PASS", () => {
    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    expect(assertEcsRuntimeIntegrity(initialState.ecs)).toBe(true);
  });

  it("B) resetToNewGame(initialState) preserva integridade (Sem structuredClone)", async () => {
    const session = new GameSession({
      gameStateRepository: {
        loadCurrent: jest.fn().mockResolvedValue(null),
        saveCurrent: jest.fn().mockResolvedValue(undefined),
      } as any,
      saveRepository: { saveToSlot: jest.fn(), listSlots: jest.fn() } as any,
      commandLogRepository: { latest: jest.fn() } as any,
      eventBus: { subscribe: jest.fn(), publish: jest.fn() } as any,
      clock: mockClock as any,
    });
    
    // Stub methods to avoid crashing
    (session as any).stop = jest.fn();
    (session as any).clearCurrentState = jest.fn();
    (session as any).emitState = jest.fn();

    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    
    await session.resetToNewGame(initialState);
    
    expect(assertEcsRuntimeIntegrity(session.currentState!.ecs)).toBe(true);
  });

  it("C) bootstrap/load (mockado) -> assertEcsRuntimeIntegrity PASS", async () => {
    const hydratedState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    
    const session = new GameSession({
      gameStateRepository: {
        loadCurrent: jest.fn().mockResolvedValue(hydratedState),
        saveCurrent: jest.fn().mockResolvedValue(undefined),
      } as any,
      saveRepository: { saveToSlot: jest.fn(), listSlots: jest.fn() } as any,
      commandLogRepository: { latest: jest.fn() } as any,
      eventBus: { subscribe: jest.fn(), publish: jest.fn() } as any,
      clock: mockClock as any,
    });
    
    await session.bootstrap();
    expect(assertEcsRuntimeIntegrity(session.currentState!.ecs)).toBe(true);
  });

  it("D/E) Primeiro pumpSimulationQueue() (Tick) mantes TypedArrays em GameSession", async () => {
    const session = new GameSession({
      gameStateRepository: {
        loadCurrent: jest.fn().mockResolvedValue(null),
        saveCurrent: jest.fn().mockResolvedValue(undefined),
      } as any,
      saveRepository: { saveToSlot: jest.fn(), listSlots: jest.fn() } as any,
      commandLogRepository: { latest: jest.fn() } as any,
      eventBus: { subscribe: jest.fn(), publish: jest.fn() } as any,
      clock: mockClock as any,
    });

    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    
    (session as any).stop = jest.fn();
    (session as any).clearCurrentState = jest.fn();
    (session as any).emitState = jest.fn();

    await session.resetToNewGame(initialState);
    
    (session as any).pipeline = {
      runMutating: (state: any) => {
        expect(assertEcsRuntimeIntegrity(state.ecs)).toBe(true);
        state.ecs.factionPopulation.fill(0);
        return { ok: true, events: [], state };
      }
    };
    
    session["accumulatedMs"] = 1000;
    session["pumpSimulationQueue"]();
    
    expect(assertEcsRuntimeIntegrity(session.currentState!.ecs)).toBe(true);
  });
});
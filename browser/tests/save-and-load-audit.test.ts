import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { GameSession, type GameSessionDeps } from "../src/application/game-session";
import type {
  CommandLogRepository,
  GameStateRepository,
  SaveRepository,
  SaveSlotId,
  SaveSnapshot,
  SaveSummary,
  SnapshotRepository
} from "../src/core/contracts/game-ports";
import type { ClockService, EventBus } from "../src/core/contracts/services";
import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../src/core/models/commands";
import type { DomainEvent } from "../src/core/models/events";
import type { GameState } from "../src/core/models/game-state";
import { AUTOSAVE_SLOT_ID, MANUAL_SLOT_ID } from "../src/infrastructure/persistence/save-slots";

// Helper classes from game-session-player-actions.test.ts to isolate tests
class InMemoryGameStateRepository implements GameStateRepository {
  private readonly persistenceKey = "current";

  constructor(private readonly store = new Map<string, GameState>()) {}

  async loadCurrent(): Promise<GameState | null> {
    const fromStore = this.store.get(this.persistenceKey);
    return fromStore ? structuredClone(fromStore) : null;
  }

  async saveCurrent(state: GameState): Promise<void> {
    this.store.set(this.persistenceKey, structuredClone(state));
  }

  async clearCurrent(): Promise<void> {
    this.store.delete(this.persistenceKey);
  }

  loadCurrentSync(): GameState | null {
    const fromStore = this.store.get(this.persistenceKey);
    return fromStore ? structuredClone(fromStore) : null;
  }

  saveCurrentSync(state: GameState): void {
    this.store.set(this.persistenceKey, structuredClone(state));
  }

  clearCurrentSync(): void {
    this.store.delete(this.persistenceKey);
  }
}

class InMemorySaveRepository implements SaveRepository {
  constructor(private readonly slots = new Map<SaveSlotId, SaveSnapshot>()) {}

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    this.slots.set(snapshot.summary.slotId, structuredClone(snapshot));
  }

  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    const snapshot = this.slots.get(slotId);
    return snapshot ? structuredClone(snapshot) : null;
  }

  async listSlots(): Promise<SaveSummary[]> {
    return Array.from(this.slots.values())
      .map((item) => structuredClone(item.summary))
      .sort((left, right) => right.savedAt - left.savedAt);
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    this.slots.delete(slotId);
  }

  async clearAll(): Promise<void> {
    this.slots.clear();
  }
}

class NoopCommandLogRepository implements CommandLogRepository {
  async append(_entries: CommandLogEntry[]): Promise<void> {}
  async latest(): Promise<CommandLogEntry | null> { return null; }
  async listAfter(_sequence: number, _limit?: number): Promise<CommandLogEntry[]> { return []; }
  async clear(): Promise<void> {}
}

class NoopSnapshotRepository implements SnapshotRepository {
  async save(_snapshot: StateSnapshot): Promise<void> {}
  async latest(): Promise<StateSnapshot | null> { return null; }
  async load(_snapshotId: string): Promise<StateSnapshot | null> { return null; }
  async list(_limit?: number): Promise<SnapshotSummary[]> { return []; }
  async delete(_snapshotId: string): Promise<void> {}
}

class ManualClock implements ClockService {
  private tickCallbacks: Array<(deltaMs: number, now: number) => void> = [];
  constructor(private nowValue: number) {}

  now(): number {
    return this.nowValue;
  }

  start(onTick: (deltaMs: number, now: number) => void): void {
    this.tickCallbacks.push(onTick);
  }

  stop(): void {
    this.tickCallbacks = [];
  }

  advance(ms: number): void {
    this.nowValue += ms;
    for (const cb of this.tickCallbacks) {
      cb(ms, this.nowValue);
    }
  }
}

class InMemoryEventBus implements EventBus {
  private listeners = new Map<string, Array<(event: any) => void>>();

  publish(eventOrType: string | DomainEvent, payload?: any): void {
    const type = typeof eventOrType === "string" ? eventOrType : (eventOrType as DomainEvent).type;
    const data = typeof eventOrType === "string" ? payload : eventOrType;
    const cbs = this.listeners.get(type) || [];
    for (const cb of cbs) {
      cb(data);
    }
  }

  subscribe(eventType: string, listener: (event: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
    return () => {
      const arr = this.listeners.get(eventType)!;
      this.listeners.set(eventType, arr.filter(cb => cb !== listener));
    };
  }
}

const staticData = createStaticWorldData();

function createTestSession(deps: Partial<GameSessionDeps>): GameSession {
  const eventBus = deps.eventBus ?? new InMemoryEventBus();

  const mockTickFn = (state: any) => {
    if (state && state.meta) {
      state.meta.tick += 1;
    }
    return state;
  };

  const session = new GameSession({
    gameStateRepository: deps.gameStateRepository ?? new InMemoryGameStateRepository(),
    saveRepository: deps.saveRepository ?? new InMemorySaveRepository(),
    staticWorldData: staticData,
    commandLogRepository: deps.commandLogRepository ?? new NoopCommandLogRepository(),
    snapshotRepository: deps.snapshotRepository ?? new NoopSnapshotRepository(),
    clock: deps.clock ?? new ManualClock(Date.now()),
    eventBus: eventBus,
    systems: deps.systems ?? [{
      id: "mock_tick_system",
      run: mockTickFn,
      update: mockTickFn,
      execute: mockTickFn,
      process: mockTickFn,
      tick: mockTickFn
    } as any],
    autosaveEveryTicks: 2, // Frequent autosave for testing
    ...deps
  });

  eventBus.subscribe("game.loaded", (event) => {
    // Simula a chegada do primeiro TICK do WebWorker que auto-destrava a engine
    session.updateEcsState(event?.payload?.ecs ?? ({} as any));
  });

  return session;
}

describe("Save, Load and State Restoration Audit", () => {

  // Aumentamos o limite de tempo (15s) pois o structuredClone do mapa mundial é custoso para a CPU no Node.js
  it("should restore from autosave after a simulated refresh", async () => {
    // 1. Setup initial session
    const gameStateRepo = new InMemoryGameStateRepository();
    const saveRepo = new InMemorySaveRepository();
    const clock = new ManualClock(Date.now());
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    initial.meta.paused = false;
    initial.meta.lastUpdatedAt = clock.now();
    initial.meta.speedMultiplier = 1;
    initial.meta.tickDurationMs = 1000;
    
    const session1 = createTestSession({ gameStateRepository: gameStateRepo, saveRepository: saveRepo, clock });
    await session1.bootstrap(initial);
    session1.setPaused(false);
    session1.setSpeed(1);

    // 2. Advance state and trigger an autosave
    const playerKingdom1 = Object.values(session1.getState().kingdoms).find((k: any) => k.isPlayer) as any;
    playerKingdom1.stability = 50; // Change a value to check later
    
    session1.start(); // Register the onClockTick callback
    
    clock.advance(1000); // Tick 1
    
    clock.advance(1000); // Tick 2 -> should trigger autosave (autosaveEveryTicks: 2)
    
    // Dispara o TICK do Worker para consumir o pendingAutosave no momento exato
    session1.updateEcsState(session1.getState().ecs);

    await session1.flushPersistence(); // Ensure async save operations complete

    const tick2State = session1.getState();
    expect(tick2State.meta.tick).toBe(2);
    expect((Object.values(tick2State.kingdoms).find((k: any) => k.isPlayer) as any).stability).toBe(50);

    // 3. Simulate a refresh: create a new session with the same repositories
    const clock2 = new ManualClock(clock.now() + 100); // slightly later
    const session2 = createTestSession({ gameStateRepository: gameStateRepo, saveRepository: saveRepo, clock: clock2 });
    const initial2 = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    initial2.meta.paused = false;
    initial2.meta.lastUpdatedAt = clock2.now();
    initial2.meta.speedMultiplier = 1;
    initial2.meta.tickDurationMs = 1000;

    // 4. Bootstrap the new session and verify state restoration
    await session2.bootstrap(initial2);
    const restoredState = session2.getState();
    
    // It should have loaded the autosaved state
    expect(restoredState.meta.tick).toBe(2);
    const playerKingdom2 = Object.values(restoredState.kingdoms).find((k: any) => k.isPlayer) as any;
    expect(playerKingdom2.stability).toBe(50);
  });

  // Aumentamos o limite de tempo (15s) pois o structuredClone do mapa mundial é custoso para a CPU no Node.js
  it("should correctly load a manual save slot", async () => {
    // 1. Setup initial session
    const gameStateRepo = new InMemoryGameStateRepository();
    const saveRepo = new InMemorySaveRepository();
    const clock = new ManualClock(Date.now());
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    initial.meta.paused = false;
    initial.meta.lastUpdatedAt = clock.now();
    initial.meta.speedMultiplier = 1;
    initial.meta.tickDurationMs = 1000;
    
    const session = createTestSession({ gameStateRepository: gameStateRepo, saveRepository: saveRepo, clock });
    await session.bootstrap(initial);

    // 2. Change state and save manually
    session.updateTaxPolicy({ baseRate: 0.25 });
    const savePromise = session.saveManual();
    
    // O Save só se concretiza na chegada natural do próximo frame de dados (Sincronização Passiva)
    session.updateEcsState(session.getState().ecs);
    await savePromise;
    
    await session.flushPersistence();

    const savedPlayerKingdom = Object.values(session.getState().kingdoms).find((k: any) => k.isPlayer) as any;
    expect(savedPlayerKingdom.economy.taxPolicy.baseRate).toBe(0.25);
    
    // 3. Reset state to something different
    session.updateTaxPolicy({ baseRate: 0.5 });
    const modifiedPlayerKingdom = Object.values(session.getState().kingdoms).find((k: any) => k.isPlayer) as any;
    expect(modifiedPlayerKingdom.economy.taxPolicy.baseRate).toBe(0.5);

    // 4. Load the manual save and verify
    await session.loadSlot(MANUAL_SLOT_ID);
    const loadedState = session.getState();
    const loadedPlayerKingdom = Object.values(loadedState.kingdoms).find((k: any) => k.isPlayer) as any;
    
    expect(loadedPlayerKingdom.economy.taxPolicy.baseRate).toBe(0.25);
  });

  it("should prioritize a more recent 'current' state over an older autosave on refresh", async () => {
    // 1. Setup repos and clock
    const gameStateRepo = new InMemoryGameStateRepository(new Map());
    const saveRepo = new InMemorySaveRepository(new Map());
    const clock = new ManualClock(Date.now());

    // 2. Create an older autosave
    const autosaveState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    autosaveState.meta.tick = 5;
    autosaveState.meta.lastUpdatedAt = clock.now();
    const autosaveSnapshot = { state: autosaveState, summary: { slotId: AUTOSAVE_SLOT_ID, savedAt: clock.now() } as SaveSummary };
    await saveRepo.saveToSlot(autosaveSnapshot as SaveSnapshot);
    
    // 3. Create a more recent "current" state (e.g. from a session.stop() call)
    clock.advance(10000); // 10 seconds later
    const currentState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    currentState.meta.tick = 10;
    currentState.meta.lastUpdatedAt = clock.now();
    await gameStateRepo.saveCurrent(currentState);

    // 4. Bootstrap a new session
    const session = createTestSession({ gameStateRepository: gameStateRepo, saveRepository: saveRepo, clock });
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    initial.meta.lastUpdatedAt = clock.now();
    await session.bootstrap(initial);

    // 5. Verify it loaded the most recent state (the "current" one)
    const finalState = session.getState();
    expect(finalState.meta.tick).toBe(10);
  });
});

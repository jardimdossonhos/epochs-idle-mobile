import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { GameSession } from "../src/application/game-session";
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

class InMemoryGameStateRepository implements GameStateRepository {
  private state: GameState | null = null;

  async loadCurrent(): Promise<GameState | null> {
    return this.state ? structuredClone(this.state) : null;
  }

  async saveCurrent(state: GameState): Promise<void> {
    this.state = structuredClone(state);
  }

  async clearCurrent(): Promise<void> {
    this.state = null;
  }

  saveCurrentSync(state: GameState): void {
    this.state = structuredClone(state);
  }

  loadCurrentSync(): GameState | null {
    return this.state ? structuredClone(this.state) : null;
  }

  clearCurrentSync(): void {
    this.state = null;
  }
}

class InMemorySaveRepository implements SaveRepository {
  async saveToSlot(_snapshot: SaveSnapshot): Promise<void> {}
  async loadFromSlot(_slotId: SaveSlotId): Promise<SaveSnapshot | null> { return null; }
  async listSlots(): Promise<SaveSummary[]> { return []; }
  async deleteSlot(_slotId: SaveSlotId): Promise<void> {}
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
  constructor(private nowValue: number) {}

  now(): number {
    return this.nowValue;
  }

  start(_onTick: (deltaMs: number, now: number) => void): void {}

  stop(): void {}
}

class InMemoryEventBus implements EventBus {
  private listeners = new Map<string, Array<(event: DomainEvent) => void>>();

  publish(event: DomainEvent): void {
    const listeners = this.listeners.get(event.type) ?? [];
    for (const listener of listeners) {
      listener(event);
    }
  }

  subscribe(eventType: string, listener: (event: DomainEvent) => void): () => void {
    const current = this.listeners.get(eventType) ?? [];
    current.push(listener);
    this.listeners.set(eventType, current);

    return () => {
      const next = (this.listeners.get(eventType) ?? []).filter((item) => item !== listener);
      this.listeners.set(eventType, next);
    };
  }
}

describe("GameSession.advanceTimeForTesting", () => {
  it("advances simulation while keeping the session paused", async () => {
    const staticData = createStaticWorldData();
    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const clock = new ManualClock(initialState.meta.createdAt);
    const eventBus = new InMemoryEventBus();
    const session = new GameSession({
      gameStateRepository: new InMemoryGameStateRepository(),
      saveRepository: new InMemorySaveRepository(),
      staticWorldData: staticData,
      clock,
      eventBus,
      commandLogRepository: new NoopCommandLogRepository(),
      snapshotRepository: new NoopSnapshotRepository(),
      systems: []
    });

    eventBus.subscribe("game.loaded", (event) => {
      session.updateEcsState((event as any).payload?.ecs ?? initialState.ecs);
    });

    const bootstrapped = await session.bootstrap(initialState);
    expect(bootstrapped.meta.paused).toBe(true);
    expect(session.getState().meta.tick).toBe(0);

    session.advanceTimeForTesting(initialState.meta.tickDurationMs, initialState.meta.createdAt + initialState.meta.tickDurationMs);

    const advanced = session.getState();
    expect(advanced.meta.paused).toBe(true);
    expect(advanced.meta.tick).toBe(1);
    expect(advanced.meta.lastUpdatedAt).toBe(initialState.meta.createdAt + initialState.meta.tickDurationMs);
  });
});

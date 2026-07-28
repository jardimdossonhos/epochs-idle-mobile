﻿﻿﻿import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
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
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";

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
  private readonly slots = new Map<SaveSlotId, SaveSnapshot>();

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
}

class InMemoryCommandLogRepository implements CommandLogRepository {
  private readonly entries: CommandLogEntry[] = [];

  async append(entries: CommandLogEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.push(structuredClone(entry));
    }

    this.entries.sort((left, right) => left.sequence - right.sequence);
  }

  async latest(): Promise<CommandLogEntry | null> {
    if (this.entries.length === 0) {
      return null;
    }

    return structuredClone(this.entries[this.entries.length - 1]);
  }

  async listAfter(sequence: number, limit = 200): Promise<CommandLogEntry[]> {
    return this.entries
      .filter((entry) => entry.sequence > sequence)
      .slice(0, limit)
      .map((entry) => structuredClone(entry));
  }

  async clear(): Promise<void> {
    this.entries.splice(0, this.entries.length);
  }
}

class InMemorySnapshotRepository implements SnapshotRepository {
  private readonly snapshots = new Map<string, StateSnapshot>();

  async save(snapshot: StateSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, structuredClone(snapshot));
  }

  async latest(): Promise<StateSnapshot | null> {
    const list = await this.list(1);
    if (list.length === 0) {
      return null;
    }

    return this.load(list[0].id);
  }

  async load(snapshotId: string): Promise<StateSnapshot | null> {
    const snapshot = this.snapshots.get(snapshotId);
    return snapshot ? structuredClone(snapshot) : null;
  }

  async list(limit = 20): Promise<SnapshotSummary[]> {
    return Array.from(this.snapshots.values())
      .sort((left, right) => {
        if (right.savedAt !== left.savedAt) {
          return right.savedAt - left.savedAt;
        }

        return right.tick - left.tick;
      })
      .slice(0, limit)
      .map((snapshot) => ({
        id: snapshot.id,
        tick: snapshot.tick,
        savedAt: snapshot.savedAt,
        reason: snapshot.reason,
        commandSequence: snapshot.commandSequence,
        commandHash: snapshot.commandHash,
        stateHash: snapshot.stateHash
      }));
  }

  async delete(snapshotId: string): Promise<void> {
    this.snapshots.delete(snapshotId);
  }
}

class FakeClock implements ClockService {
  private onTick: ((deltaMs: number, now: number) => void) | null = null;

  constructor(private currentNow: number) {}

  now(): number {
    return this.currentNow;
  }

  start(onTick: (deltaMs: number, now: number) => void): void {
    this.onTick = onTick;
  }

  stop(): void {
    this.onTick = null;
  }

  advance(deltaMs: number): void {
    this.currentNow += deltaMs;
    this.onTick?.(deltaMs, this.currentNow);
  }
}

class InMemoryEventBus implements EventBus {
  private readonly listeners = new Map<string, Array<(event: DomainEvent) => void>>();

  publish(event: DomainEvent): void {
    const specific = this.listeners.get(event.type) ?? [];
    const wildcard = this.listeners.get("*") ?? [];

    for (const listener of [...specific, ...wildcard]) {
      listener(event);
    }
  }

  subscribe(eventType: string, listener: (event: DomainEvent) => void): () => void {
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

describe("GameSession command log and snapshots", () => {
  it("records command chain and periodic snapshots", async () => {
    const staticData = createStaticWorldData();
    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const gameStateRepository = new InMemoryGameStateRepository();
    const saveRepository = new InMemorySaveRepository();
    const commandRepository = new InMemoryCommandLogRepository();
    const snapshotRepository = new InMemorySnapshotRepository();
    const clock = new FakeClock(initialState.meta.createdAt);
    const eventBus = new InMemoryEventBus();

    const session = new GameSession({
      gameStateRepository,
      saveRepository,
      staticWorldData: staticData,
      commandLogRepository: commandRepository,
      snapshotRepository,
      clock,
      eventBus,
      systems: [],
      snapshotEveryTicks: 2,
      maxSnapshots: 10,
      autosaveEveryTicks: 99
    });

    eventBus.subscribe("game.loaded", (event) => {
      session.updateEcsState((event as any).payload?.ecs ?? initialState.ecs);
    });

    await session.bootstrap(initialState);
    session.setPaused(true);
    session.setPaused(false);
    session.setSpeed(2);
    session.start();

    clock.advance(initialState.meta.tickDurationMs);
    clock.advance(initialState.meta.tickDurationMs);
    const savePromise = session.saveManual();
    session.updateEcsState(session.getState().ecs);
    await savePromise;

    session.stop();
    await session.flushPersistence();

    const commands = await commandRepository.listAfter(0, 200);

    expect(commands.length).toBeGreaterThan(0);
    expect(commands.some((command) => command.commandType === "session.pause")).toBe(true);
    expect(commands.some((command) => command.commandType === "session.speed")).toBe(true);
    expect(commands.some((command) => command.commandType === "tick.processed")).toBe(true);

    for (let index = 1; index < commands.length; index += 1) {
      expect(commands[index].previousHash).toBe(commands[index - 1].hash);
    }

    const snapshots = await snapshotRepository.list(50);

    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots.some((snapshot) => snapshot.reason === "manual")).toBe(true);
    expect(snapshots[0].commandSequence).toBeGreaterThan(0);
    expect(typeof snapshots[0].stateHash).toBe("string");
  });
});

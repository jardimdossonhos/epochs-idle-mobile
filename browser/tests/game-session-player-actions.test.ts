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

class NoopCommandLogRepository implements CommandLogRepository {
  async append(_entries: CommandLogEntry[]): Promise<void> {
    return;
  }

  async latest(): Promise<CommandLogEntry | null> {
    return null;
  }

  async listAfter(_sequence: number, _limit?: number): Promise<CommandLogEntry[]> {
    return [];
  }

  async clear(): Promise<void> {
    return;
  }
}

class NoopSnapshotRepository implements SnapshotRepository {
  async save(_snapshot: StateSnapshot): Promise<void> {
    return;
  }

  async latest(): Promise<StateSnapshot | null> {
    return null;
  }

  async load(_snapshotId: string): Promise<StateSnapshot | null> {
    return null;
  }

  async list(_limit?: number): Promise<SnapshotSummary[]> {
    return [];
  }

  async delete(_snapshotId: string): Promise<void> {
    return;
  }
}

class FakeClock implements ClockService {
  constructor(private nowValue: number) {}

  now(): number {
    return this.nowValue;
  }

  start(_onTick: (deltaMs: number, now: number) => void): void {
    return;
  }

  stop(): void {
    return;
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

function getPlayerOwnedRegionId(state: GameState): string {
  const player = state.kingdoms.k_player;
  const region = Object.values(state.world.regions).find((item) => item.ownerId === player.id);

  if (!region) {
    throw new Error("Expected at least one region owned by the player.");
  }

  return region.regionId;
}

function getNpcTargetId(state: GameState): string {
  const rival = Object.values(state.kingdoms).find((kingdom) => !kingdom.isPlayer && kingdom.id !== "k_nature");

  if (!rival) {
    throw new Error("Expected at least one NPC kingdom in the initial state.");
  }

  return rival.id;
}

function seedPlayerResources(state: GameState): void {
  if (!state.ecs) {
    throw new Error("Expected ECS state to be initialized.");
  }

  for (let index = 0; index < WORLD_DEFINITIONS_V1.length; index += 1) {
    const regionId = WORLD_DEFINITIONS_V1[index].id;
    if (state.world.regions[regionId]?.ownerId !== "k_player") {
      continue;
    }

    state.ecs.gold[index] = 250;
    state.ecs.food[index] = 500;
    state.ecs.wood[index] = 250;
    state.ecs.iron[index] = 120;
    state.ecs.faith[index] = 120;
    state.ecs.legitimacy[index] = 60;
  }
}

describe("GameSession player actions", () => {
  it("applies regional action and decreases unrest", async () => {
    const staticData = createStaticWorldData();
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    seedPlayerResources(initial);

    const session = new GameSession({
      gameStateRepository: new InMemoryGameStateRepository(),
      saveRepository: new InMemorySaveRepository(),
      staticWorldData: staticData,
      commandLogRepository: new NoopCommandLogRepository(),
      snapshotRepository: new NoopSnapshotRepository(),
      clock: new FakeClock(initial.meta.createdAt + 1_000),
      eventBus: new InMemoryEventBus(),
      systems: []
    });

    await session.bootstrap(initial);

    const regionId = getPlayerOwnedRegionId(session.getState());
    const before = session.getState().world.regions[regionId].unrest;
    const result = session.executeRegionAction(regionId, "pacify");
    const after = session.getState().world.regions[regionId].unrest;

    expect(result.ok).toBe(true);
    expect(after).toBeLessThan(before);
  });

  it("applies diplomacy cooldown on repeated action", async () => {
    const staticData = createStaticWorldData();
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    seedPlayerResources(initial);

    const session = new GameSession({
      gameStateRepository: new InMemoryGameStateRepository(),
      saveRepository: new InMemorySaveRepository(),
      staticWorldData: staticData,
      commandLogRepository: new NoopCommandLogRepository(),
      snapshotRepository: new NoopSnapshotRepository(),
      clock: new FakeClock(initial.meta.createdAt + 2_000),
      eventBus: new InMemoryEventBus(),
      systems: []
    });

    await session.bootstrap(initial);

    const targetId = getNpcTargetId(session.getState());
    const first = session.executeDiplomaticAction(targetId, "embargo");
    const second = session.executeDiplomaticAction(targetId, "embargo");

    expect(first.cooldownUntil).toBeDefined();
    expect(second.ok).toBe(false);
    expect(second.cooldownUntil).toBeDefined();
  });

  it("lists technology choices and allows targeting available research", async () => {
    const staticData = createStaticWorldData();
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);

    const session = new GameSession({
      gameStateRepository: new InMemoryGameStateRepository(),
      saveRepository: new InMemorySaveRepository(),
      staticWorldData: staticData,
      commandLogRepository: new NoopCommandLogRepository(),
      snapshotRepository: new NoopSnapshotRepository(),
      clock: new FakeClock(initial.meta.createdAt + 3_000),
      eventBus: new InMemoryEventBus(),
      systems: []
    });

    await session.bootstrap(initial);

    const choices = session.listTechnologyChoices();
    const active = choices.find((choice) => choice.id === "bone_tools");
    const available = choices.find((choice) => choice.id === "animism");
    const locked = choices.find((choice) => choice.id === "sedentism");

    expect(active?.status).toBe("active");
    expect(available?.status).toBe("available");
    expect(locked?.status).toBe("locked");

    const success = session.setResearchTarget("animism");
    const failure = session.setResearchTarget("sedentism");

    expect(success.ok).toBe(true);
    expect(session.getState().kingdoms.k_player.technology.activeResearchId).toBe("animism");
    expect(failure.ok).toBe(false);
  });
});

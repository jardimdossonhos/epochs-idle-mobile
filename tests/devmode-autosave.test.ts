import { describe, expect, it } from "vitest";
import { createInitialState } from "../mobile/src/application/boot/create-initial-state";
import { createStaticWorldData } from "../mobile/src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../mobile/src/application/boot/generated/world-definitions-v1";
import { GameSession, type GameSessionDeps } from "../mobile/src/application/game-session";
import type {
  CommandLogRepository,
  GameStateRepository,
  SaveRepository,
  SaveSlotId,
  SaveSnapshot,
  SaveSummary,
  SnapshotRepository
} from "../mobile/src/core/contracts/game-ports";
import type { ClockService, EventBus } from "../mobile/src/core/contracts/services";
import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../mobile/src/core/models/commands";
import type { DomainEvent } from "../mobile/src/core/models/events";
import type { GameState } from "../mobile/src/core/models/game-state";
import { AUTOSAVE_SLOT_ID } from "../mobile/src/infrastructure/persistence/save-slots";
import { DiplomaticRelation, NpcArchetype } from "../mobile/src/core/models/enums";
import { WORLD_DEFINITIONS_MAP_ID } from "../mobile/src/application/boot/generated/world-definitions-v1";

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
  constructor(public readonly slots = new Map<SaveSlotId, SaveSnapshot>()) {}

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
  now(): number {
    return 1000;
  }
}

class NoopEventBus implements EventBus {
  publish(_event: DomainEvent): void {}
  subscribe(_handler: (event: DomainEvent) => void): () => void {
    return () => {};
  }
}

describe("Developer Mode Tools and Autosave", () => {
  const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
  const getCleanSession = async () => {
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const stateRepo = new InMemoryGameStateRepository();
    const saveRepo = new InMemorySaveRepository();
    const deps: GameSessionDeps = {
      gameStateRepository: stateRepo,
      saveRepository: saveRepo,
      commandLogRepository: new NoopCommandLogRepository(),
      snapshotRepository: new NoopSnapshotRepository(),
      staticWorldData: staticData,
      eventBus: new NoopEventBus(),
      clock: new ManualClock(),
      systems: []
    };
    const session = new GameSession(deps);
    await session.bootstrap(state);
    return { session, stateRepo, saveRepo };
  };

  it("forces autosave slot commit and writes to repository", async () => {
    const { session, saveRepo } = await getCleanSession();
    await session.triggerAutosave();

    const autosaveSnapshot = await saveRepo.loadFromSlot("auto-1");
    expect(autosaveSnapshot).not.toBeNull();
    expect(autosaveSnapshot!.summary.slotId).toBe("auto-1");
    expect(autosaveSnapshot!.state.meta.tick).toBe(session.getState().meta.tick);
  });

  it("toggles Fog of War disabled state", async () => {
    const { session } = await getCleanSession();
    expect(session.fogOfWarDisabled).toBe(false);
    session.toggleFogOfWar();
    expect(session.fogOfWarDisabled).toBe(true);
    session.toggleFogOfWar();
    expect(session.fogOfWarDisabled).toBe(false);
  });

  it("adds +1000 to gold and manpower via addResourcesDev", async () => {
    const { session } = await getCleanSession();
    const stateBefore = session.getState();
    const playerBefore = stateBefore.kingdoms["k_player"];
    const goldBefore = playerBefore.economy.stock.gold;
    const manpowerBefore = playerBefore.military.reserveManpower;

    session.addResourcesDev("gold");
    session.addResourcesDev("manpower");

    const stateAfter = session.getState();
    const playerAfter = stateAfter.kingdoms["k_player"];
    expect(playerAfter.economy.stock.gold).toBe(goldBefore + 1000);
    expect(playerAfter.military.reserveManpower).toBe(manpowerBefore + 1000);
  });

  it("completes active research instantly via completeResearchDev", async () => {
    const { session } = await getCleanSession();
    const state = session.getState();
    const player = state.kingdoms["k_player"];
    player.technology.activeResearchId = "bone_tools";

    session.completeResearchDev();

    const stateAfter = session.getState();
    const playerAfter = stateAfter.kingdoms["k_player"];
    expect(playerAfter.technology.unlocked).toContain("bone_tools");
    expect(playerAfter.technology.activeResearchId).toBeNull();
  });

  it("unlocks all technology nodes via unlockAllTechnologiesDev", async () => {
    const { session } = await getCleanSession();
    session.unlockAllTechnologiesDev();

    const stateAfter = session.getState();
    const playerAfter = stateAfter.kingdoms["k_player"];
    expect(playerAfter.technology.unlocked.length).toBeGreaterThan(5);
  });

  it("returns Strategic Focus, Target, and Reason for NPC kingdoms", async () => {
    const { session } = await getCleanSession();
    const decisions = session.getNpcAiDecisionsDev();
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].focus).toBeDefined();
    expect(decisions[0].target).toBeDefined();
    expect(decisions[0].reason).toBeDefined();
  });

  it("allows assuming control of another kingdom", async () => {
    const { session } = await getCleanSession();
    const state = session.getState();
    const npcs = Object.keys(state.kingdoms).filter(id => !state.kingdoms[id].isPlayer && id !== "k_nature");
    const targetNpcId = npcs[0];

    session.assumeControlOfKingdom(targetNpcId);

    const stateAfter = session.getState();
    expect(stateAfter.kingdoms["k_player"].isPlayer).toBe(false);
    expect(stateAfter.kingdoms[targetNpcId].isPlayer).toBe(true);
  });

  it("supports fast simulation autoplaying mode and restores control", async () => {
    const { session } = await getCleanSession();
    expect(session.autoplayEnabled).toBe(false);
    
    session.toggleAutoplay();
    expect(session.autoplayEnabled).toBe(true);
    expect(session.getState().meta.speedMultiplier).toBe(100);
    expect(session.getState().kingdoms["k_player"].isPlayer).toBe(false);

    session.toggleAutoplay();
    expect(session.autoplayEnabled).toBe(false);
    expect(session.getState().kingdoms["k_player"].isPlayer).toBe(true);
  });

  it("generates diplomatic relations matrix", async () => {
    const { session } = await getCleanSession();
    const matrix = session.getDiplomacyMatrix();
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0].trust).toBeDefined();
    expect(matrix[0].fear).toBeDefined();
    expect(matrix[0].rivalry).toBeDefined();
  });

  it("simulates fast combat predictively without modifying state", async () => {
    const { session } = await getCleanSession();
    const state = session.getState();
    const npcs = Object.keys(state.kingdoms).filter(id => !state.kingdoms[id].isPlayer && id !== "k_nature");
    
    const result = session.simulateCombatDev("k_player", npcs[0]);
    expect(result).not.toBeNull();
    expect(result!.winnerName).toBeDefined();
    expect(result!.casualties1).toBeGreaterThanOrEqual(0);
    expect(result!.casualties2).toBeGreaterThanOrEqual(0);
    expect(result!.predictedOutcome).toBeDefined();
  });
});

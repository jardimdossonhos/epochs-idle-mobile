import type {
  GameStateRepository,
  SaveRepository,
  CommandLogRepository,
  SnapshotRepository,
  SaveSnapshot,
  SaveSummary,
  SaveSlotId
} from "../core/contracts/game-ports";
import type { GameState } from "../core/models/game-state";
import type { CommandLogEntry, StateSnapshot, SnapshotSummary } from "../core/models/commands";

export class MemoryGameStateRepository implements GameStateRepository {
  private state: GameState | null = null;
  async saveCurrent(state: GameState): Promise<void> { this.state = state; }
  async loadCurrent(): Promise<GameState | null> { return this.state; }
  async clearCurrent(): Promise<void> { this.state = null; }
  
  saveCurrentSync(state: GameState): void { this.state = state; }
  loadCurrentSync(): GameState | null { return this.state; }
  clearCurrentSync(): void { this.state = null; }
}

export class MemorySaveRepository implements SaveRepository {
  private slots = new Map<SaveSlotId, SaveSnapshot>();
  async saveToSlot(snapshot: SaveSnapshot): Promise<void> { this.slots.set(snapshot.summary.slotId, snapshot); }
  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> { return this.slots.get(slotId) || null; }
  async listSlots(): Promise<SaveSummary[]> { return Array.from(this.slots.values()).map(s => s.summary); }
  async deleteSlot(slotId: SaveSlotId): Promise<void> { this.slots.delete(slotId); }
}

export class MemoryCommandLogRepository implements CommandLogRepository {
  private logs: CommandLogEntry[] = [];
  async append(entries: CommandLogEntry[]): Promise<void> { this.logs.push(...entries); }
  async latest(): Promise<CommandLogEntry | null> { return this.logs.length > 0 ? this.logs[this.logs.length - 1] : null; }
  async listAfter(sequence: number, limit?: number): Promise<CommandLogEntry[]> { 
    return this.logs.filter(l => l.sequence > sequence).slice(0, limit); 
  }
  async clear(): Promise<void> { this.logs = []; }
}

export class MemorySnapshotRepository implements SnapshotRepository {
  private snaps: StateSnapshot[] = [];
  async save(snapshot: StateSnapshot): Promise<void> { this.snaps.push(snapshot); }
  async latest(): Promise<StateSnapshot | null> { return this.snaps.length > 0 ? this.snaps[this.snaps.length - 1] : null; }
  async load(snapshotId: string): Promise<StateSnapshot | null> {
    return this.snaps.find(s => s.id === snapshotId) || null;
  }
  async list(limit?: number): Promise<SnapshotSummary[]> {
    const list = this.snaps.map(s => ({
      id: s.id,
      tick: s.tick,
      savedAt: s.savedAt,
      reason: s.reason,
      commandSequence: s.commandSequence,
      commandHash: s.commandHash,
      stateHash: s.stateHash
    }));
    return limit ? list.slice(0, limit) : list;
  }
  async delete(snapshotId: string): Promise<void> {
    this.snaps = this.snaps.filter(s => s.id !== snapshotId);
  }
  async getLatestBefore(sequence: number): Promise<StateSnapshot | null> {
    const valid = this.snaps.filter(s => s.commandSequence <= sequence);
    return valid.length > 0 ? valid[valid.length - 1] : null;
  }
  async clear(): Promise<void> { this.snaps = []; }
}

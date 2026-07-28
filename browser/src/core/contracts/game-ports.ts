import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../models/commands";
import type { GameState } from "../models/game-state";
import type { TimestampMs } from "../models/types";

export type SaveSlotId = `auto-${number}` | "manual-1" | "manual-2" | "manual-3" | "safety-1";

export interface SaveSummary {
  slotId: SaveSlotId;
  savedAt: TimestampMs;
  campaignName: string;
  playerKingdomName: string;
  tick: number;
  territoryCount: number;
  militaryPower: number;
  economyPower: number;
  victoryAchieved: boolean;
}

export interface SaveSnapshot {
  summary: SaveSummary;
  state: GameState;
}

export interface GameStateRepository {
  loadCurrent(): Promise<GameState | null>;
  saveCurrent(state: GameState): Promise<void>;
  clearCurrent(): Promise<void>;

  // New methods for synchronous operations
  saveCurrentSync(state: GameState): void;
  loadCurrentSync(): GameState | null;
  clearCurrentSync(): void;
}

export interface SaveRepository {
  saveToSlot(snapshot: SaveSnapshot): Promise<void>;
  loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null>;
  listSlots(): Promise<SaveSummary[]>;
  deleteSlot(slotId: SaveSlotId): Promise<void>;
}

export interface CommandLogRepository {
  append(entries: CommandLogEntry[]): Promise<void>;
  latest(): Promise<CommandLogEntry | null>;
  listAfter(sequence: number, limit?: number): Promise<CommandLogEntry[]>;
  clear(): Promise<void>;
}

export interface SnapshotRepository {
  save(snapshot: StateSnapshot): Promise<void>;
  latest(): Promise<StateSnapshot | null>;
  load(snapshotId: string): Promise<StateSnapshot | null>;
  list(limit?: number): Promise<SnapshotSummary[]>;
  delete(snapshotId: string): Promise<void>;
}

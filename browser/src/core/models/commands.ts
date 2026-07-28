import type { GameState } from "./game-state";
import type { TickId, TimestampMs } from "./types";

export type CommandIssuerType = "player" | "npc" | "system";

export interface CommandLogEntry {
  sequence: number;
  id: string;
  issuerType: CommandIssuerType;
  issuerId: string;
  tick: TickId;
  commandType: string;
  payload: Record<string, unknown>;
  createdAt: TimestampMs;
  previousHash: string;
  hash: string;
}

export type SnapshotReason = "bootstrap" | "periodic" | "manual" | "safety" | "autosave";

export interface StateSnapshot {
  id: string;
  tick: TickId;
  savedAt: TimestampMs;
  reason: SnapshotReason;
  commandSequence: number;
  commandHash: string;
  stateHash?: string;
  state: GameState;
}

export interface SnapshotSummary {
  id: string;
  tick: TickId;
  savedAt: TimestampMs;
  reason: SnapshotReason;
  commandSequence: number;
  commandHash: string;
  stateHash?: string;
}

import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../../core/models/commands";
import {
  SAVE_SCHEMA_VERSION,
  isValidGameStateShape
} from "./save-schema";

type CommandIssuerType = CommandLogEntry["issuerType"];
type SnapshotReason = StateSnapshot["reason"];

export interface CommandLogEnvelope {
  schemaVersion: number;
  storedAt: number;
  entry: CommandLogEntry;
}

export interface StateSnapshotEnvelope {
  schemaVersion: number;
  storedAt: number;
  snapshot: StateSnapshot;
}

export function createCommandEnvelope(entry: CommandLogEntry): CommandLogEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    entry
  };
}

export function createSnapshotEnvelope(snapshot: StateSnapshot): StateSnapshotEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    snapshot
  };
}

export function summarizeSnapshot(snapshot: StateSnapshot): SnapshotSummary {
  return {
    id: snapshot.id,
    tick: snapshot.tick,
    savedAt: snapshot.savedAt,
    reason: snapshot.reason,
    commandSequence: snapshot.commandSequence,
    commandHash: snapshot.commandHash,
    stateHash: snapshot.stateHash
  };
}

function isValidIssuerType(value: unknown): value is CommandIssuerType {
  return value === "player" || value === "npc" || value === "system";
}

function isValidCommandEntry(input: unknown): input is CommandLogEntry {
  if (!input || typeof input !== "object") {
    return false;
  }

  const entry = input as Partial<CommandLogEntry>;

  return (
    typeof entry.sequence === "number" &&
    Number.isInteger(entry.sequence) &&
    entry.sequence > 0 &&
    typeof entry.id === "string" &&
    isValidIssuerType(entry.issuerType) &&
    typeof entry.issuerId === "string" &&
    typeof entry.tick === "number" &&
    Number.isInteger(entry.tick) &&
    typeof entry.commandType === "string" &&
    !!entry.payload &&
    typeof entry.payload === "object" &&
    typeof entry.createdAt === "number" &&
    typeof entry.previousHash === "string" &&
    typeof entry.hash === "string"
  );
}

function isValidSnapshotReason(value: unknown): value is SnapshotReason {
  return value === "bootstrap" || value === "periodic" || value === "manual" || value === "safety" || value === "autosave";
}

function isValidStateSnapshot(input: unknown): input is StateSnapshot {
  if (!input || typeof input !== "object") {
    return false;
  }

  const snapshot = input as Partial<StateSnapshot>;

  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.tick === "number" &&
    Number.isInteger(snapshot.tick) &&
    typeof snapshot.savedAt === "number" &&
    isValidSnapshotReason(snapshot.reason) &&
    typeof snapshot.commandSequence === "number" &&
    Number.isInteger(snapshot.commandSequence) &&
    snapshot.commandSequence >= 0 &&
    typeof snapshot.commandHash === "string" &&
    (typeof snapshot.stateHash === "undefined" || typeof snapshot.stateHash === "string") &&
    isValidGameStateShape(snapshot.state)
  );
}

export function normalizeCommandEnvelope(input: unknown): CommandLogEnvelope | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const envelope = input as Partial<CommandLogEnvelope>;

  if (envelope.schemaVersion !== SAVE_SCHEMA_VERSION || typeof envelope.storedAt !== "number" || !isValidCommandEntry(envelope.entry)) {
    return null;
  }

  return envelope as CommandLogEnvelope;
}

export function normalizeSnapshotEnvelope(input: unknown): StateSnapshotEnvelope | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const envelope = input as Partial<StateSnapshotEnvelope>;

  if (envelope.schemaVersion !== SAVE_SCHEMA_VERSION || typeof envelope.storedAt !== "number" || !isValidStateSnapshot(envelope.snapshot)) {
    return null;
  }

  return envelope as StateSnapshotEnvelope;
}

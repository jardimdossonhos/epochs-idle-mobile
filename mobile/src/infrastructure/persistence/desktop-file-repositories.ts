import type {
  CommandLogRepository,
  GameStateRepository,
  SaveRepository,
  SaveSlotId,
  SaveSnapshot,
  SaveSummary,
  SnapshotRepository
} from "../../core/contracts/game-ports";
import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../../core/models/commands";
import type { GameState } from "../../core/models/game-state";
import type { DesktopBridge, DesktopStorageListEntry } from "../runtime/desktop-bridge";
import {
  createCurrentStateEnvelope,
  normalizeCurrentStateEnvelope,
  normalizeSaveEnvelope,
  toSaveEnvelope
} from "./save-schema";
import {
  createCommandEnvelope,
  createSnapshotEnvelope,
  normalizeCommandEnvelope,
  normalizeSnapshotEnvelope,
  summarizeSnapshot
} from "./command-snapshot-schema";

const CURRENT_SCOPE = "current-state";
const SAVES_SCOPE = "save-slots";
const COMMAND_SCOPE = "command-log";
const SNAPSHOT_SCOPE = "state-snapshots";
const CURRENT_KEY = "current";

function envelopeVersion(input: unknown): number | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as { schemaVersion?: unknown };
  return typeof candidate.schemaVersion === "number" ? candidate.schemaVersion : null;
}

function sortEntriesByKey(entries: DesktopStorageListEntry[]): DesktopStorageListEntry[] {
  return [...entries].sort((left, right) => left.key.localeCompare(right.key));
}

export class DesktopFileGameStateRepository implements GameStateRepository {
  constructor(private readonly bridge: DesktopBridge) {}

  async loadCurrent(): Promise<GameState | null> {
    const envelope = await this.bridge.storage.read(CURRENT_SCOPE, CURRENT_KEY);

    if (!envelope) {
      return null;
    }

    const normalized = normalizeCurrentStateEnvelope(envelope);
    if (!normalized) {
      await this.bridge.storage.delete(CURRENT_SCOPE, CURRENT_KEY);
      return null;
    }

    if (envelopeVersion(envelope) !== normalized.schemaVersion) {
      await this.bridge.storage.write(CURRENT_SCOPE, CURRENT_KEY, normalized);
    }

    return normalized.state;
  }

  async saveCurrent(state: GameState): Promise<void> {
    await this.bridge.storage.write(CURRENT_SCOPE, CURRENT_KEY, createCurrentStateEnvelope(state));
  }

  async clearCurrent(): Promise<void> {
    await this.bridge.storage.delete(CURRENT_SCOPE, CURRENT_KEY);
  }

  saveCurrentSync(state: GameState): void {
    try {
      const envelope = createCurrentStateEnvelope(state);
      localStorage.setItem("desktop:current", JSON.stringify(envelope));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }

  loadCurrentSync(): GameState | null {
    try {
      const raw = localStorage.getItem("desktop:current");
      if (!raw) {
        return null;
      }
      const envelope = JSON.parse(raw);
      const normalized = normalizeCurrentStateEnvelope(envelope);
      return normalized?.state ?? null;
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
      return null;
    }
  }

  clearCurrentSync(): void {
    try {
      localStorage.removeItem("desktop:current");
    } catch (error) {
      console.error("Failed to clear state from localStorage", error);
    }
  }
}

export class DesktopFileSaveRepository implements SaveRepository {
  constructor(private readonly bridge: DesktopBridge) {}

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    await this.bridge.storage.write(SAVES_SCOPE, snapshot.summary.slotId, toSaveEnvelope(snapshot));
  }

  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    const envelope = await this.bridge.storage.read(SAVES_SCOPE, slotId);

    if (!envelope) {
      return null;
    }

    const normalized = normalizeSaveEnvelope(envelope);
    if (!normalized) {
      await this.bridge.storage.delete(SAVES_SCOPE, slotId);
      return null;
    }

    if (envelopeVersion(envelope) !== normalized.schemaVersion) {
      await this.bridge.storage.write(SAVES_SCOPE, slotId, normalized);
    }

    return normalized.snapshot;
  }

  async listSlots(): Promise<SaveSummary[]> {
    const entries = sortEntriesByKey(await this.bridge.storage.list(SAVES_SCOPE));
    const summaries: SaveSummary[] = [];

    for (const entry of entries) {
      const normalized = normalizeSaveEnvelope(entry.value);
      if (!normalized) {
        continue;
      }

      summaries.push(normalized.snapshot.summary);
    }

    return summaries.sort((left, right) => right.savedAt - left.savedAt);
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    await this.bridge.storage.delete(SAVES_SCOPE, slotId);
  }

  async clearAll(): Promise<void> {
    await this.bridge.storage.clear(SAVES_SCOPE);
  }
}

export class DesktopFileCommandLogRepository implements CommandLogRepository {
  constructor(private readonly bridge: DesktopBridge) {}

  async append(entries: CommandLogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.bridge.storage.write(COMMAND_SCOPE, String(entry.sequence), createCommandEnvelope(entry));
    }
  }

  async latest(): Promise<CommandLogEntry | null> {
    const entries = sortEntriesByKey(await this.bridge.storage.list(COMMAND_SCOPE));
    const latest = entries
      .map((entry) => normalizeCommandEnvelope(entry.value))
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)
      .sort((left, right) => right.entry.sequence - left.entry.sequence)[0];

    return latest?.entry ?? null;
  }

  async listAfter(sequence: number, limit = 200): Promise<CommandLogEntry[]> {
    const entries = sortEntriesByKey(await this.bridge.storage.list(COMMAND_SCOPE));

    return entries
      .map((entry) => normalizeCommandEnvelope(entry.value))
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)
      .map((entry) => entry.entry)
      .filter((entry) => entry.sequence > sequence)
      .sort((left, right) => left.sequence - right.sequence)
      .slice(0, Math.max(1, limit));
  }

  async clear(): Promise<void> {
    await this.bridge.storage.clear(COMMAND_SCOPE);
  }
}

export class DesktopFileSnapshotRepository implements SnapshotRepository {
  constructor(private readonly bridge: DesktopBridge) {}

  async save(snapshot: StateSnapshot): Promise<void> {
    await this.bridge.storage.write(SNAPSHOT_SCOPE, snapshot.id, createSnapshotEnvelope(snapshot));
  }

  async latest(): Promise<StateSnapshot | null> {
    const summaries = await this.list(1);
    if (summaries.length === 0) {
      return null;
    }

    return this.load(summaries[0].id);
  }

  async load(snapshotId: string): Promise<StateSnapshot | null> {
    const envelope = await this.bridge.storage.read(SNAPSHOT_SCOPE, snapshotId);
    return normalizeSnapshotEnvelope(envelope)?.snapshot ?? null;
  }

  async list(limit = 20): Promise<SnapshotSummary[]> {
    const entries = sortEntriesByKey(await this.bridge.storage.list(SNAPSHOT_SCOPE));
    const summaries = entries
      .map((entry) => normalizeSnapshotEnvelope(entry.value))
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)
      .map((entry) => summarizeSnapshot(entry.snapshot))
      .sort((left, right) => {
        if (right.savedAt !== left.savedAt) {
          return right.savedAt - left.savedAt;
        }

        return right.tick - left.tick;
      });

    return summaries.slice(0, Math.max(1, limit));
  }

  async delete(snapshotId: string): Promise<void> {
    await this.bridge.storage.delete(SNAPSHOT_SCOPE, snapshotId);
  }
}

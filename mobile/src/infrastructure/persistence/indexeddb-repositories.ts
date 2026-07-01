﻿﻿﻿import { openDB, type DBSchema, type IDBPDatabase } from "idb";
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
  normalizeSnapshotEnvelope
} from "./command-snapshot-schema";

const DB_NAME = "epochs-idle-pc";
const DB_VERSION = 2;

interface MedievalDbSchema extends DBSchema {
  current_state: {
    key: string;
    value: import("./save-schema").CurrentStateEnvelope;
  };
  save_slots: {
    key: string;
    value: import("./save-schema").SaveEnvelope;
  };
  command_log: {
    key: string;
    value: import("./command-snapshot-schema").CommandLogEnvelope;
  };
  state_snapshots: {
    key: string;
    value: import("./command-snapshot-schema").StateSnapshotEnvelope;
  };
}

async function openGameDb(): Promise<IDBPDatabase<MedievalDbSchema>> {
  return openDB<MedievalDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("current_state")) {
        db.createObjectStore("current_state");
      }

      if (!db.objectStoreNames.contains("save_slots")) {
        db.createObjectStore("save_slots");
      }

      if (!db.objectStoreNames.contains("command_log")) {
        db.createObjectStore("command_log");
      }

      if (!db.objectStoreNames.contains("state_snapshots")) {
        db.createObjectStore("state_snapshots");
      }
    }
  });
}

export class IndexedDbGameStateRepository implements GameStateRepository {
  private readonly key: string;

  constructor(campaignId: string, private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {
    this.key = `campaign:${campaignId}:current`;
  }

  async loadCurrent(): Promise<GameState | null> {
    const db = await this.dbPromise;
    const envelope = await db.get("current_state", this.key);

    if (!envelope) {
      return null;
    }

    const normalized = normalizeCurrentStateEnvelope(envelope);

    if (!normalized) {
      await db.delete("current_state", this.key);
      return null;
    }

    if (envelope.schemaVersion !== normalized.schemaVersion) {
      await db.put("current_state", normalized, this.key);
    }

    return normalized.state;
  }

  async saveCurrent(state: GameState): Promise<void> {
    const db = await this.dbPromise;
    await db.put("current_state", createCurrentStateEnvelope(state), this.key);
  }

  async clearCurrent(): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("current_state", this.key);
  }

  saveCurrentSync(state: GameState): void {
    try {
      const envelope = createCurrentStateEnvelope(state);
      localStorage.setItem(this.key, JSON.stringify(envelope));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }

  loadCurrentSync(): GameState | null {
    try {
      const raw = localStorage.getItem(this.key);
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
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error("Failed to clear state from localStorage", error);
    }
  }
}

export class IndexedDbSaveRepository implements SaveRepository {
  private readonly prefix: string;

  constructor(campaignId: string, private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {
    this.prefix = `campaign:${campaignId}:`;
  }

  private toPrefixedKey(slotId: SaveSlotId): string {
    return `${this.prefix}${slotId}`;
  }

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    const db = await this.dbPromise;
    const envelope = toSaveEnvelope(snapshot);
    await db.put("save_slots", envelope, this.toPrefixedKey(snapshot.summary.slotId));
  }

  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    const db = await this.dbPromise;
    const prefixedKey = this.toPrefixedKey(slotId);
    const envelope = await db.get("save_slots", prefixedKey);

    if (!envelope) {
      return null;
    }

    const normalized = normalizeSaveEnvelope(envelope);

    if (!normalized) {
      await db.delete("save_slots", prefixedKey);
      return null;
    }

    if (envelope.schemaVersion !== normalized.schemaVersion) {
      await db.put("save_slots", normalized, prefixedKey);
    }

    return normalized.snapshot;
  }

  async listSlots(): Promise<SaveSummary[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction("save_slots", "readonly");
    const store = transaction.objectStore("save_slots");
    const range = IDBKeyRange.bound(this.prefix, `${this.prefix}\uffff`, false, true);
    const keys = await store.getAllKeys(range);

    const summaries: SaveSummary[] = [];

    for (const key of keys) {
      const envelope = await store.get(key);
      const normalized = normalizeSaveEnvelope(envelope);

      if (!normalized) {
        continue;
      }

      summaries.push(normalized.snapshot.summary);
    }

    await transaction.done;

    return summaries.sort((a, b) => b.savedAt - a.savedAt);
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("save_slots", this.toPrefixedKey(slotId));
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    const range = IDBKeyRange.bound(this.prefix, `${this.prefix}\uffff`, false, true);
    const tx = db.transaction("save_slots", "readwrite");
    await tx.store.delete(range);
    await tx.done;
  }
}

export class IndexedDbCommandLogRepository implements CommandLogRepository {
  private readonly prefix: string;

  constructor(campaignId: string, private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {
    this.prefix = `campaign:${campaignId}:`;
  }

  async append(entries: CommandLogEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const db = await this.dbPromise;
    const tx = db.transaction("command_log", "readwrite");
    const store = tx.objectStore("command_log");

    for (const entry of entries) {
      await store.put(createCommandEnvelope(entry), `${this.prefix}${entry.sequence}`);
    }

    await tx.done;
  }

  async latest(): Promise<CommandLogEntry | null> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction("command_log", "readonly");
      const store = tx.objectStore("command_log");

      // Abrir um cursor com direção 'prev' é a forma mais eficiente de pegar o último item.
      const range = IDBKeyRange.bound(this.prefix, `${this.prefix}\uffff`, false, true);
      const cursor = await store.openCursor(range, "prev");

      // O cursor é nulo se a store estiver vazia.
      if (!cursor) {
        await tx.done;
        return null;
      }

      // O valor do cursor é o envelope. Normalizamos para obter a entrada.
      const envelope = cursor.value;
      await tx.done;

      return normalizeCommandEnvelope(envelope)?.entry ?? null;
    } catch (error) {
      console.error("Erro ao buscar o último registro do log de comandos:", error);
      // Em caso de erro, também é seguro retornar null para não quebrar a inicialização.
      return null;
    }
  }

  async listAfter(sequence: number, limit = 200): Promise<CommandLogEntry[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("command_log", "readonly");
    const store = tx.objectStore("command_log");
    const range = IDBKeyRange.bound(this.prefix, `${this.prefix}\uffff`, false, true);
    const allKeys = await store.getAllKeys(range);

    const sortedKeys = allKeys
      .map((item) => Number(String(item).substring(this.prefix.length)))
      .filter((item) => Number.isFinite(item) && item > sequence)
      .sort((left, right) => left - right)
      .slice(0, Math.max(1, limit));

    const entries: CommandLogEntry[] = [];

    for (const key of sortedKeys) {
      const envelope = await store.get(`${this.prefix}${key}`);
      const normalized = normalizeCommandEnvelope(envelope);
      if (normalized) {
        entries.push(normalized.entry);
      }
    }

    await tx.done;
    return entries;
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    const range = IDBKeyRange.bound(this.prefix, `${this.prefix}\uffff`, false, true);
    const tx = db.transaction("command_log", "readwrite");
    await tx.store.delete(range);
    await tx.done;
  }
}

export class IndexedDbSnapshotRepository implements SnapshotRepository {
  private readonly prefix: string;

  constructor(campaignId: string, private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {
    this.prefix = `campaign:${campaignId}:`;
  }

  async save(snapshot: StateSnapshot): Promise<void> {
    const db = await this.dbPromise;
    const prefixedId = `${this.prefix}${snapshot.id}`;
    await db.put("state_snapshots", createSnapshotEnvelope(snapshot), prefixedId);
  }

  async latest(): Promise<StateSnapshot | null> {
    const summaries = await this.list(1);

    if (summaries.length === 0) {
      return null;
    }

    return this.load(summaries[0].id);
  }

  async load(snapshotId: string): Promise<StateSnapshot | null> {
    const db = await this.dbPromise;
    const prefixedId = `${this.prefix}${snapshotId}`;
    const envelope = await db.get("state_snapshots", prefixedId);
    return normalizeSnapshotEnvelope(envelope)?.snapshot ?? null;
  }

  async list(limit = 20): Promise<SnapshotSummary[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("state_snapshots", "readonly");
    const store = tx.objectStore("state_snapshots");
    const range = IDBKeyRange.bound(this.prefix, `${this.prefix}\uffff`, false, true);
    const keys = await store.getAllKeys(range);

    const summaries: SnapshotSummary[] = [];

    for (const key of keys) {
      const envelope = await store.get(key);
      const normalized = normalizeSnapshotEnvelope(envelope);

      if (!normalized) {
        continue;
      }

      const snapshot = normalized.snapshot;
      summaries.push({
        id: snapshot.id,
        tick: snapshot.tick,
        savedAt: snapshot.savedAt,
        reason: snapshot.reason,
        commandSequence: snapshot.commandSequence,
        commandHash: snapshot.commandHash,
        stateHash: snapshot.stateHash
      });
    }

    await tx.done;

    return summaries
      .sort((left, right) => {
        if (right.savedAt !== left.savedAt) {
          return right.savedAt - left.savedAt;
        }

        return right.tick - left.tick;
      })
      .slice(0, Math.max(1, limit));
  }

  async delete(snapshotId: string): Promise<void> {
    const db = await this.dbPromise;
    const prefixedId = `${this.prefix}${snapshotId}`;
    await db.delete("state_snapshots", prefixedId);
  }
}

import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { SyncCoordinator } from "../src/application/sync/sync-coordinator";
import type { CommandLogRepository, SnapshotRepository } from "../src/core/contracts/game-ports";
import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../src/core/models/commands";
import { LocalOnlySyncAdapter } from "../src/infrastructure/sync/local-sync-adapter";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { hashDeterministic } from "../src/core/utils/stable-hash";

class InMemoryCommandLogRepository implements CommandLogRepository {
  private readonly entries = new Map<number, CommandLogEntry>();

  async append(entries: CommandLogEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.sequence, structuredClone(entry));
    }
  }

  async latest(): Promise<CommandLogEntry | null> {
    if (this.entries.size === 0) {
      return null;
    }

    const latestSequence = Math.max(...Array.from(this.entries.keys()));
    return structuredClone(this.entries.get(latestSequence) ?? null);
  }

  async listAfter(sequence: number, limit = 200): Promise<CommandLogEntry[]> {
    return Array.from(this.entries.keys())
      .sort((left, right) => left - right)
      .filter((entrySequence) => entrySequence > sequence)
      .slice(0, Math.max(1, limit))
      .map((entrySequence) => this.entries.get(entrySequence))
      .filter((entry): entry is CommandLogEntry => !!entry)
      .map((entry) => structuredClone(entry));
  }

  async clear(): Promise<void> {
    this.entries.clear();
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
      .sort((left, right) => right.savedAt - left.savedAt)
      .slice(0, Math.max(1, limit))
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

function createCommand(sequence: number, previousHash: string, commandType: string, createdAt: number): CommandLogEntry {
  const base = {
    sequence,
    id: `cmd:${sequence}:${commandType}`,
    issuerType: "system" as const,
    issuerId: "runtime",
    tick: sequence,
    commandType,
    payload: { source: "test" },
    createdAt,
    previousHash
  };

  const hashMaterial = {
    sequence,
    id: base.id,
    issuerType: base.issuerType,
    issuerId: base.issuerId,
    tick: base.tick,
    commandType: base.commandType,
    payload: base.payload,
    previousHash: base.previousHash
  };

  return {
    ...base,
    hash: hashDeterministic(hashMaterial)
  };
}

describe("SyncCoordinator", () => {
  it("pushes local commands and pulls new remote commands", async () => {
    const initialState = createInitialState(undefined, undefined, WORLD_DEFINITIONS_V1);
    const commandRepo = new InMemoryCommandLogRepository();
    const snapshotRepo = new InMemorySnapshotRepository();
    const syncAdapter = new LocalOnlySyncAdapter();

    const first = createCommand(1, "genesis", "tick.processed", initialState.meta.createdAt + 1_000);
    const second = createCommand(2, first.hash, "tick.processed", initialState.meta.createdAt + 2_000);

    await commandRepo.append([first, second]);
    await snapshotRepo.save({
      id: "snapshot:test:1",
      tick: 2,
      savedAt: initialState.meta.createdAt + 2_000,
      reason: "periodic",
      commandSequence: 2,
      commandHash: second.hash,
      state: initialState
    });

    const coordinator = new SyncCoordinator({
      commandLogRepository: commandRepo,
      snapshotRepository: snapshotRepo,
      syncAdapter
    });

    const firstSync = await coordinator.sync(initialState);
    expect(firstSync.report.pushedCommands).toBe(2);
    expect(firstSync.report.remoteHeadSequence).toBe(2);

    const remoteThird = createCommand(3, second.hash, "event.remote", initialState.meta.createdAt + 3_000);
    await syncAdapter.pushCommands([remoteThird]);

    const secondSync = await coordinator.sync(initialState);
    expect(secondSync.report.pulledCommands).toBe(1);
    expect(secondSync.report.remoteHeadSequence).toBe(3);
  });
});

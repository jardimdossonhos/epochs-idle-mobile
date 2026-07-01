import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../../core/models/commands";
import type { GameState } from "../../core/models/game-state";
import type { SyncAdapter, SyncPullRequest, SyncPullResponse, SyncSyncResult } from "../../core/contracts/services";
import { validateCommandChain } from "../../core/utils/command-chain";
import { buildStateHash } from "../../core/utils/state-fingerprint";

function cloneEntry(entry: CommandLogEntry): CommandLogEntry {
  return structuredClone(entry);
}

function cloneSnapshot(snapshot: StateSnapshot): StateSnapshot {
  return structuredClone(snapshot);
}

export class LocalOnlySyncAdapter implements SyncAdapter {
  private readonly commands = new Map<number, CommandLogEntry>();
  private readonly snapshots = new Map<string, StateSnapshot>();
  private latestSequence = 0;
  private latestHash = "genesis";

  async pushCommands(entries: CommandLogEntry[]): Promise<SyncSyncResult> {
    if (entries.length === 0) {
      return {
        acceptedCommands: 0,
        latestSequence: this.latestSequence,
        latestHash: this.latestHash
      };
    }

    const sorted = [...entries].sort((left, right) => left.sequence - right.sequence);
    const first = sorted[0];

    const validation = validateCommandChain(sorted, {
      startSequence: first.sequence - 1,
      startHash: first.previousHash,
      requireContiguous: true
    });

    if (!validation.valid) {
      throw new Error(`Falha de integridade no pushCommands: ${validation.issues[0]?.reason ?? "cadeia inválida"}`);
    }

    let accepted = 0;

    for (const entry of sorted) {
      const existing = this.commands.get(entry.sequence);

      if (existing) {
        if (existing.hash !== entry.hash) {
          throw new Error(`Conflito de comando na sequência ${entry.sequence}.`);
        }

        continue;
      }

      this.commands.set(entry.sequence, cloneEntry(entry));
      accepted += 1;
    }

    this.recomputeHead();

    return {
      acceptedCommands: accepted,
      latestSequence: this.latestSequence,
      latestHash: this.latestHash
    };
  }

  async pullCommands(request: SyncPullRequest): Promise<SyncPullResponse> {
    const fromSequence = Math.max(0, request.fromSequence);
    const limit = Math.max(1, request.limit ?? 200);

    const entries = Array.from(this.commands.keys())
      .sort((left, right) => left - right)
      .filter((sequence) => sequence > fromSequence)
      .slice(0, limit)
      .map((sequence) => this.commands.get(sequence))
      .filter((entry): entry is CommandLogEntry => !!entry)
      .map((entry) => cloneEntry(entry));

    return {
      entries,
      latestSequence: this.latestSequence,
      latestHash: this.latestHash
    };
  }

  async pushSnapshot(snapshot: StateSnapshot): Promise<void> {
    const normalized: StateSnapshot = {
      ...snapshot,
      stateHash: snapshot.stateHash ?? buildStateHash(snapshot.state)
    };

    this.snapshots.set(normalized.id, cloneSnapshot(normalized));
  }

  async pullLatestSnapshot(): Promise<StateSnapshot | null> {
    const summaries = await this.pullSnapshotSummaries(1);

    if (summaries.length === 0) {
      return null;
    }

    const latest = this.snapshots.get(summaries[0].id);
    return latest ? cloneSnapshot(latest) : null;
  }

  async pullSnapshotSummaries(limit = 20): Promise<SnapshotSummary[]> {
    return Array.from(this.snapshots.values())
      .sort((left, right) => {
        if (right.savedAt !== left.savedAt) {
          return right.savedAt - left.savedAt;
        }

        return right.tick - left.tick;
      })
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

  async merge(localState: GameState, remoteSnapshot: StateSnapshot | null, remoteEntries: CommandLogEntry[]): Promise<GameState> {
    if (!remoteSnapshot) {
      return localState;
    }

    const localHash = buildStateHash(localState);
    const remoteHash = remoteSnapshot.stateHash ?? buildStateHash(remoteSnapshot.state);

    const remoteHasMoreTickSignals = remoteEntries.some((entry) => entry.tick > localState.meta.tick);

    if (remoteSnapshot.tick > localState.meta.tick || remoteHasMoreTickSignals) {
      return structuredClone(remoteSnapshot.state);
    }

    if (remoteSnapshot.tick === localState.meta.tick && remoteHash !== localHash) {
      return structuredClone(remoteSnapshot.state);
    }

    return localState;
  }

  private recomputeHead(): void {
    const keys = Array.from(this.commands.keys()).sort((left, right) => left - right);

    if (keys.length === 0) {
      this.latestSequence = 0;
      this.latestHash = "genesis";
      return;
    }

    const latestSequence = keys[keys.length - 1];
    const latest = this.commands.get(latestSequence);

    this.latestSequence = latestSequence;
    this.latestHash = latest?.hash ?? "genesis";
  }
}

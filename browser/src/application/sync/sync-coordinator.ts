import type { CommandLogRepository, SnapshotRepository } from "../../core/contracts/game-ports";
import type { SyncAdapter } from "../../core/contracts/services";
import type { CommandLogEntry } from "../../core/models/commands";
import type { GameState } from "../../core/models/game-state";
import { validateCommandChain } from "../../core/utils/command-chain";

export interface SyncCoordinatorDeps {
  commandLogRepository: CommandLogRepository;
  snapshotRepository?: SnapshotRepository;
  syncAdapter: SyncAdapter;
  pushBatchLimit?: number;
  pullBatchLimit?: number;
}

export interface SyncCoordinatorReport {
  pushedCommands: number;
  pulledCommands: number;
  localHeadSequence: number;
  localHeadHash: string;
  remoteHeadSequence: number;
  remoteHeadHash: string;
  adoptedRemoteSnapshot: boolean;
}

export interface SyncCoordinatorResult {
  state: GameState;
  report: SyncCoordinatorReport;
}

export class SyncCoordinator {
  private localCursorSequence = 0;
  private localCursorHash = "genesis";

  constructor(private readonly deps: SyncCoordinatorDeps) {}

  async sync(localState: GameState): Promise<SyncCoordinatorResult> {
    const pushBatchLimit = Math.max(1, this.deps.pushBatchLimit ?? 500);
    const pullBatchLimit = Math.max(1, this.deps.pullBatchLimit ?? 500);

    const latestLocal = await this.deps.commandLogRepository.latest();
    const localHeadSequence = latestLocal?.sequence ?? 0;
    const localHeadHash = latestLocal?.hash ?? "genesis";

    const outgoing = await this.collectOutgoingCommands(pushBatchLimit);
    if (outgoing.length > 0) {
      const outgoingValidation = this.validateOutgoing(outgoing);
      if (!outgoingValidation.valid) {
        throw new Error(`Command log local inválido: ${outgoingValidation.issues[0]?.reason ?? "erro desconhecido"}`);
      }

      await this.deps.syncAdapter.pushCommands(outgoing);
      this.localCursorSequence = outgoingValidation.lastSequence;
      this.localCursorHash = outgoingValidation.lastHash;
    }

    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (latestSnapshot) {
        await this.deps.syncAdapter.pushSnapshot(latestSnapshot);
      }
    }

    const pullResult = await this.deps.syncAdapter.pullCommands({
      fromSequence: this.localCursorSequence,
      limit: pullBatchLimit
    });

    const incomingValidation = validateCommandChain(pullResult.entries, {
      startSequence: this.localCursorSequence,
      startHash: this.localCursorHash,
      requireContiguous: true
    });

    if (!incomingValidation.valid) {
      throw new Error(`Command log remoto inválido: ${incomingValidation.issues[0]?.reason ?? "erro desconhecido"}`);
    }

    if (pullResult.entries.length > 0) {
      this.localCursorSequence = incomingValidation.lastSequence;
      this.localCursorHash = incomingValidation.lastHash;
    }

    const remoteSnapshot = await this.deps.syncAdapter.pullLatestSnapshot();
    const mergedState = await this.deps.syncAdapter.merge(localState, remoteSnapshot, pullResult.entries);
    const adoptedRemoteSnapshot = !!remoteSnapshot && mergedState.meta.sessionId !== localState.meta.sessionId;

    return {
      state: mergedState,
      report: {
        pushedCommands: outgoing.length,
        pulledCommands: pullResult.entries.length,
        localHeadSequence,
        localHeadHash,
        remoteHeadSequence: pullResult.latestSequence,
        remoteHeadHash: pullResult.latestHash,
        adoptedRemoteSnapshot
      }
    };
  }

  private async collectOutgoingCommands(limit: number): Promise<CommandLogEntry[]> {
    const collected: CommandLogEntry[] = [];
    let cursor = this.localCursorSequence;

    while (collected.length < limit) {
      const batch = await this.deps.commandLogRepository.listAfter(cursor, Math.min(200, limit - collected.length));
      if (batch.length === 0) {
        break;
      }

      collected.push(...batch);
      cursor = batch[batch.length - 1].sequence;
    }

    return collected;
  }

  private validateOutgoing(entries: CommandLogEntry[]) {
    const first = entries[0];

    if (!first) {
      return {
        valid: true,
        lastSequence: this.localCursorSequence,
        lastHash: this.localCursorHash,
        issues: []
      };
    }

    if (first.sequence === this.localCursorSequence + 1) {
      return validateCommandChain(entries, {
        startSequence: this.localCursorSequence,
        startHash: this.localCursorHash,
        requireContiguous: true
      });
    }

    return validateCommandChain(entries, {
      startSequence: first.sequence - 1,
      startHash: first.previousHash,
      requireContiguous: true
    });
  }
}

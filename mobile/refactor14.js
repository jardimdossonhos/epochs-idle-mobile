const fs = require('fs');

let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

function replaceExact(oldStr, newStr) {
  if (code.includes(oldStr)) {
    code = code.replace(oldStr, newStr);
  } else {
    console.log("NOT FOUND:\n", oldStr);
  }
}

// 1. SnapshotRepository imports
replaceExact(`  SaveSnapshot,
  SnapshotRepository
}`, `  SaveSnapshot\n}`);
replaceExact('import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "../core/models/commands";', 'import type { CommandLogEntry } from "../core/models/commands";');

// 2. Dependencies
replaceExact(`  snapshotRepository?: SnapshotRepository;`, ``);
replaceExact(`  snapshotEveryTicks?: number;`, ``);
replaceExact(`  maxSnapshots?: number;`, ``);

// 3. Properties
replaceExact(`  private ticksSinceAutosave = 0;`, ``);
replaceExact(`  private ticksSinceSnapshot = 0;`, ``);
replaceExact(`  private accumulatedMs = 0;`, `  private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;`);

// 4. start()
replaceExact(`    this.captureSnapshot("bootstrap");`, ``);
replaceExact(`    this.captureSnapshot("manual");`, ``);
replaceExact(`    this.captureSnapshot("autosave");`, ``);
replaceExact(`      const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());`, `      const recovered = persisted ?? (await this.restoreFromLatestSave());`);

replaceExact(`    if (recovered !== null) {
      await this.deps.gameStateRepository.saveCurrent(this.currentState);
    }

    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (!latestSnapshot) {
        await this.deps.snapshotRepository.save(this.buildStateSnapshot("bootstrap", now));
      }
    }`, `    if (recovered !== null) {
      await this.deps.gameStateRepository.saveCurrent(this.currentState);
    }`);

// 5. doCommitAutosave
replaceExact(`    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });
    this.captureSnapshot("autosave");`, `    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.runAutosave();
      }
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });`);

// 6. pumpSimulationQueue
replaceExact(`        this.ticksSinceAutosave += result.ticks;
        this.ticksSinceSnapshot += result.ticks;`, ``);

replaceExact(`        if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {
          this.ticksSinceAutosave = 0;
          this.runAutosave();
        }

        const snapshotEveryTicks = Math.max(1, this.deps.snapshotEveryTicks ?? 25);
        while (this.ticksSinceSnapshot >= snapshotEveryTicks) {
          this.ticksSinceSnapshot -= snapshotEveryTicks;
          this.captureSnapshot("periodic", simNow);
        }`, `        const AUTOSAVE_INTERVAL_MS = 60000;
        const realtimeNow = this.deps.clock.now();
        if (realtimeNow - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = realtimeNow;
          this.runAutosave();
        }`);

// 7. runAutosave
replaceExact(`  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    this.doCommitAutosave();
  }`, `  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    if (this.isSaving) {
      this.saveQueued = true;
      return;
    }
    this.isSaving = true;
    this.doCommitAutosave();
  }`);

// 8. Methods Comment Out (safest way to remove)
// restoreFromSnapshotOrSave
replaceExact(`  private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (latestSnapshot) {
        return structuredClone(latestSnapshot.state);
      }
    }

    return this.restoreFromLatestSave();
  }`, `  /* private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    return this.restoreFromLatestSave();
  } */`);

// buildStateSnapshot
replaceExact(`  private buildStateSnapshot(reason: SnapshotReason, savedAt = this.deps.clock.now()): StateSnapshot {
    const state = this.requireState();

    return {
      id: \`snapshot:\${state.meta.tick}:\${savedAt}:\${reason}\`,
      tick: state.meta.tick,
      savedAt,
      reason,
      commandSequence: this.commandSequence,
      commandHash: this.commandHeadHash,
      stateHash: buildStateHash(state),
      state: structuredClone(state)
    };
  }`, `  /* private buildStateSnapshot */`);

// captureSnapshot
replaceExact(`  private captureSnapshot(reason: SnapshotReason, savedAt = this.deps.clock.now()): void {
    const repository = this.deps.snapshotRepository;
    if (!repository || !this.currentState) {
      return;
    }

    const snapshot = this.buildStateSnapshot(reason, savedAt);
    const maxSnapshots = Math.max(5, this.deps.maxSnapshots ?? 20);

    this.enqueueIo(async () => {
      await repository.save(snapshot);
      await this.pruneSnapshots(repository, maxSnapshots);
    });
  }`, `  /* private captureSnapshot */`);

// pruneSnapshots
replaceExact(`  private async pruneSnapshots(repository: SnapshotRepository, maxSnapshots: number): Promise<void> {
    const entries = await repository.list(maxSnapshots + 20);

    if (entries.length <= maxSnapshots) {
      return;
    }

    for (const stale of entries.slice(maxSnapshots)) {
      await repository.delete(stale.id);
    }
  }`, `  /* private pruneSnapshots */`);


fs.writeFileSync('src/application/game-session.ts', code);
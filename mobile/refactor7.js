const fs = require('fs');
let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

// Imports
code = code.replace(/,\n  SnapshotRepository/, '');
code = code.replace(/,\s*SnapshotRepository/g, '');
code = code.replace('import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "../core/models/commands";', 'import type { CommandLogEntry } from "../core/models/commands";');
code = code.replace(/  snapshotRepository\?:\s*SnapshotRepository;\n/, '');
code = code.replace(/  snapshotEveryTicks\?:\s*number;\n/, '');
code = code.replace(/  maxSnapshots\?:\s*number;\n/, '');

// Ticks counters
code = code.replace(/  private ticksSinceAutosave = 0;\n/, '');
code = code.replace(/  private ticksSinceSnapshot = 0;\n/, '');
code = code.replace(/        this\.ticksSinceAutosave \+= result\.ticks;\n/g, '');
code = code.replace(/        this\.ticksSinceSnapshot \+= result\.ticks;\n/g, '');

// State properties
code = code.replace('private accumulatedMs = 0;', 'private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;');

// pumpSimulationQueue
const pump_old = `        if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {
          this.ticksSinceAutosave = 0;
          this.runAutosave();
        }

        const snapshotEveryTicks = Math.max(1, this.deps.snapshotEveryTicks ?? 25);
        while (this.ticksSinceSnapshot >= snapshotEveryTicks) {
          this.ticksSinceSnapshot -= snapshotEveryTicks;
          this.captureSnapshot("periodic", simNow);
        }`;
const pump_new = `        const AUTOSAVE_INTERVAL_MS = 60000;
        if (now - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = now;
          this.runAutosave();
        }`;
code = code.replace(pump_old, pump_new);

// doCommitAutosave capture removal
code = code.replace(/    this\.captureSnapshot\("autosave"\);\n/, '');

// start() capture and restore removal
code = code.replace(/    this\.captureSnapshot\("bootstrap"\);\n/, '');
code = code.replace(/    this\.captureSnapshot\("manual"\);\n/, '');

const start_old = `      const persisted = await this.deps.gameStateRepository.loadCurrent();
      const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());
      const baseState = recovered ?? initialState;`;
const start_new = `      const persisted = await this.deps.gameStateRepository.loadCurrent();
      const recovered = persisted ?? (await this.restoreFromLatestSave());
      const baseState = recovered ?? initialState;`;
code = code.replace(start_old, start_new);

// Restore old function removal
const restore_old = `  private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (latestSnapshot) {
        return structuredClone(latestSnapshot.state);
      }
    }

    return this.restoreFromLatestSave();
  }`;
code = code.replace(restore_old, `/* private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    return this.restoreFromLatestSave();
  } */`);

// Erase buildStateSnapshot
const build_old = `  private buildStateSnapshot(reason: SnapshotReason, savedAt = this.deps.clock.now()): StateSnapshot {
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
  }`;
code = code.replace(build_old, '');

// Erase captureSnapshot
const capture_old = `  private captureSnapshot(reason: SnapshotReason, savedAt = this.deps.clock.now()): void {
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
  }`;
code = code.replace(capture_old, '');

// Erase pruneSnapshots
const prune_old = `  private async pruneSnapshots(repository: SnapshotRepository, maxSnapshots: number): Promise<void> {
    const entries = await repository.list(maxSnapshots + 20);

    if (entries.length <= maxSnapshots) {
      return;
    }

    for (const stale of entries.slice(maxSnapshots)) {
      await repository.delete(stale.id);
    }
  }`;
code = code.replace(prune_old, '');

// runAutosave debounce
const run_auto_old = `  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    this.doCommitAutosave();
  }`;
const run_auto_new = `  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    if (this.isSaving) {
      this.saveQueued = true;
      return;
    }
    this.isSaving = true;
    this.doCommitAutosave();
  }`;
code = code.replace(run_auto_old, run_auto_new);

// doCommitAutosave debounce finish
const do_commit_old = `    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });`;
const do_commit_new = `    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.runAutosave();
      }
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });`;
code = code.replace(do_commit_old, do_commit_new);

fs.writeFileSync('src/application/game-session.ts', code);
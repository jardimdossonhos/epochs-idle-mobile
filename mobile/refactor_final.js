const fs = require('fs');

let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

// Imports
code = code.replace(/SaveSnapshot,\n  SnapshotRepository\n}/, 'SaveSnapshot\n}');
code = code.replace(/import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "\.\.\/core\/models\/commands";/, 'import type { CommandLogEntry } from "../core/models/commands";');
code = code.replace(/  snapshotRepository\?:\s*SnapshotRepository;\n/g, '');
code = code.replace(/  snapshotEveryTicks\?:\s*number;\n/g, '');
code = code.replace(/  maxSnapshots\?:\s*number;\n/g, '');

// properties
code = code.replace(/  private ticksSinceAutosave = 0;\n/g, '');
code = code.replace(/  private ticksSinceSnapshot = 0;\n/g, '');
code = code.replace('private accumulatedMs = 0;', 'private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;');

// start()
code = code.replace(/    this\.captureSnapshot\("bootstrap"\);\n/g, '');
code = code.replace(/    this\.captureSnapshot\("manual"\);\n/g, '');
code = code.replace(/    this\.captureSnapshot\("autosave"\);\n/g, '');

const start_old = `      const persisted = await this.deps.gameStateRepository.loadCurrent();
      const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());
      const baseState = recovered ?? initialState;`;
const start_new = `      const persisted = await this.deps.gameStateRepository.loadCurrent();
      const recovered = persisted ?? (await this.restoreFromLatestSave());
      const baseState = recovered ?? initialState;`;
code = code.replace(start_old, start_new);

const start_save_old = `    if (recovered !== null) {
      await this.deps.gameStateRepository.saveCurrent(this.currentState);
    }

    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (!latestSnapshot) {
        await this.deps.snapshotRepository.save(this.buildStateSnapshot("bootstrap", now));
      }
    }`;
const start_save_new = `    if (recovered !== null) {
      await this.deps.gameStateRepository.saveCurrent(this.currentState);
    }`;
code = code.replace(start_save_old, start_save_new);

// doCommitAutosave
const docommit_old = `    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });
    this.captureSnapshot("autosave");`;
const docommit_new = `    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.runAutosave();
      }
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });`;
code = code.replace(docommit_old, docommit_new);

// runAutosave
const run_old = `  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    this.doCommitAutosave();
  }`;
const run_new = `  private runAutosave(): void {
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
code = code.replace(run_old, run_new);

// pumpSimulationQueue
code = code.replace(/        this\.ticksSinceAutosave \+= 1;\n/g, '');
code = code.replace(/        this\.ticksSinceSnapshot \+= 1;\n/g, '');
code = code.replace(/        this\.ticksSinceAutosave \+= result\.ticks;\n/g, '');
code = code.replace(/        this\.ticksSinceSnapshot \+= result\.ticks;\n/g, '');

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
        const realtimeNow = this.deps.clock.now();
        if (realtimeNow - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = realtimeNow;
          this.runAutosave();
        }`;
code = code.replace(pump_old, pump_new);

// Erase methods explicitly
code = code.replace(/  private buildStateSnapshot\([\s\S]*?\}\n  \}\n/g, '');
code = code.replace(/  private captureSnapshot\([\s\S]*?\}\n  \}\n/g, '');
code = code.replace(/  private async pruneSnapshots\([\s\S]*?\}\n  \}\n/g, '');
const restore_old = `  private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (latestSnapshot) {
        return structuredClone(latestSnapshot.state);
      }
    }

    return this.restoreFromLatestSave();
  }`;
code = code.replace(restore_old, `  /* private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    return this.restoreFromLatestSave();
  } */`);

fs.writeFileSync('src/application/game-session.ts', code);
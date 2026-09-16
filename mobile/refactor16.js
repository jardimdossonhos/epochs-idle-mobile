const fs = require('fs');
let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

// 1. Imports
code = code.replace(/SaveSnapshot,\r?\n\s*SnapshotRepository\r?\n\}/, 'SaveSnapshot\n}');
code = code.replace(/import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "\.\.\/core\/models\/commands";/, 'import type { CommandLogEntry } from "../core/models/commands";');
code = code.replace(/  snapshotRepository\?:\s*SnapshotRepository;\r?\n/, '');
code = code.replace(/  snapshotEveryTicks\?:\s*number;\r?\n/, '');
code = code.replace(/  maxSnapshots\?:\s*number;\r?\n/, '');

// 2. Properties
code = code.replace(/  private ticksSinceAutosave = 0;\r?\n/, '');
code = code.replace(/  private ticksSinceSnapshot = 0;\r?\n/, '');
code = code.replace(/  private accumulatedMs = 0;/, '  private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;');

// 3. start()
code = code.replace(/    this\.captureSnapshot\("bootstrap"\);\r?\n/, '');
code = code.replace(/    this\.captureSnapshot\("manual"\);\r?\n/, '');
code = code.replace(/    this\.captureSnapshot\("autosave"\);\r?\n/, '');

code = code.replace(/      const recovered = persisted \?\? \(await this\.restoreFromSnapshotOrSave\(\)\);/, '      const recovered = persisted ?? (await this.restoreFromLatestSave());');

const startSaveOld = /    if \(recovered !== null\) \{\r?\n      await this\.deps\.gameStateRepository\.saveCurrent\(this\.currentState\);\r?\n    \}\r?\n\r?\n    if \(this\.deps\.snapshotRepository\) \{\r?\n      const latestSnapshot = await this\.deps\.snapshotRepository\.latest\(\);\r?\n      if \(\!latestSnapshot\) \{\r?\n        await this\.deps\.snapshotRepository\.save\(this\.buildStateSnapshot\("bootstrap", now\)\);\r?\n      \}\r?\n    \}/;
code = code.replace(startSaveOld, `    if (recovered !== null) {
      await this.deps.gameStateRepository.saveCurrent(this.currentState);
    }`);

// 4. doCommitAutosave
const doCommitOld = /    const snapshot = this\.buildSaveSlotSnapshot\(AUTOSAVE_SLOT_ID\);\r?\n    this\.enqueueIo\(async \(\) => \{\r?\n      await this\.deps\.saveRepository\.saveToSlot\(snapshot\);\r?\n    \}\);\r?\n    this\.recordSystemCommand\("save\.autosave", \{ slotId: AUTOSAVE_SLOT_ID \}\);\r?\n    this\.captureSnapshot\("autosave"\);/;
const doCommitNew = `    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.runAutosave();
      }
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });`;
code = code.replace(doCommitOld, doCommitNew);

// 5. pumpSimulationQueue
code = code.replace(/        this\.ticksSinceAutosave \+= result\.ticks;\r?\n/, '');
code = code.replace(/        this\.ticksSinceSnapshot \+= result\.ticks;\r?\n/, '');

const pumpOld = /        if \(this\.ticksSinceAutosave >= \(this\.deps\.autosaveEveryTicks \?\? 300\)\) \{\r?\n          this\.ticksSinceAutosave = 0;\r?\n          this\.runAutosave\(\);\r?\n        \}\r?\n\r?\n        const snapshotEveryTicks = Math\.max\(1, this\.deps\.snapshotEveryTicks \?\? 25\);\r?\n        while \(this\.ticksSinceSnapshot >= snapshotEveryTicks\) \{\r?\n          this\.ticksSinceSnapshot -= snapshotEveryTicks;\r?\n          this\.captureSnapshot\("periodic", simNow\);\r?\n        \}/;
const pumpNew = `        const AUTOSAVE_INTERVAL_MS = 60000;
        const realtimeNow = this.deps.clock.now();
        if (realtimeNow - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = realtimeNow;
          this.runAutosave();
        }`;
code = code.replace(pumpOld, pumpNew);

// 6. runAutosave
const runOld = /  private runAutosave\(\): void \{\r?\n    if \(\!this\.currentState\) \{\r?\n      return;\r?\n    \}\r?\n    this\.doCommitAutosave\(\);\r?\n  \}/;
const runNew = `  private runAutosave(): void {
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
code = code.replace(runOld, runNew);

// 7. Remove methods
// restoreFromSnapshotOrSave
code = code.replace(/  private async restoreFromSnapshotOrSave\(\)[\s\S]*?return this\.restoreFromLatestSave\(\);\r?\n  \}/, `  /* private async restoreFromSnapshotOrSave */`);
// buildStateSnapshot
code = code.replace(/  private buildStateSnapshot\([\s\S]*?structuredClone\(state\)\r?\n    \};\r?\n  \}/, `  /* private buildStateSnapshot */`);
// captureSnapshot
code = code.replace(/  private captureSnapshot\([\s\S]*?this\.pruneSnapshots\(repository, maxSnapshots\);\r?\n    \}\);\r?\n  \}/, `  /* private captureSnapshot */`);
// pruneSnapshots
code = code.replace(/  private async pruneSnapshots\([\s\S]*?await repository\.delete\(stale\.id\);\r?\n    \}\r?\n  \}/, `  /* private pruneSnapshots */`);

fs.writeFileSync('src/application/game-session.ts', code);
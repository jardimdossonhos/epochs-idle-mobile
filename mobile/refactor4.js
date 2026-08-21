const fs = require('fs');
let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

// 1. Imports
code = code.replace(/,\s*SnapshotRepository/g, '');
code = code.replace(/SaveSnapshot,\s*SnapshotRepository/g, 'SaveSnapshot');
code = code.replace(/import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "\.\.\/core\/models\/commands";/, 'import type { CommandLogEntry } from "../core/models/commands";');
code = code.replace(/snapshotRepository\?:\s*SnapshotRepository;/g, '');
code = code.replace(/snapshotEveryTicks\?:\s*number;/g, '');
code = code.replace(/maxSnapshots\?:\s*number;/g, '');

// 2. Ticks counters
code = code.replace(/this\.ticksSinceAutosave \+= result\.ticks;/g, '');
code = code.replace(/this\.ticksSinceSnapshot \+= result\.ticks;/g, '');
code = code.replace(/private ticksSinceAutosave = 0;/g, '');
code = code.replace(/private ticksSinceSnapshot = 0;/g, '');

// 3. New state variables
code = code.replace('private accumulatedMs = 0;', 'private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;');

// 4. In pumpSimulationQueue, replace the snapshot/autosave block
const autosave_old = `        if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {
          this.ticksSinceAutosave = 0;
          this.runAutosave();
        }

        const snapshotEveryTicks = Math.max(1, this.deps.snapshotEveryTicks ?? 25);
        while (this.ticksSinceSnapshot >= snapshotEveryTicks) {
          this.ticksSinceSnapshot -= snapshotEveryTicks;
          this.captureSnapshot("periodic", simNow);
        }`;
const autosave_new = `        const AUTOSAVE_INTERVAL_MS = 60000;
        if (now - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = now;
          this.runAutosave();
        }`;
code = code.replace(autosave_old, autosave_new);

// 5. Replace runAutosave
const runAutosave_old = `  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }

    try {
      // Converte os Float64Arrays para Arrays normais antes de serializar
      // Isso previne o bug onde o F5 corrompe os recursos gerando um objeto vazio {}
      const safeState = structuredClone(this.currentState);`;
      
const runAutosave_new = `  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }

    if (this.isSaving) {
      this.saveQueued = true;
      return;
    }
    this.isSaving = true;

    try {
      // Converte os Float64Arrays para Arrays normais antes de serializar
      // Isso previne o bug onde o F5 corrompe os recursos gerando um objeto vazio {}
      const safeState = structuredClone(this.currentState);`;
code = code.replace(runAutosave_old, runAutosave_new);

const saveCurrent_old = `        await this.deps.gameStateRepository.saveCurrent(safeState);
      });
    }
  } catch (err) {`;
const saveCurrent_new = `        await this.deps.gameStateRepository.saveCurrent(safeState);
        this.isSaving = false;
        if (this.saveQueued) {
          this.saveQueued = false;
          this.runAutosave();
        }
      });
    }
  } catch (err) {
    this.isSaving = false;`;
code = code.replace(saveCurrent_old, saveCurrent_new);

// 6. Fix start()
code = code.replace(/if \(this\.deps\.snapshotRepository\) \{\n\s*const latestSnapshot = await this\.deps\.snapshotRepository\.latest\(\);\n\s*if \(\!latestSnapshot\) \{\n\s*await this\.deps\.snapshotRepository\.save\(this\.buildStateSnapshot\("bootstrap", now\)\);\n\s*\} else \{\n\s*return structuredClone\(latestSnapshot\.state\);\n\s*\}\n\s*\}/, '');
code = code.replace(/this\.captureSnapshot\("bootstrap"\);/g, '');
code = code.replace(/this\.captureSnapshot\("manual"\);/g, '');
code = code.replace(/this\.captureSnapshot\("autosave"\);/g, '');

// 7. Fix restoreFromSnapshotOrSave
code = code.replace(/private async restoreFromSnapshotOrSave\(\): Promise<GameState \| null> \{[\s\S]*?return this\.restoreFromLatestSave\(\);\n  \}/, `private async restoreFromSnapshotOrSave(): Promise<GameState | null> {\n    return this.restoreFromLatestSave();\n  }`);

// 8. Delete buildStateSnapshot, captureSnapshot, pruneSnapshots
const removeBlock = (str, startStr, endStr) => {
  let s = str.indexOf(startStr);
  if (s === -1) return str;
  let e = str.indexOf(endStr, s);
  if (e === -1) return str;
  return str.substring(0, s) + str.substring(e);
};

code = removeBlock(code, 'private buildStateSnapshot(', 'public getReligiousActionConfig');
code = removeBlock(code, 'private captureSnapshot(', 'private async restoreFromSnapshotOrSave');

fs.writeFileSync('src/application/game-session.ts', code);
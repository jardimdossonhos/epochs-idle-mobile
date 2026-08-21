const fs = require('fs');

let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

// 1. Remove SnapshotRepository from imports
code = code.replace(/,\s*SnapshotRepository/g, '');
code = code.replace(/SaveSnapshot,\s*SnapshotRepository/g, 'SaveSnapshot');
code = code.replace(/import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "\.\.\/core\/models\/commands";/, 'import type { CommandLogEntry } from "../core/models/commands";');
code = code.replace(/snapshotRepository\?:\s*SnapshotRepository;/g, '');
code = code.replace(/snapshotEveryTicks\?:\s*number;/g, '');
code = code.replace(/maxSnapshots\?:\s*number;/g, '');

// 2. Fix the loop: remove captureSnapshot and ticksSinceAutosave
code = code.replace(/this\.ticksSinceAutosave \+= result\.ticks;/g, '');
code = code.replace(/this\.ticksSinceSnapshot \+= result\.ticks;/g, '');
code = code.replace(/private ticksSinceAutosave = 0;/g, '');
code = code.replace(/private ticksSinceSnapshot = 0;/g, '');

// Replace the autosave logic in pumpSimulationQueue
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

// 3. Add lastAutosaveAt and isSaving
if (!code.includes('private lastAutosaveAt')) {
  code = code.replace('private accumulatedMs = 0;', 'private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;');
}

// 4. Modify restoreFromSnapshotOrSave to remove snapshotRepository check
const restore_old = `  private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (!latestSnapshot) {
        await this.deps.snapshotRepository.save(this.buildStateSnapshot("bootstrap", now));
      } else {
        return structuredClone(latestSnapshot.state);
      }
    }

    return this.restoreFromLatestSave();
  }`;

// Actually let's just find `restoreFromSnapshotOrSave` and replace the whole block manually if needed.
// Let's use regex for restoreFromSnapshotOrSave
code = code.replace(/private async restoreFromSnapshotOrSave\(\): Promise<GameState \| null> \{[\s\S]*?return this\.restoreFromLatestSave\(\);\n  \}/, `private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    return this.restoreFromLatestSave();
  }`);

// Remove snapshot logic from start()
code = code.replace(/if \(this\.deps\.snapshotRepository\) \{[\s\S]*?this\.buildStateSnapshot\("bootstrap", now\)\);\n\s*\}\n\s*\}/, '');

// Remove captureSnapshot, pruneSnapshots, buildStateSnapshot
code = code.replace(/private buildStateSnapshot\([\s\S]*?\}\n\n  public getReligiousActionConfig/, 'public getReligiousActionConfig');
code = code.replace(/private captureSnapshot\([\s\S]*?\}\n\n  private async pruneSnapshots/, '');
code = code.replace(/private async pruneSnapshots\([\s\S]*?\}\n\n  private async restoreFromSnapshotOrSave/, 'private async restoreFromSnapshotOrSave');

fs.writeFileSync('src/application/game-session.ts', code);
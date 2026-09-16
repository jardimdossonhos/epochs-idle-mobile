const fs = require('fs');
const path = 'src/application/game-session.ts';
let code = fs.readFileSync(path, 'utf8');
let lines = code.split('\n');

const res = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (line.includes('SnapshotRepository')) {
    line = line.replace(/,\s*SnapshotRepository/g, '');
    line = line.replace(/SaveSnapshot,\s*SnapshotRepository/g, 'SaveSnapshot');
    if (line.includes('snapshotRepository?: SnapshotRepository;')) continue;
  }
  if (line.includes('snapshotEveryTicks?: number;')) continue;
  if (line.includes('maxSnapshots?: number;')) continue;
  if (line.includes('private ticksSinceAutosave = 0;')) continue;
  if (line.includes('private ticksSinceSnapshot = 0;')) continue;
  if (line.includes('this.ticksSinceAutosave += result.ticks;')) continue;
  if (line.includes('this.ticksSinceSnapshot += result.ticks;')) continue;
  
  if (line.includes('import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "../core/models/commands";')) {
    line = 'import type { CommandLogEntry } from "../core/models/commands";';
  }
  
  if (line.includes('private accumulatedMs = 0;')) {
    res.push(line);
    res.push('  private lastAutosaveAt = 0;');
    res.push('  private isSaving = false;');
    res.push('  private saveQueued = false;');
    continue;
  }
  
  if (line.includes('const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());')) {
    line = '      const recovered = persisted ?? (await this.restoreFromLatestSave());';
  }
  
  // start() snapshot logic
  if (line.includes('if (this.deps.snapshotRepository) {') && lines[i+1].includes('const latestSnapshot')) {
    i += 7; // skip 8 lines
    continue;
  }
  
  // captureSnapshot usage
  if (line.includes('this.captureSnapshot(')) continue;
  
  // pumpSimulationQueue autosave block
  if (line.includes('if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {')) {
    res.push('        const AUTOSAVE_INTERVAL_MS = 60000;');
    res.push('        if (now - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {');
    res.push('          this.lastAutosaveAt = now;');
    res.push('          this.runAutosave();');
    res.push('        }');
    i += 9; // skip the old autosave and snapshot blocks
    continue;
  }
  
  // runAutosave logic
  if (line.includes('private runAutosave(): void {')) {
    res.push('  private runAutosave(): void {');
    res.push('    if (!this.currentState) return;');
    res.push('    if (this.isSaving) {');
    res.push('      this.saveQueued = true;');
    res.push('      return;');
    res.push('    }');
    res.push('    this.isSaving = true;');
    res.push('    try {');
    res.push('      const safeState = structuredClone(this.currentState);');
    i += 7;
    continue;
  }
  
  // saveCurrent block in runAutosave
  if (line.includes('await this.deps.gameStateRepository.saveCurrent(safeState);') && lines[i+2].includes('} catch (err) {')) {
    res.push(line);
    res.push('        this.isSaving = false;');
    res.push('        if (this.saveQueued) {');
    res.push('          this.saveQueued = false;');
    res.push('          this.runAutosave();');
    res.push('        }');
    res.push('      });');
    res.push('    }');
    res.push('  } catch (err) {');
    res.push('    this.isSaving = false;');
    i += 3;
    continue;
  }
  
  // methods removal
  if (line.includes('private buildStateSnapshot(')) skip = true;
  if (line.includes('private captureSnapshot(')) skip = true;
  if (line.includes('private async pruneSnapshots(')) skip = true;
  if (line.includes('private async restoreFromSnapshotOrSave()')) skip = true;
  
  if (skip && line === '  }') {
    // Check if next method is one we want to keep
    if (lines[i+2] && lines[i+2].includes('public getReligiousActionConfig')) skip = false;
    if (lines[i+2] && lines[i+2].includes('private async restoreFromLatestSave')) skip = false;
    // wait, pruneSnapshots doesn't end before restoreFromLatestSave.
    // The order is:
    // buildStateSnapshot
    // getReligiousActionConfig
    // captureSnapshot
    // pruneSnapshots
    // getSaveSummary
    // buildSaveSlotSnapshot
    if (lines[i+2] && lines[i+2].includes('public getSaveSummary')) skip = false;
    
    // restoreFromSnapshotOrSave
    // restoreFromLatestSave
    
    continue;
  }
  
  if (!skip) {
    res.push(line);
  }
}

fs.writeFileSync(path, res.join('\n'));
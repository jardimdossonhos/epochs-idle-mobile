const fs = require('fs');
let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

// Also remove calls to captureSnapshot
code = code.replace(/this\.captureSnapshot\(.*?\);/g, '');

// Clean up Snapshot usages entirely
let lines = code.split('\n');
let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('private buildSaveSlotSnapshot')) {
    skip = true;
  }
  if (line.includes('private buildStateSnapshot')) {
    skip = true;
  }
  if (line.includes('private captureSnapshot')) {
    skip = true;
  }
  if (line.includes('private async pruneSnapshots')) {
    skip = true;
  }

  // Restore skipping if we reach public getReligiousActionConfig
  if (skip && line.includes('public getReligiousActionConfig')) {
    skip = false;
  }
  
  if (skip && line.includes('private async restoreFromSnapshotOrSave')) {
    skip = false;
  }

  if (!skip) {
    newLines.push(line);
  }
}

code = newLines.join('\n');
fs.writeFileSync('src/application/game-session.ts', code);
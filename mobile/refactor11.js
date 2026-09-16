const fs = require('fs');

let code = fs.readFileSync('src/application/game-session.ts', 'utf8');
let lines = code.split('\n');

let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('private buildStateSnapshot(')) {
    skip = true;
  }
  if (line.includes('private captureSnapshot(')) {
    skip = true;
  }
  if (line.includes('private async pruneSnapshots(')) {
    skip = true;
  }

  if (skip && line === '  }') {
    // Check if next method is public getReligiousActionConfig OR public getSaveSummary
    if (lines[i+2] && lines[i+2].includes('public getReligiousActionConfig')) {
      skip = false;
      continue;
    }
    if (lines[i+2] && lines[i+2].includes('public getSaveSummary')) {
      skip = false;
      continue;
    }
    // Note: pruneSnapshots is directly followed by getSaveSummary
  }

  if (!skip) {
    newLines.push(line);
  }
}

fs.writeFileSync('src/application/game-session.ts', newLines.join('\n'));
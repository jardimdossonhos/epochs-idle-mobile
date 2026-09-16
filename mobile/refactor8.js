const fs = require('fs');
let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

code = code.replace(/snapshotRepository\?:\s*SnapshotRepository;\n/g, '');
code = code.replace(/import type { SnapshotReason, StateSnapshot } from "\.\.\/core\/models\/commands";\n/g, '');
// Since we used /* */ we should probably just actually remove the lines or fix the commented types.
code = code.replace(/\/\* private buildStateSnapshot.*?\*\//gs, '');
code = code.replace(/\/\* private captureSnapshot.*?\*\//gs, '');
code = code.replace(/\/\* private async pruneSnapshots.*?\*\//gs, '');
code = code.replace(/\/\* private async restoreFromSnapshotOrSave.*?\*\//gs, '');

// Also remove from imports if not matched
code = code.replace(/SnapshotReason,\s*/g, '');
code = code.replace(/StateSnapshot/g, '');
code = code.replace(/import type { CommandLogEntry,  } from "\.\.\/core\/models\/commands";/, 'import type { CommandLogEntry } from "../core/models/commands";');

// It's just easier to regex out the leftover signatures that are causing errors.
// Looking at the errors:
// 2975: buildStateSnapshot
// 3021: captureSnapshot
// 3036: pruneSnapshots
// Ah, the block remove failed because of `replace` only replacing the first instance or the regex didn't match.
code = code.replace(/  private buildStateSnapshot\([\s\S]*?\}\n  \}/g, '');
code = code.replace(/  private captureSnapshot\([\s\S]*?\}\n  \}/g, '');
code = code.replace(/  private async pruneSnapshots\([\s\S]*?\}\n  \}/g, '');

fs.writeFileSync('src/application/game-session.ts', code);
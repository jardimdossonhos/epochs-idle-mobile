import re
import sys

with open("src/application/game-session.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Remove SnapshotRepository from imports
code = re.sub(r'\bSnapshotRepository\b,?', '', code)
code = re.sub(r'\bSaveSnapshot\b,?', '', code)
code = re.sub(r'import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "\.\./core/models/commands";', 'import type { CommandLogEntry } from "../core/models/commands";', code)
code = re.sub(r'\bsnapshotRepository\?:.*?;', '', code)
code = re.sub(r'\bsnapshotEveryTicks\?:.*?;', '', code)
code = re.sub(r'\bmaxSnapshots\?:.*?;', '', code)
code = re.sub(r'snapshotRepository:\s*SnapshotRepository;', '', code)

# 2. Fix the loop: remove captureSnapshot and ticksSinceAutosave
code = re.sub(r'this\.ticksSinceAutosave \+= result\.ticks;', '', code)
code = re.sub(r'this\.ticksSinceSnapshot \+= result\.ticks;', '', code)

# Replace the autosave logic in pumpSimulationQueue
autosave_old = r'''if \(this\.ticksSinceAutosave >= \(this\.deps\.autosaveEveryTicks \?\? 300\)\) \{
\s*this\.ticksSinceAutosave = 0;
\s*this\.runAutosave\(\);
\s*\}

\s*const snapshotEveryTicks = Math\.max\(1, this\.deps\.snapshotEveryTicks \?\? 25\);
\s*while \(this\.ticksSinceSnapshot >= snapshotEveryTicks\) \{
\s*this\.ticksSinceSnapshot -= snapshotEveryTicks;
\s*this\.captureSnapshot\("periodic", simNow\);
\s*\}'''

autosave_new = r'''const AUTOSAVE_INTERVAL_MS = 60000;
        if (now - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = now;
          this.runAutosave();
        }'''
code = re.sub(autosave_old, autosave_new, code)

# 3. Add lastAutosaveAt and isSaving
if "private lastAutosaveAt" not in code:
    code = re.sub(r'private accumulatedMs = 0;', 'private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;', code)

# Remove captureSnapshot calls
code = re.sub(r'this\.captureSnapshot\(.*?\);', '', code)

# Remove the methods: captureSnapshot, pruneSnapshots, buildStateSnapshot
code = re.sub(r'private captureSnapshot\(.*?\}\s*\}\s*\}', '', code, flags=re.DOTALL)

# Wait, regex for methods is tricky. Let's do it manually.
with open("src/application/game-session.ts", "w", encoding="utf-8") as f:
    f.write(code)

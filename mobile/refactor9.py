import sys

def remove_method(code, method_name, next_method_name):
    start = code.find(method_name)
    if start == -1: return code
    end = code.find(next_method_name, start)
    if end == -1: return code
    return code[:start] + code[end:]

with open("src/application/game-session.ts", "r", encoding="utf-8") as f:
    code = f.read()

# Replace Imports
code = code.replace("  SaveSnapshot,\n  SnapshotRepository\n}", "  SaveSnapshot\n}")
code = code.replace("import type { CommandLogEntry, SnapshotReason, StateSnapshot } from \"../core/models/commands\";", "import type { CommandLogEntry } from \"../core/models/commands\";")
code = code.replace("  snapshotRepository?: SnapshotRepository;\n", "")
code = code.replace("  snapshotEveryTicks?: number;\n", "")
code = code.replace("  maxSnapshots?: number;\n", "")

# Ticks
code = code.replace("  private ticksSinceAutosave = 0;\n", "")
code = code.replace("  private ticksSinceSnapshot = 0;\n", "")
code = code.replace("        this.ticksSinceAutosave += result.ticks;\n", "")
code = code.replace("        this.ticksSinceSnapshot += result.ticks;\n", "")

# Variables
code = code.replace("private accumulatedMs = 0;", "private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;")

# start
code = code.replace("    this.captureSnapshot(\"bootstrap\");\n", "")
code = code.replace("    this.captureSnapshot(\"manual\");\n", "")
code = code.replace("    this.captureSnapshot(\"autosave\");\n", "")

code = code.replace("const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());", "const recovered = persisted ?? (await this.restoreFromLatestSave());")

# doCommitAutosave
code = code.replace("    this.captureSnapshot(\"autosave\");\n", "")
old_do_commit = """    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });"""
new_do_commit = """    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.runAutosave();
      }
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });"""
code = code.replace(old_do_commit, new_do_commit)

# pumpSimulationQueue
old_pump = """        if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {
          this.ticksSinceAutosave = 0;
          this.runAutosave();
        }

        const snapshotEveryTicks = Math.max(1, this.deps.snapshotEveryTicks ?? 25);
        while (this.ticksSinceSnapshot >= snapshotEveryTicks) {
          this.ticksSinceSnapshot -= snapshotEveryTicks;
          this.captureSnapshot("periodic", simNow);
        }"""
new_pump = """        const AUTOSAVE_INTERVAL_MS = 60000;
        if (now - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = now;
          this.runAutosave();
        }"""
code = code.replace(old_pump, new_pump)

# runAutosave
old_run = """  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    this.doCommitAutosave();
  }"""
new_run = """  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    
    if (this.isSaving) {
      this.saveQueued = true;
      return;
    }
    this.isSaving = true;
    
    this.doCommitAutosave();
  }"""
code = code.replace(old_run, new_run)

# restoreFromSnapshotOrSave
code = code.replace("""  private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (latestSnapshot) {
        return structuredClone(latestSnapshot.state);
      }
    }

    return this.restoreFromLatestSave();
  }""", """  /* private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    return this.restoreFromLatestSave();
  } */""")

# Methods removal
code = remove_method(code, "  private buildStateSnapshot(reason:", "  public getReligiousActionConfig(")
code = remove_method(code, "  private captureSnapshot(reason:", "  public getSaveSummary(")
code = remove_method(code, "  private async pruneSnapshots(", "  public getSaveSummary(")

with open("src/application/game-session.ts", "w", encoding="utf-8") as f:
    f.write(code)

import re

with open("src/application/game-session.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Imports
code = code.replace("  SaveSnapshot,\n  SnapshotRepository\n}", "  SaveSnapshot\n}")
code = code.replace("import type { CommandLogEntry, SnapshotReason, StateSnapshot } from \"../core/models/commands\";", "import type { CommandLogEntry } from \"../core/models/commands\";")
code = re.sub(r'  snapshotRepository\?:\s*SnapshotRepository;\n', '', code)
code = re.sub(r'  snapshotEveryTicks\?:\s*number;\n', '', code)
code = re.sub(r'  maxSnapshots\?:\s*number;\n', '', code)

# 2. Add lastAutosaveAt, isSaving
code = code.replace("private accumulatedMs = 0;", "private accumulatedMs = 0;\n  private lastAutosaveAt = 0;\n  private isSaving = false;\n  private saveQueued = false;")
code = re.sub(r'  private ticksSinceAutosave = 0;\n', '', code)
code = re.sub(r'  private ticksSinceSnapshot = 0;\n', '', code)

# 3. pumpSimulationQueue loop
old_pump = """        this.ticksSinceAutosave += result.ticks;
        this.ticksSinceSnapshot += result.ticks;

        for (const event of result.events) {
          this.deps.eventBus.publish(event);
        }

        this.recordTickCommands(previousTick, result.state.meta.tick, result.events, simNow);
        this.checkCivicUnlocks(result.state);

        if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {
          this.ticksSinceAutosave = 0;
          this.runAutosave();
        }

        const snapshotEveryTicks = Math.max(1, this.deps.snapshotEveryTicks ?? 25);
        while (this.ticksSinceSnapshot >= snapshotEveryTicks) {
          this.ticksSinceSnapshot -= snapshotEveryTicks;
          this.captureSnapshot("periodic", simNow);
        }"""
        
new_pump = """        for (const event of result.events) {
          this.deps.eventBus.publish(event);
        }

        this.recordTickCommands(previousTick, result.state.meta.tick, result.events, simNow);
        this.checkCivicUnlocks(result.state);

        const AUTOSAVE_INTERVAL_MS = 60000;
        if (now - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
          this.lastAutosaveAt = now;
          this.runAutosave();
        }"""
code = code.replace(old_pump, new_pump)

# 4. runAutosave logic
old_runAutosave = """  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }

    try {
      // Converte os Float64Arrays para Arrays normais antes de serializar
      // Isso previne o bug onde o F5 corrompe os recursos gerando um objeto vazio {}
      const safeState = structuredClone(this.currentState);"""

new_runAutosave = """  private runAutosave(): void {
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
      const safeState = structuredClone(this.currentState);"""
code = code.replace(old_runAutosave, new_runAutosave)

old_saveEnd = """        await this.deps.gameStateRepository.saveCurrent(safeState);
      });
    }
  } catch (err) {"""

new_saveEnd = """        await this.deps.gameStateRepository.saveCurrent(safeState);
        this.isSaving = false;
        if (this.saveQueued) {
          this.saveQueued = false;
          this.runAutosave();
        }
      });
    }
  } catch (err) {
    this.isSaving = false;"""
code = code.replace(old_saveEnd, new_saveEnd)

# 5. start() logic
old_start = """  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.isWorkerReady = false; // Trava a engine principal até confirmação do Worker

      const persisted = await this.deps.gameStateRepository.loadCurrent();
      const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());
      const baseState = recovered ?? initialState;"""
      
new_start = """  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.isWorkerReady = false; // Trava a engine principal até confirmação do Worker

      const persisted = await this.deps.gameStateRepository.loadCurrent();
      const recovered = persisted ?? (await this.restoreFromLatestSave());
      const baseState = recovered ?? initialState;"""
code = code.replace(old_start, new_start)

# 6. captureSnapshot calls
code = code.replace('    this.captureSnapshot("bootstrap");\n', '')
code = code.replace('    this.captureSnapshot("manual");\n', '')
code = code.replace('    this.captureSnapshot("autosave");\n', '')

# We will just comment out captureSnapshot, buildStateSnapshot, pruneSnapshots, and restoreFromSnapshotOrSave rather than regex delete, just to be safe.
code = code.replace('private captureSnapshot(reason:', '/* private captureSnapshot(reason:')
code = code.replace('if (entries.length <= maxSnapshots) {\n      return;\n    }\n\n    for (const stale of entries.slice(maxSnapshots)) {\n      await repository.delete(stale.id);\n    }\n  }', 'if (entries.length <= maxSnapshots) {\n      return;\n    }\n\n    for (const stale of entries.slice(maxSnapshots)) {\n      await repository.delete(stale.id);\n    }\n  } */')

code = code.replace('private buildStateSnapshot(reason:', '/* private buildStateSnapshot(reason:')
code = code.replace('state: structuredClone(state)\n    };\n  }', 'state: structuredClone(state)\n    };\n  } */')

code = code.replace('private async restoreFromSnapshotOrSave():', '/* private async restoreFromSnapshotOrSave():')
code = code.replace('return this.restoreFromLatestSave();\n  }', 'return this.restoreFromLatestSave();\n  } */')


with open("src/application/game-session.ts", "w", encoding="utf-8") as f:
    f.write(code)
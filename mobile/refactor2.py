import re

with open("src/application/game-session.ts", "r", encoding="utf-8") as f:
    code = f.read()

# Make runAutosave debounced
old_runAutosave = r'''private runAutosave\(\): void \{
\s*if \(\!this\.currentState\) \{
\s*return;
\s*\}

\s*try \{
\s*// Converte os Float64Arrays para Arrays normais antes de serializar
\s*// Isso previne o bug onde o F5 corrompe os recursos gerando um objeto vazio \{\}
\s*const safeState = structuredClone\(this\.currentState\);'''

new_runAutosave = r'''private runAutosave(): void {
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
      const safeState = structuredClone(this.currentState);'''
code = re.sub(old_runAutosave, new_runAutosave, code)

# Complete the save with finally
old_saveCurrent = r'''await this\.deps\.gameStateRepository\.saveCurrent\(safeState\);
\s*\}\);
\s*\}
\s*\} catch \(err\) \{'''

new_saveCurrent = r'''await this.deps.gameStateRepository.saveCurrent(safeState);
          this.isSaving = false;
          if (this.saveQueued) {
            this.saveQueued = false;
            this.runAutosave();
          }
        });
      }
    } catch (err) {
      this.isSaving = false;'''
code = re.sub(old_saveCurrent, new_saveCurrent, code)

# Remove captureSnapshot block manually by finding its signature
idx = code.find('private captureSnapshot(reason:')
if idx != -1:
    # find the end of the pruneSnapshots method which is right after it
    idx2 = code.find('public getReligiousActionConfig')
    if idx2 != -1:
        # Before getReligiousActionConfig, there's buildStateSnapshot. Let's find getReligiousActionConfig and erase from captureSnapshot to getReligiousActionConfig
        code = code[:idx] + code[idx2:]

# Modify restoreFromSnapshotOrSave
restore_old = r'''private async restoreFromSnapshotOrSave\(\): Promise<GameState \| null> \{
\s*if \(this\.deps\.snapshotRepository\) \{
\s*const latestSnapshot = await this\.deps\.snapshotRepository\.latest\(\);
\s*if \(latestSnapshot\) \{
\s*return structuredClone\(latestSnapshot\.state\);
\s*\}
\s*\}

\s*return this\.restoreFromLatestSave\(\);
\s*\}'''

restore_new = r'''private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    return this.restoreFromLatestSave();
  }'''
code = re.sub(restore_old, restore_new, code)

with open("src/application/game-session.ts", "w", encoding="utf-8") as f:
    f.write(code)

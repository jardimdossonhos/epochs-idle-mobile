import sys

def exact(file_path, old_str, new_str):
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Normalize to avoid \r\n vs \n issues
    code_norm = code.replace("\r\n", "\n")
    old_norm = old_str.replace("\r\n", "\n")
    new_norm = new_str.replace("\r\n", "\n")
    
    if old_norm in code_norm:
        code_norm = code_norm.replace(old_norm, new_norm)
        # Convert back if needed (or just save as \n since typescript/git handles it fine)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(code_norm)
    else:
        print(f"NOT FOUND in {file_path}:\n", old_norm[:100])

# game-ports.ts
gp1 = """export interface SnapshotSummary {
  id: string;
  tick: number;
  savedAt: number;
  reason: SnapshotReason;
  stateHash?: string;
  commandHash?: string;
}"""
exact('src/core/contracts/game-ports.ts', gp1, '')

gp2 = """export interface SnapshotRepository {
  save(snapshot: StateSnapshot): Promise<void>;
  latest(): Promise<StateSnapshot | null>;
  get(id: string): Promise<StateSnapshot | null>;
  list(limit?: number): Promise<SnapshotSummary[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}"""
exact('src/core/contracts/game-ports.ts', gp2, '')

# desktop-file-repositories.ts
exact('src/infrastructure/persistence/desktop-file-repositories.ts', "  SnapshotRepository,\n  SnapshotSummary", "")
exact('src/infrastructure/persistence/desktop-file-repositories.ts', ",\n  SnapshotRepository", "")
exact('src/infrastructure/persistence/desktop-file-repositories.ts', ",\n  SnapshotSummary", "")
# the class is a bit too big for exact string, so I'll use regex carefully
import re
with open('src/infrastructure/persistence/desktop-file-repositories.ts', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')
    # it's the last class in the file
    code = re.sub(r'export class DesktopFileSnapshotRepository[\s\S]*$', '', code)
with open('src/infrastructure/persistence/desktop-file-repositories.ts', 'w', encoding='utf-8') as f:
    f.write(code)

# indexeddb-repositories.ts
exact('src/infrastructure/persistence/indexeddb-repositories.ts', "  SnapshotRepository,\n  SnapshotSummary", "")
exact('src/infrastructure/persistence/indexeddb-repositories.ts', ",\n  SnapshotRepository", "")
exact('src/infrastructure/persistence/indexeddb-repositories.ts', ",\n  SnapshotSummary", "")
with open('src/infrastructure/persistence/indexeddb-repositories.ts', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')
    code = re.sub(r'export class IndexedDbSnapshotRepository[\s\S]*$', '', code)
with open('src/infrastructure/persistence/indexeddb-repositories.ts', 'w', encoding='utf-8') as f:
    f.write(code)

# runtime-persistence.ts
rp = "import { DesktopFileGameStateRepository, DesktopFileSaveRepository, DesktopFileSnapshotRepository } from \"./desktop-file-repositories\";"
rp_new = "import { DesktopFileGameStateRepository, DesktopFileSaveRepository } from \"./desktop-file-repositories\";"
exact('src/infrastructure/persistence/runtime-persistence.ts', rp, rp_new)

rp2 = "import { IndexedDbGameStateRepository, IndexedDbSaveRepository, IndexedDbSnapshotRepository } from \"./indexeddb-repositories\";"
rp2_new = "import { IndexedDbGameStateRepository, IndexedDbSaveRepository } from \"./indexeddb-repositories\";"
exact('src/infrastructure/persistence/runtime-persistence.ts', rp2, rp2_new)

rp3 = "import type { GameStateRepository, SaveRepository, SaveSnapshot, SnapshotRepository } from \"../../core/contracts/game-ports\";"
rp3_new = "import type { GameStateRepository, SaveRepository, SaveSnapshot } from \"../../core/contracts/game-ports\";"
exact('src/infrastructure/persistence/runtime-persistence.ts', rp3, rp3_new)

rp4 = "  snapshotRepository: SnapshotRepository;"
exact('src/infrastructure/persistence/runtime-persistence.ts', rp4, "")
exact('src/infrastructure/persistence/runtime-persistence.ts', "      snapshotRepository: new DesktopFileSnapshotRepository(bridge),\n", "")
exact('src/infrastructure/persistence/runtime-persistence.ts', "      snapshotRepository: new DesktopFileSnapshotRepository(bridge)\n", "")
exact('src/infrastructure/persistence/runtime-persistence.ts', "    snapshotRepository: new IndexedDbSnapshotRepository(campaignId),\n", "")
exact('src/infrastructure/persistence/runtime-persistence.ts', "    snapshotRepository: new IndexedDbSnapshotRepository(campaignId)\n", "")

# commands.ts
exact('src/core/models/commands.ts', "export type SnapshotReason = \"bootstrap\" | \"periodic\" | \"manual\" | \"autosave\" | \"rollback\";", "")
c1 = """export interface StateSnapshot {
  id: string;
  tick: number;
  savedAt: number;
  reason: SnapshotReason;
  state: GameState;
  commandSequence?: number;
  commandHash?: string;
  stateHash?: string;
}"""
exact('src/core/models/commands.ts', c1, "")

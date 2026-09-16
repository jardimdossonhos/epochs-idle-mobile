import re

def rewrite(file, fn):
    with open(file, 'r', encoding='utf-8') as f:
        code = f.read()
    new_code = fn(code)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_code)

def f_ports(c):
    c = re.sub(r'export interface SnapshotSummary [\s\S]*?\}\r?\n\r?\n?', '', c)
    c = re.sub(r'export interface SnapshotRepository [\s\S]*?\}\r?\n', '', c)
    return c
rewrite('src/core/contracts/game-ports.ts', f_ports)

def f_desktop(c):
    c = re.sub(r',\s*SnapshotRepository', '', c)
    c = re.sub(r',\s*SnapshotSummary', '', c)
    c = re.sub(r'export class DesktopFileSnapshotRepository implements SnapshotRepository [\s\S]*$', '', c)
    return c
rewrite('src/infrastructure/persistence/desktop-file-repositories.ts', f_desktop)

def f_idb(c):
    c = re.sub(r',\s*SnapshotRepository', '', c)
    c = re.sub(r',\s*SnapshotSummary', '', c)
    c = re.sub(r'export class IndexedDbSnapshotRepository implements SnapshotRepository [\s\S]*$', '', c)
    return c
rewrite('src/infrastructure/persistence/indexeddb-repositories.ts', f_idb)

def f_runtime(c):
    c = re.sub(r',\s*DesktopFileSnapshotRepository', '', c)
    c = re.sub(r',\s*IndexedDbSnapshotRepository', '', c)
    c = re.sub(r',\s*SnapshotRepository', '', c)
    c = re.sub(r'snapshotRepository:\s*SnapshotRepository;\r?\n', '', c)
    c = re.sub(r'snapshotRepository:\s*new DesktopFileSnapshotRepository\(bridge\),?\r?\n', '', c)
    c = re.sub(r'snapshotRepository:\s*new IndexedDbSnapshotRepository\(campaignId\),?\r?\n', '', c)
    return c
rewrite('src/infrastructure/persistence/runtime-persistence.ts', f_runtime)

def f_commands(c):
    c = re.sub(r'export type SnapshotReason = [\s\S]*?;\r?\n', '', c)
    c = re.sub(r'export interface StateSnapshot [\s\S]*?\}\r?\n', '', c)
    return c
rewrite('src/core/models/commands.ts', f_commands)

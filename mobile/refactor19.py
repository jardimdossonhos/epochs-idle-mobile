import re

def rewrite(file, fn):
    with open(file, 'r', encoding='utf-8') as f:
        code = f.read()
    new_code = fn(code)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_code)

def f_gs(c):
    return re.sub(r',\s*SnapshotRepository', '', c)
rewrite('src/application/game-session.ts', f_gs)

def f_sync(c):
    c = re.sub(r'snapshotRepository:\s*SnapshotRepository;?\r?\n', '', c)
    c = re.sub(r',\s*SnapshotRepository', '', c)
    return c
rewrite('src/application/sync/sync-coordinator.ts', f_sync)

def f_ports(c):
    return re.sub(r',\s*StateSnapshot', '', c)
rewrite('src/core/contracts/game-ports.ts', f_ports)

def f_serv(c):
    return re.sub(r',\s*StateSnapshot', '', c)
rewrite('src/core/contracts/services.ts', f_serv)

def f_cmd(c):
    return re.sub(r'\s*reason:\s*SnapshotReason;\r?\n', '', c)
rewrite('src/core/models/commands.ts', f_cmd)

def f_schema(c):
    return re.sub(r',\s*StateSnapshot', '', c)
rewrite('src/infrastructure/persistence/command-snapshot-schema.ts', f_schema)

def f_desktop(c):
    return re.sub(r',\s*StateSnapshot', '', c)
rewrite('src/infrastructure/persistence/desktop-file-repositories.ts', f_desktop)

def f_idb(c):
    return re.sub(r',\s*StateSnapshot', '', c)
rewrite('src/infrastructure/persistence/indexeddb-repositories.ts', f_idb)

def f_run(c):
    c = re.sub(r'snapshotRepository: new IndexedDbSnapshotRepository\(campaignId\),?\r?\n', '', c)
    c = re.sub(r'snapshotRepository: new DesktopFileSnapshotRepository\(bridge\),?\r?\n', '', c)
    return c
rewrite('src/infrastructure/persistence/runtime-persistence.ts', f_run)

def f_adapter(c):
    c = re.sub(r',\s*StateSnapshot', '', c)
    c = re.sub(r'public async downloadSnapshot[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'public async uploadSnapshot[\s\S]*?\}\r?\n', '', c)
    return c
rewrite('src/infrastructure/sync/local-sync-adapter.ts', f_adapter)

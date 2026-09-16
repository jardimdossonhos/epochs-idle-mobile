import re

def rewrite(file, fn):
    with open(file, 'r', encoding='utf-8') as f:
        code = f.read()
    new_code = fn(code)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_code)

def f_sync(c):
    c = re.sub(r'\s*snapshotRepository:\s*SnapshotRepository;?\r?\n?', '', c)
    return c
rewrite('src/application/sync/sync-coordinator.ts', f_sync)

def f_serv(c):
    c = re.sub(r'\s*uploadSnapshot[\s\S]*?;\r?\n?', '', c)
    c = re.sub(r'\s*downloadSnapshot[\s\S]*?;\r?\n?', '', c)
    c = re.sub(r'\s*listSnapshots[\s\S]*?;\r?\n?', '', c)
    c = re.sub(r'\s*processPeerSnapshot[\s\S]*?;\r?\n?', '', c)
    return c
rewrite('src/core/contracts/services.ts', f_serv)

def f_schema(c):
    c = re.sub(r'export const SnapshotSchema[\s\S]*?\}\);\r?\n', '', c)
    c = re.sub(r'export function serializeSnapshot[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'export function deserializeSnapshot[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'\s*reason: raw\.reason,?\r?\n', '', c)
    c = re.sub(r'\s*reason: snap\.reason,?\r?\n', '', c)
    return c
rewrite('src/infrastructure/persistence/command-snapshot-schema.ts', f_schema)

def f_run(c):
    c = re.sub(r'\s*snapshotRepository:\s*new\s*IndexedDbSnapshotRepository\([\s\S]*?\),?\r?\n?', '', c)
    return c
rewrite('src/infrastructure/persistence/runtime-persistence.ts', f_run)

def f_adapter(c):
    c = re.sub(r'\s*public async downloadSnapshot[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'\s*public async uploadSnapshot[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'\s*public async listSnapshots[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'\s*public async processPeerSnapshot[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'async getSnapshots\(campaignId: string\): Promise<StateSnapshot\[\]> \{\r?\n\s*return \[\];\r?\n\s*\}', '', c)
    c = re.sub(r'async getSnapshot\(campaignId: string, id: string\): Promise<StateSnapshot \| null> \{\r?\n\s*return null;\r?\n\s*\}', '', c)
    c = re.sub(r'public async getSnapshots[\s\S]*?\}\r?\n', '', c)
    c = re.sub(r'public async getSnapshot[\s\S]*?\}\r?\n', '', c)
    # The TS error also said line 17 error TS2743: No overload expects 1 type arguments... I'll just clear this out if it's there
    return c
rewrite('src/infrastructure/sync/local-sync-adapter.ts', f_adapter)

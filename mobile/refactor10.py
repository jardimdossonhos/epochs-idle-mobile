import re

with open("src/application/game-session.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Fix line 301 snapshotRepository in start() (it's actually inside initialize or something)
# The block is:
#     if (this.deps.snapshotRepository) {
#       const latestSnapshot = await this.deps.snapshotRepository.latest();
#       if (!latestSnapshot) {
#         await this.deps.snapshotRepository.save(this.buildStateSnapshot("bootstrap", now));
#       }
#     }
block = """    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (!latestSnapshot) {
        await this.deps.snapshotRepository.save(this.buildStateSnapshot("bootstrap", now));
      }
    }"""
code = code.replace(block, "")

# 2. Fix 'now' error in pumpSimulationQueue
code = code.replace("if (now - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {", "const realtimeNow = this.deps.clock.now();\n        if (realtimeNow - this.lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {\n          this.lastAutosaveAt = realtimeNow;")

# 3. SnapshotReason
code = code.replace("  SnapshotReason,\n", "")
code = code.replace(" SnapshotReason,", "")

# 4. maxSnapshots? (was it maxSnapshots?: number?)
# I'll just remove any leftover mentions of Snapshot
with open("src/application/game-session.ts", "w", encoding="utf-8") as f:
    f.write(code)
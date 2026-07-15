"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySnapshotRepository = exports.MemoryCommandLogRepository = exports.MemorySaveRepository = exports.MemoryGameStateRepository = void 0;
class MemoryGameStateRepository {
    state = null;
    async saveCurrent(state) { this.state = state; }
    async loadCurrent() { return this.state; }
    async clearCurrent() { this.state = null; }
    saveCurrentSync(state) { this.state = state; }
    loadCurrentSync() { return this.state; }
    clearCurrentSync() { this.state = null; }
}
exports.MemoryGameStateRepository = MemoryGameStateRepository;
class MemorySaveRepository {
    slots = new Map();
    async saveToSlot(snapshot) { this.slots.set(snapshot.summary.slotId, snapshot); }
    async loadFromSlot(slotId) { return this.slots.get(slotId) || null; }
    async listSlots() { return Array.from(this.slots.values()).map(s => s.summary); }
    async deleteSlot(slotId) { this.slots.delete(slotId); }
}
exports.MemorySaveRepository = MemorySaveRepository;
class MemoryCommandLogRepository {
    logs = [];
    async append(entries) { this.logs.push(...entries); }
    async latest() { return this.logs.length > 0 ? this.logs[this.logs.length - 1] : null; }
    async listAfter(sequence, limit) {
        return this.logs.filter(l => l.sequence > sequence).slice(0, limit);
    }
    async clear() { this.logs = []; }
}
exports.MemoryCommandLogRepository = MemoryCommandLogRepository;
class MemorySnapshotRepository {
    snaps = [];
    async save(snapshot) { this.snaps.push(snapshot); }
    async latest() { return this.snaps.length > 0 ? this.snaps[this.snaps.length - 1] : null; }
    async load(snapshotId) {
        return this.snaps.find(s => s.id === snapshotId) || null;
    }
    async list(limit) {
        const list = this.snaps.map(s => ({
            id: s.id,
            tick: s.tick,
            savedAt: s.savedAt,
            reason: s.reason,
            commandSequence: s.commandSequence,
            commandHash: s.commandHash,
            stateHash: s.stateHash
        }));
        return limit ? list.slice(0, limit) : list;
    }
    async delete(snapshotId) {
        this.snaps = this.snaps.filter(s => s.id !== snapshotId);
    }
    async getLatestBefore(sequence) {
        const valid = this.snaps.filter(s => s.commandSequence <= sequence);
        return valid.length > 0 ? valid[valid.length - 1] : null;
    }
    async clear() { this.snaps = []; }
}
exports.MemorySnapshotRepository = MemorySnapshotRepository;

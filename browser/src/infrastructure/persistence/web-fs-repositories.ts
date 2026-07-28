import { openDB } from 'idb';
import type {
  GameStateRepository,
  SaveRepository,
  SaveSlotId,
  SaveSnapshot,
  SaveSummary
} from "../../core/contracts/game-ports";
import type { GameState } from "../../core/models/game-state";

const DB_NAME = 'epochs-settings';
const STORE_NAME = 'fs-handles';

export async function saveDirectoryHandle(handle: any): Promise<void> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) { db.createObjectStore(STORE_NAME); }
  });
  await db.put(STORE_NAME, handle, 'save-folder');
}

export async function loadDirectoryHandle(): Promise<any | null> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) { db.createObjectStore(STORE_NAME); }
  });
  return (await db.get(STORE_NAME, 'save-folder')) || null;
}

export async function clearDirectoryHandle(): Promise<void> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) { db.createObjectStore(STORE_NAME); }
  });
  await db.delete(STORE_NAME, 'save-folder');
}

async function writeJson(dirHandle: any, filename: string, data: any) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data));
  await writable.close();
}

async function readJson(dirHandle: any, filename: string): Promise<any | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function deleteFile(dirHandle: any, filename: string) {
  try {
    await dirHandle.removeEntry(filename);
  } catch {}
}

export class WebFsGameStateRepository implements GameStateRepository {
  constructor(private dirHandle: any) {}
  
  async loadCurrent(): Promise<GameState | null> { return readJson(this.dirHandle, `current_state.json`); }
  async saveCurrent(state: GameState): Promise<void> { await writeJson(this.dirHandle, `current_state.json`, state); }
  async clearCurrent(): Promise<void> { await deleteFile(this.dirHandle, `current_state.json`); }
  saveCurrentSync(state: GameState): void { this.saveCurrent(state).catch(console.error); }
  loadCurrentSync(): GameState | null { return null; }
  clearCurrentSync(): void { this.clearCurrent().catch(console.error); }
}

export class WebFsSaveRepository implements SaveRepository {
  constructor(private dirHandle: any) {}

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    await writeJson(this.dirHandle, `save_${snapshot.summary.slotId}.json`, snapshot);
  }
  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    return readJson(this.dirHandle, `save_${slotId}.json`);
  }
  async listSlots(): Promise<SaveSummary[]> {
    const summaries: SaveSummary[] = [];
    for await (const entry of this.dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(`save_`) && entry.name.endsWith('.json')) {
        const snap = await readJson(this.dirHandle, entry.name);
        if (snap && snap.summary) summaries.push(snap.summary);
      }
    }
    return summaries.sort((a, b) => b.savedAt - a.savedAt);
  }
  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    await deleteFile(this.dirHandle, `save_${slotId}.json`);
  }
}
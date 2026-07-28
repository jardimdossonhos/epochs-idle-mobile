import { GameState } from '../../core/models/game-state';
import { GameStateRepository, SaveRepository, SaveSlotId, SaveSnapshot, SaveSummary } from '../../core/contracts/game-ports';
import { migrateStateToCurrent } from './save-schema';

export interface StorageProvider {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  delete(key: string): void;
  getAllKeys(): string[];
  contains(key: string): boolean;
}

export class MobileGameStateRepository implements GameStateRepository {
  private readonly KEY = 'epochs_idle_current';

  constructor(private storage: StorageProvider) {}

  async loadCurrent(): Promise<GameState | null> {
    const data = this.storage.getString(this.KEY);
    if (!data) return null;
    try {
      const state = JSON.parse(data) as GameState;
      return migrateStateToCurrent(state);
    } catch(e) {
      return null;
    }
  }

  async saveCurrent(state: GameState): Promise<void> {
    this.storage.set(this.KEY, JSON.stringify(state));
  }

  async clearCurrent(): Promise<void> {
    this.storage.delete(this.KEY);
  }

  saveCurrentSync(state: GameState): void {
    this.storage.set(this.KEY, JSON.stringify(state));
  }

  loadCurrentSync(): GameState | null {
    const data = this.storage.getString(this.KEY);
    if (!data) return null;
    try {
      const state = JSON.parse(data) as GameState;
      return migrateStateToCurrent(state);
    } catch(e) {
      return null;
    }
  }

  clearCurrentSync(): void {
    this.storage.delete(this.KEY);
  }
}


export class MobileSaveRepository implements SaveRepository {
  constructor(private storage: StorageProvider) {}

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    const slotId = snapshot.summary.slotId;
    this.storage.set(`save_${slotId}`, JSON.stringify(snapshot));
  }

  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    const data = this.storage.getString(`save_${slotId}`);
    if (!data) return null;
    try {
      return JSON.parse(data) as SaveSnapshot;
    } catch (e) {
      return null;
    }
  }

  async listSlots(): Promise<SaveSummary[]> {
    const keys = this.storage.getAllKeys();
    const summaries: SaveSummary[] = [];
    for (const key of keys) {
      if (key.startsWith('save_')) {
        const data = this.storage.getString(key);
        if (data) {
          try {
            const snap = JSON.parse(data) as SaveSnapshot;
            summaries.push(snap.summary);
          } catch(e) {}
        }
      }
    }
    return summaries;
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    this.storage.delete(`save_${slotId}`);
  }
}



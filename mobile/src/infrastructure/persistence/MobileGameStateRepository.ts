import * as FileSystem from 'expo-file-system/legacy';
import { GameState } from '../../core/models/game-state';
import { GameStateRepository, SaveRepository, SaveSlotId, SaveSnapshot, SaveSummary } from '../../core/contracts/game-ports';
import { migrateStateToCurrent } from './save-schema';

export class MobileGameStateRepository implements GameStateRepository {
  private readonly FILE_URI = FileSystem.documentDirectory + 'epochs_idle_current.json';

  async loadCurrent(): Promise<GameState | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.FILE_URI);
      if (!fileInfo.exists) return null;
      const jsonValue = await FileSystem.readAsStringAsync(this.FILE_URI);
      const state = JSON.parse(jsonValue) as GameState;
      return migrateStateToCurrent(state);
    } catch (e) {
      console.error("[MobileGameStateRepository] Failed to load current game state", e);
      return null;
    }
  }

  async saveCurrent(state: GameState): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(this.FILE_URI, JSON.stringify(state));
    } catch (e) {
      console.error("[MobileGameStateRepository] Failed to save current game state", e);
    }
  }

  async clearCurrent(): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.FILE_URI);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(this.FILE_URI);
      }
    } catch (e) {}
  }

  saveCurrentSync(state: GameState): void {
    this.saveCurrent(state).catch(e => console.error("Sync save failed", e));
  }

  loadCurrentSync(): GameState | null { return null; }

  clearCurrentSync(): void {
    FileSystem.deleteAsync(this.FILE_URI).catch(e => console.error("Sync delete failed", e));
  }
}

export class MobileSaveRepository implements SaveRepository {
  private getUriForSlot(slotId: SaveSlotId): string {
    return FileSystem.documentDirectory + `epochs_save_${slotId}.json`;
  }

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    try {
      const uri = this.getUriForSlot(snapshot.summary.slotId);
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(snapshot));
      console.log(`[MobileSaveRepository] Saved slot ${snapshot.summary.slotId}`);
    } catch (e) {
      console.error(`[MobileSaveRepository] Failed to save slot ${snapshot.summary.slotId}`, e);
    }
  }

  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    try {
      const uri = this.getUriForSlot(slotId);
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) return null;
      const jsonValue = await FileSystem.readAsStringAsync(uri);
      const parsed = JSON.parse(jsonValue) as SaveSnapshot;
      return {
        ...parsed,
        state: migrateStateToCurrent(parsed.state)
      };
    } catch (e) {
      console.error(`[MobileSaveRepository] Failed to load slot ${slotId}`, e);
      return null;
    }
  }

  async listSlots(): Promise<SaveSummary[]> {
    const slots: SaveSummary[] = [];
    // Checar cada slot id que conhecemos
    const knownSlots: SaveSlotId[] = ["auto-1", "manual-1", "manual-2", "manual-3"];
    
    for (const slotId of knownSlots) {
      try {
        const uri = this.getUriForSlot(slotId);
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          const jsonValue = await FileSystem.readAsStringAsync(uri);
          const snapshot = JSON.parse(jsonValue) as SaveSnapshot;
          slots.push(snapshot.summary);
        }
      } catch (e) {
        console.error(`[MobileSaveRepository] Corrupt slot ${slotId}`, e);
      }
    }
    
    return slots.sort((a, b) => b.savedAt - a.savedAt);
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    try {
      const uri = this.getUriForSlot(slotId);
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (e) {
      console.error(`[MobileSaveRepository] Failed to delete slot ${slotId}`, e);
    }
  }
}

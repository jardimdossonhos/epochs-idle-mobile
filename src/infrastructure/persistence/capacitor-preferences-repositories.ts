import { Preferences } from '@capacitor/preferences';
import type {
  GameStateRepository,
  SaveRepository,
  SaveSlotId,
  SaveSnapshot,
  SaveSummary
} from "../../core/contracts/game-ports";
import type { GameState } from "../../core/models/game-state";
import {
  createCurrentStateEnvelope,
  normalizeCurrentStateEnvelope,
  normalizeSaveEnvelope,
  toSaveEnvelope
} from "./save-schema";

export class CapacitorPreferencesGameStateRepository implements GameStateRepository {
  private readonly key: string;

  constructor(campaignId: string) {
    this.key = `campaign:${campaignId}:current`;
  }

  async loadCurrent(): Promise<GameState | null> {
    try {
      const { value } = await Preferences.get({ key: this.key });
      if (!value) {
        return null;
      }

      const envelope = JSON.parse(value);
      const normalized = normalizeCurrentStateEnvelope(envelope);

      if (!normalized) {
        await Preferences.remove({ key: this.key });
        return null;
      }

      if (envelope.schemaVersion !== normalized.schemaVersion) {
        await Preferences.set({ key: this.key, value: JSON.stringify(normalized) });
      }

      return normalized.state;
    } catch (e) {
      console.error("Failed to load GameState from Capacitor Preferences", e);
      return null;
    }
  }

  async saveCurrent(state: GameState): Promise<void> {
    try {
      const envelope = createCurrentStateEnvelope(state);
      await Preferences.set({ key: this.key, value: JSON.stringify(envelope) });
    } catch (e) {
      console.error("Failed to save GameState to Capacitor Preferences", e);
    }
  }

  async clearCurrent(): Promise<void> {
    await Preferences.remove({ key: this.key });
  }

  saveCurrentSync(state: GameState): void {
    // Sync doesn't work with Capacitor Preferences as it's purely async.
    // We fall back to localStorage just for the rare sync cases (like window unload),
    // which might not even trigger on Android.
    try {
      const envelope = createCurrentStateEnvelope(state);
      localStorage.setItem(this.key, JSON.stringify(envelope));
    } catch (error) {
      console.error("Failed to save state to localStorage fallback", error);
    }
  }

  loadCurrentSync(): GameState | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return null;
      }
      const envelope = JSON.parse(raw);
      const normalized = normalizeCurrentStateEnvelope(envelope);
      return normalized?.state ?? null;
    } catch (error) {
      console.error("Failed to load state from localStorage fallback", error);
      return null;
    }
  }

  clearCurrentSync(): void {
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error("Failed to clear state from localStorage fallback", error);
    }
  }
}

export class CapacitorPreferencesSaveRepository implements SaveRepository {
  private readonly prefix: string;

  constructor(campaignId: string) {
    this.prefix = `campaign:${campaignId}:`;
  }

  private toPrefixedKey(slotId: SaveSlotId): string {
    return `${this.prefix}${slotId}`;
  }

  async listSlots(): Promise<SaveSummary[]> {
    try {
      const { keys } = await Preferences.keys();
      const saveKeys = keys.filter(k => k.startsWith(this.prefix) && !k.endsWith(":current"));
      
      const summaries: SaveSummary[] = [];

      for (const key of saveKeys) {
        const { value } = await Preferences.get({ key });
        if (value) {
          try {
            const envelope = JSON.parse(value);
            const normalized = normalizeSaveEnvelope(envelope);
            if (normalized) {
              summaries.push(normalized.snapshot.summary);
            }
          } catch (e) {
             console.warn("Corrupt save skipped in listSlots", key);
          }
        }
      }

      return summaries.sort((a, b) => b.savedAt - a.savedAt);
    } catch (e) {
      console.error("Failed to list slots from Capacitor Preferences", e);
      return [];
    }
  }

  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    try {
      const key = this.toPrefixedKey(slotId);
      const { value } = await Preferences.get({ key });
      if (!value) return null;

      const envelope = JSON.parse(value);
      const normalized = normalizeSaveEnvelope(envelope);

      if (!normalized) {
        await Preferences.remove({ key });
        return null;
      }

      if (envelope.schemaVersion !== normalized.schemaVersion) {
        await Preferences.set({ key, value: JSON.stringify(normalized) });
      }

      return normalized.snapshot;
    } catch (e) {
      console.error("Failed to load from slot from Capacitor Preferences", e);
      return null;
    }
  }

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    try {
      const key = this.toPrefixedKey(snapshot.summary.slotId);
      const envelope = toSaveEnvelope(snapshot);
      await Preferences.set({ key, value: JSON.stringify(envelope) });
    } catch (e) {
      console.error("Failed to save to slot in Capacitor Preferences", e);
    }
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    try {
      const key = this.toPrefixedKey(slotId);
      await Preferences.remove({ key });
    } catch (e) {
      console.error("Failed to delete slot from Capacitor Preferences", e);
    }
  }
}

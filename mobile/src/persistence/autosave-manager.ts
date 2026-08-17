import { GameState } from "../core/models/game-state";
import { GameStateRepository } from "../core/contracts/game-ports";

export class AutosaveManager {
  private repository: GameStateRepository;
  private dirty = false;
  private saving = false;
  private lastSaveAt = 0;
  private readonly debounceMs = 30000; // 30 seconds debounce
  private timeoutId: NodeJS.Timeout | null = null;
  private currentStateRef: GameState | null = null;

  constructor(repository: GameStateRepository) {
    this.repository = repository;
  }

  public markDirty(state: GameState): void {
    this.dirty = true;
    this.currentStateRef = state;
    
    // Auto-schedule save
    if (!this.timeoutId) {
      const now = Date.now();
      const timeSinceLastSave = now - this.lastSaveAt;
      
      if (timeSinceLastSave >= this.debounceMs) {
        this.scheduleImmediate();
      } else {
        const delay = this.debounceMs - timeSinceLastSave;
        this.timeoutId = setTimeout(() => this.executeSave(), delay);
      }
    }
  }

  public async forceCheckpoint(state: GameState): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    this.currentStateRef = state;
    this.dirty = true;
    await this.executeSave();
  }

  private scheduleImmediate(): void {
    this.timeoutId = setTimeout(() => this.executeSave(), 0);
  }

  private async executeSave(): Promise<void> {
    this.timeoutId = null;

    if (!this.dirty || this.saving || !this.currentStateRef) {
      return;
    }

    try {
      this.saving = true;
      // Capture a shallow clone with essential deep parts to avoid blocking main thread long
      // Although `saveCurrent` likely serializes it. We pass the reference.
      const stateToSave = this.currentStateRef;
      await this.repository.saveCurrent(stateToSave);
      
      this.dirty = false;
      this.lastSaveAt = Date.now();
    } catch (error) {
      console.error("[AutosaveManager] Failed to save state:", error);
      // Keep dirty true to retry later
    } finally {
      this.saving = false;
    }
  }
}

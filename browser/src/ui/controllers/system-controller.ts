import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";

export class SystemTabController extends BaseTabController {
  constructor() {
    super("configuracoes");
  }

  update(state: GameState): void {
    if (this.refs.offlineProgressionToggle) {
      this.refs.offlineProgressionToggle.checked = state.meta.offlineProgression ?? false;
    }
    if (this.refs.immortalityToggle) {
      this.refs.immortalityToggle.checked = state.meta.immortalityEnabled ?? false;
    }
  }

  protected setupEventListeners(): void {
    if (this.refs.offlineProgressionToggle) {
      this.refs.offlineProgressionToggle.addEventListener("change", () => {
        this.session.setOfflineProgression(this.refs.offlineProgressionToggle.checked);
      });
    }

    if (this.refs.immortalityToggle) {
      this.refs.immortalityToggle.addEventListener("change", () => {
        this.session.setImmortalityEnabled(this.refs.immortalityToggle.checked);
      });
    }

    // Nota: Botões de Hard Reset e Save Manual são geridos globalmente 
    // ou podem ser migrados para cá futuramente
  }
}

import { BaseTabController } from "./base-controller";
import type { GameSession } from "../../application/game-session";
import type { GameState } from "../../core/models/game-state";

export class ProgressionTabController extends BaseTabController {
  constructor(session: GameSession) {
    super("progressao");
    this.session = session;
  }

  protected setupEventListeners(): void {
    // Sem listeners dedicados por enquanto.
  }

  public update(_state: GameState): void {
    this.updateProgressionDisplay();
  }

  private updateProgressionDisplay(): void {
    this.updateEraProgression();
    this.updateFeatureAvailability();
  }

  private updateEraProgression(): void {
    const state = this.session.getState();
    const player = Object.values(state.kingdoms).find((kingdom) => kingdom.isPlayer);
    const totalPopulation = player?.population.total ?? 0;

    const solarEraThreshold = 50000;
    const stellarEraThreshold = 500000;
    const cosmicEraThreshold = 5000000;

    this.updateEraCondition("solar-era-condition", totalPopulation, solarEraThreshold);
    this.updateEraCondition("stellar-era-condition", totalPopulation, stellarEraThreshold);
    this.updateEraCondition("cosmic-era-condition", totalPopulation, cosmicEraThreshold);
    this.checkEraUnlocks(totalPopulation);
  }

  private updateEraCondition(conditionId: string, current: number, target: number): void {
    const element = document.getElementById(conditionId);
    if (!element) {
      return;
    }

    const progress = Math.min((current / target) * 100, 100);
    element.textContent = `Alcance ${target.toLocaleString()} habitantes totais no imperio (${current.toLocaleString()} / ${target.toLocaleString()})`;

    if (progress >= 100) {
      element.classList.add("condition-met");
    } else {
      element.classList.remove("condition-met");
    }
  }

  private checkEraUnlocks(totalPopulation: number): void {
    if (totalPopulation >= 50000) {
      this.unlockEra("solar-era");
    }

    if (totalPopulation >= 500000) {
      this.unlockEra("stellar-era");
    }

    if (totalPopulation >= 5000000) {
      this.unlockEra("cosmic-era");
    }
  }

  private unlockEra(eraId: string): void {
    const eraElement = document.getElementById(eraId);
    if (!eraElement || eraElement.classList.contains("unlocked")) {
      return;
    }

    eraElement.classList.remove("locked");
    eraElement.classList.add("unlocked");

    const statusElement = eraElement.querySelector(".era-status") as HTMLElement | null;
    if (statusElement) {
      statusElement.textContent = "Desbloqueado";
      statusElement.style.color = "#4ade80";
    }
  }

  private updateFeatureAvailability(): void {
    const state = this.session.getState();
    const player = Object.values(state.kingdoms).find((kingdom) => kingdom.isPlayer);
    const totalPopulation = player?.population.total ?? 0;

    const solarFeaturesUnlocked = totalPopulation >= 50000;
    this.updateTabState("diplomacia", solarFeaturesUnlocked, "Disponivel na Era Solar");
    this.updateTabState("militar", solarFeaturesUnlocked, "Disponivel na Era Solar");
    this.updateTabState("religiao", solarFeaturesUnlocked, "Disponivel na Era Solar");

    // O registro de eventos ja existe na campanha atual e precisa permanecer acessivel
    // para leitura de cadeias ativas, guerras, pesquisas e diagnostico do jogador.
    this.updateTabState("eventos", true, "");

    this.updateTabState("conselho", false, "Em desenvolvimento - disponivel em futuras eras");
  }

  private updateTabState(tabName: string, isAvailable: boolean, tooltipText: string): void {
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`) as HTMLElement | null;
    if (!tabButton) {
      return;
    }

    if (isAvailable) {
      tabButton.classList.remove("tab-locked");
      tabButton.title = "";
    } else {
      tabButton.classList.add("tab-locked");
      tabButton.title = tooltipText;
    }
  }
}

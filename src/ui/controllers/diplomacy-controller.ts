import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";

export class DiplomacyTabController extends BaseTabController {
  constructor() {
    super("diplomacia");
  }

  update(state: GameState): void {
    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    if (this.refs.diplomacyList) {
      this.refs.diplomacyList.innerHTML = "";
      const otherKingdoms = Object.values(state.kingdoms).filter(k => k.id !== player.id && k.id !== "k_nature");

      if (otherKingdoms.length === 0) {
        this.refs.diplomacyList.innerHTML = "<p>Nenhuma outra nação conhecida.</p>";
      } else {
        otherKingdoms.forEach(k => {
          const relationObj = player.diplomacy.relations[k.id];
          let relationValue = 0;
          if (relationObj && relationObj.score) {
            relationValue = relationObj.score.trust - relationObj.score.fear - relationObj.score.rivalry - relationObj.score.religiousTension - relationObj.score.borderTension;
          }
          const status = this.getRelationStatus(relationValue);
          const color = relationValue > 0 ? "#4CAF50" : (relationValue < 0 ? "#F44336" : "#aaa");

          const card = document.createElement("div");
          card.className = "diplomacy-card";
          card.innerHTML = `
            <h4>${k.name}</h4>
            <p>Relação: <span style="color: ${color};">${Math.floor(relationValue)} (${status})</span></p>
          `;

          // Ações diplomáticas (Simulação)
          const actionsDiv = document.createElement("div");
          actionsDiv.className = "diplomacy-actions";
          actionsDiv.innerHTML = `
            <button class="btn btn-small" onclick="alert('Funcionalidade em desenvolvimento')">Melhorar Relação</button>
            <button class="btn btn-small btn-danger" onclick="alert('Funcionalidade em desenvolvimento')">Declarar Guerra</button>
          `;
          card.appendChild(actionsDiv);

          this.refs.diplomacyList.appendChild(card);
        });
      }
    }
  }

  private getRelationStatus(relation: number): string {
    if (relation >= 50) return "Aliado";
    if (relation >= 10) return "Amistoso";
    if (relation <= -50) return "Hostil";
    if (relation <= -10) return "Frio";
    return "Neutro";
  }

  protected setupEventListeners(): void {
    // Listeners futuros para ações diplomáticas
  }
}

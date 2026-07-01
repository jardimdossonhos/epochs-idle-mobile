import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";

export class MilitaryTabController extends BaseTabController {
  constructor() {
    super("exercito");
  }

  update(state: GameState): void {
    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    if (this.refs.militarySummary) {
      // Usando valores genéricos para manpower total por agora, pois depende do ECS/population
      this.refs.militarySummary.innerHTML = `
        <span>Regimentos Totais</span><strong>${player.military.armies.length}</strong>
        <span>Recrutamento</span><strong>Prioridade ${Math.floor(player.military.recruitmentPriority * 100)}%</strong>
      `;
    }

    if (this.refs.militaryArmiesList) {
      this.refs.militaryArmiesList.innerHTML = "";
      player.military.armies.forEach(army => {
        const card = document.createElement("div");
        card.className = "army-card";
        card.innerHTML = `
          <h4>Exército ${army.id.substring(0, 4)}</h4>
          <p>Tropa: ${Math.floor(army.manpower)}</p>
          <p>Moral: ${Math.floor(army.morale * 100)}%</p>
          <p>Qualidade: ${Math.floor(army.quality * 100)}%</p>
        `;
        this.refs.militaryArmiesList.appendChild(card);
      });
    }

    if (this.refs.militaryWarList) {
      this.refs.militaryWarList.innerHTML = "";
      const activeWars = Object.values(state.wars).filter(w => 
        w.attackers.includes(player.id) || w.defenders.includes(player.id)
      );

      if (activeWars.length === 0) {
        this.refs.militaryWarList.innerHTML = "<p>Nenhuma guerra ativa no momento.</p>";
      } else {
        activeWars.forEach(war => {
          const isAttacker = war.attackers.includes(player.id);
          const enemies = isAttacker ? war.defenders : war.attackers;
          const enemyNames = enemies.map(e => state.kingdoms[e]?.name ?? e).join(", ");
          
          const card = document.createElement("div");
          card.className = "war-card";
          card.innerHTML = `
            <h4 style="color: #f44336;">Guerra em andamento</h4>
            <p>Inimigos: ${enemyNames}</p>
            <p>Guerra Iniciada no tick: ${war.startedAt}</p>
          `;
          this.refs.militaryWarList.appendChild(card);
        });
      }
    }
  }

  protected setupEventListeners(): void {
    // Listeners futuros para ações militares
  }
}

import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";

export class EventsTabController extends BaseTabController {
  constructor() {
    super("eventos");
  }

  update(state: GameState): void {
    if (!this.refs.eventLogList) return;

    // Apenas atualiza se houver novos eventos (verificando o tamanho do histórico)
    const currentLength = this.refs.eventLogList.children.length;
    if (state.events.length !== currentLength) {
      this.refs.eventLogList.innerHTML = "";
      
      const recentEvents = [...state.events].reverse().slice(0, 50);

      if (recentEvents.length === 0) {
        this.refs.eventLogList.innerHTML = "<p>Nenhum evento registrado ainda.</p>";
      } else {
        recentEvents.forEach(event => {
          const card = document.createElement("div");
          card.className = "event-log-card";
          // Usamos a cor da severidade
          let color = "#aaa";
          if (event.severity === "critical") color = "#f44336";
          else if (event.severity === "warning") color = "#ff9800";
          else if (event.severity === "info") color = "#2196f3";
          
          card.style.borderLeft = `4px solid ${color}`;
          
          card.innerHTML = `
            <div class="event-log-header">
              <span class="event-log-date">${new Date(event.occurredAt).toLocaleTimeString()}</span>
              <strong style="color: ${color}">${event.title}</strong>
            </div>
            <p>${event.details}</p>
          `;
          this.refs.eventLogList.appendChild(card);
        });
      }
    }
  }

  protected setupEventListeners(): void {
    // Listeners futuros para filtros de eventos
  }
}

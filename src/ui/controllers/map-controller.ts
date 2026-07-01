import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";
import type { MapLayerMode } from "../../infrastructure/rendering/map-renderer";

export class MapTabController extends BaseTabController {
  private currentLayer: MapLayerMode = "owner";

  constructor() {
    super("mapa");
  }

  update(_state: GameState): void {
    // Atualizar legenda baseada na camada atual
    this.updateMapLegend(this.currentLayer);
  }

  protected setupEventListeners(): void {
    // Event listener para mudança de camada do mapa
    this.refs.mapLayerSelect.addEventListener("change", () => {
      this.currentLayer = this.refs.mapLayerSelect.value as MapLayerMode;
      this.updateMapLegend(this.currentLayer);
    });
  }

  private updateMapLegend(layer: string): void {
    if (!this.refs.mapLegend) return;

    let html = '<div class="map-legend-title">Legenda</div>';

    switch (layer) {
      case "owner":
        html += `
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: #4CAF50;"></div>
            <span>Seu Território</span>
          </div>
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: #2196F3;"></div>
            <span>Aliados</span>
          </div>
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: #F44336;"></div>
            <span>Inimigos</span>
          </div>
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: #9E9E9E;"></div>
            <span>Neutros</span>
          </div>
        `;
        break;

      case "population":
        html += `
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: linear-gradient(to right, #FFF3E0, #FF9800);"></div>
            <span>Densidade Populacional</span>
          </div>
        `;
        break;

      case "economy":
        html += `
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: linear-gradient(to right, #FFF3E0, #4CAF50);"></div>
            <span>Riqueza Econômica</span>
          </div>
        `;
        break;

      case "religion":
        html += `
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: linear-gradient(to right, #FFF3E0, #9C27B0);"></div>
            <span>Influência Religiosa</span>
          </div>
        `;
        break;

      case "military":
        html += `
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: linear-gradient(to right, #FFF3E0, #F44336);"></div>
            <span>Força Militar</span>
          </div>
        `;
        break;

      case "stability":
        html += `
          <div class="map-legend-item">
            <div class="map-legend-color" style="background: linear-gradient(to right, #FFF3E0, #FF5722);"></div>
            <span>Estabilidade Política</span>
          </div>
        `;
        break;

      default:
        html += '<div class="map-legend-item">Selecione uma camada</div>';
    }

    this.refs.mapLegend.innerHTML = html;
  }
}
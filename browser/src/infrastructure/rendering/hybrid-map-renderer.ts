import type { KingdomState } from "../../core/models/game-state";
import type { StaticWorldData } from "../../core/models/static-world-data";
import type { WorldState } from "../../core/models/world";
import type { GameMapRenderer, MapLayerMode, MapRenderContext, MapSelection } from "./map-renderer";
import { MapLibreWorldRenderer } from "./maplibre-world-renderer";
import { PixiMapRenderer } from "./pixi-map-renderer";

export class HybridMapRenderer implements GameMapRenderer {
  private active: GameMapRenderer;

  constructor(
    private readonly container: HTMLElement,
    private readonly staticData: StaticWorldData,
    private readonly onRegionSelect?: (selection: MapSelection) => void
  ) {
    this.active = new MapLibreWorldRenderer(container, staticData, onRegionSelect);
  }

  async mount(world: WorldState, kingdoms: Record<string, KingdomState>): Promise<void> {
    try {
      await this.active.mount(world, kingdoms);
    } catch (error) {
      console.warn("MapLibre falhou, usando fallback Pixi.", error);
      this.active.destroy();
      this.active = new PixiMapRenderer(this.container, this.staticData, this.onRegionSelect);
      await this.active.mount(world, kingdoms);
    }
  }

  render(world: WorldState, kingdoms: Record<string, KingdomState>, context?: MapRenderContext): void {
    this.active.render(world, kingdoms, context);
  }

  setLayer(layer: MapLayerMode): void {
    this.active.setLayer(layer);
  }

  destroy(): void {
    this.active.destroy();
  }
}

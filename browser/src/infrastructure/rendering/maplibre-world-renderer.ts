import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { KingdomState } from "../../core/models/game-state";
import type { StaticWorldData } from "../../core/models/static-world-data";
import type { WorldState } from "../../core/models/world";
import type { GameMapRenderer, MapLayerMode, MapRenderContext, MapSelection } from "./map-renderer";

interface WarMarkerFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    regionId: string;
    label: string;
  };
}

interface WarMarkerFeatureCollection {
  type: "FeatureCollection";
  features: WarMarkerFeature[];
}

const SOURCE_ID = "world-countries";
const FILL_LAYER_ID = "countries-fill";
const CONTESTED_LAYER_ID = "countries-contested";
const BORDER_LAYER_ID = "countries-border";
const WAR_MARKER_SOURCE_ID = "war-markers";
const WAR_MARKER_LAYER_ID = "war-markers-circle";
const CAPITAL_MARKER_SOURCE_ID = "capital-markers";
const CAPITAL_MARKER_LAYER_ID = "capital-markers-circle";

export class MapLibreWorldRenderer implements GameMapRenderer {
  private map: MapLibreMap | null = null;
  private layerMode: MapLayerMode = "owner";
  private selectedRegionId: string | null = null;
  private mounted = false;
  private featureStateCache: Map<string, string> = new Map();
  private featureStateQueue: Map<string, any> = new Map();
  private animationFrameId: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly staticData?: StaticWorldData,
    private readonly onRegionSelect?: (selection: MapSelection) => void
  ) {}

  async mount(world: WorldState, kingdoms: Record<string, KingdomState>): Promise<void> {
    if (!this.map) {
      this.map = new maplibregl.Map({
        container: this.container,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "background",
              type: "background",
              paint: {
                "background-color": "#4a6b7d"
              }
            }
          ]
        },
        center: [10, 28],
        zoom: 2.2,
        maxZoom: 7,
        minZoom: 1.35,
        dragRotate: false
      });

      this.startQueueProcessor();

      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      this.map.scrollZoom.enable();
      this.map.dragPan.enable();
      this.map.doubleClickZoom.enable();
      this.map.touchZoomRotate.enable();
    }

    if (!this.mounted) {
      await this.mountLayers();
      this.applyLayerMode();
      this.mounted = true;
    }

    this.map.resize();
    this.render(world, kingdoms);
  }

  setLayer(layer: MapLayerMode): void {
    this.layerMode = layer;
    this.applyLayerMode();
  }

  render(world: WorldState, kingdoms: Record<string, KingdomState>, context?: MapRenderContext): void {
    if (!this.map) {
      return;
    }

    const contestedRegionIds = context?.contestedRegionIds?.length
      ? new Set(context.contestedRegionIds)
      : new Set(
        Object.keys(world.regions)
          .sort()
          .filter((regionId) => world.regions[regionId].devastation > 0.22)
      );
    const recentlyCapturedRegionIds = context?.recentlyCapturedRegionIds?.length
      ? new Set(context.recentlyCapturedRegionIds)
      : new Set<string>();
    const playerAlliedRegionIds = context?.playerAlliedRegionIds?.length
      ? new Set(context.playerAlliedRegionIds)
      : new Set<string>();
    const playerEnemyRegionIds = context?.playerEnemyRegionIds?.length
      ? new Set(context.playerEnemyRegionIds)
      : new Set<string>();
    const animationClockMs = context?.animationClockMs ?? (typeof performance !== "undefined" ? performance.now() : Date.now());

    // Usa o array de definições puro como fonte da iteração de estados
    const orderedDefs = (context as any)?.orderedDefinitions ?? [];
    for (let i = 0; i < orderedDefs.length; i++) {
      const def = orderedDefs[i];
      if (def.isWater) continue; // Pula os oceanos instantaneamente (ganho massivo de FPS)

      const regionId = def.id;
      const region = world.regions[regionId];
      
      const isRecentlyCaptured = recentlyCapturedRegionIds.has(regionId);
      const pulse = isRecentlyCaptured ? buildPulse(animationClockMs, regionId) : 0;
      const selected = this.selectedRegionId === regionId ? 1 : 0;
      const contested = contestedRegionIds.has(regionId) ? 1 : 0;

      if (!region) {
        const hash = `empty|${selected}|${pulse}|${contested}`;
        if (this.featureStateCache.get(regionId) !== hash) {
          this.featureStateQueue.set(regionId, {
            ownerColor: "#857a67",
            faithColor: "#6f6352",
            unrest: 0,
            contested,
            recentlyCaptured: 0,
            pulse,
            selected,
            isAllied: 0,
            isEnemy: 0,
            wealthRatio: 0,
            dominantShare: 0
          });
          this.featureStateCache.set(regionId, hash);
        }
        continue;
      }

      const owner = kingdoms[region.ownerId];
      const ownerColor = owner?.color || colorForKingdom(owner?.id ?? region.ownerId);
      
      // Extração Total (Eager Loading): Garante troca de camadas O(1) instantânea na interface
      const unrest = Number.isFinite(region.unrest) ? region.unrest : 0;
      const rawWealth = context?.regionWealthRatio?.[regionId];
      const wealthRatio = Number.isFinite(rawWealth) ? rawWealth! : 0;
      const isAllied = playerAlliedRegionIds.has(regionId) ? 1 : 0;
      const isEnemy = playerEnemyRegionIds.has(regionId) ? 1 : 0;
      const activeReligion = world.religions[region.dominantFaith];
      const faithColor = activeReligion?.color || colorForFaith(region.dominantFaith, this.staticData);
      const dominantShare = Number.isFinite(region.dominantShare) ? region.dominantShare : 0;

      // Quantização do Hash: Impede que frações decimais gerem recálculos exaustivos na GPU
      const qUnrest = Math.round(unrest * 50) || 0;
      const qWealth = Math.round(wealthRatio * 50) || 0;
      const qDominant = Math.round(dominantShare * 50) || 0;

      // Assinatura de estado quantizada
      const hash = `${ownerColor}|${selected}|${pulse}|${contested}|${qUnrest}|${qWealth}|${isAllied}|${isEnemy}|${faithColor}|${qDominant}`;

      if (this.featureStateCache.get(regionId) !== hash) {
        this.featureStateQueue.set(regionId, {
          ownerColor,
          faithColor,
          unrest,
          contested,
          recentlyCaptured: isRecentlyCaptured ? 1 : 0,
          pulse,
          selected,
          isAllied,
          isEnemy,
          wealthRatio,
          dominantShare
        });
        this.featureStateCache.set(regionId, hash);
      }
    }

    const markerRegions = context?.activeWarMarkerRegionIds?.length
      ? context.activeWarMarkerRegionIds
      : Array.from(contestedRegionIds).sort();
    this.updateWarMarkers(markerRegions);
    this.updateCapitalMarkers(kingdoms);
  }

  destroy(): void {
    this.stopQueueProcessor();
    if (!this.map) {
      return;
    }

    this.map.remove();
    this.map = null;
    this.mounted = false;
  }

  private startQueueProcessor() {
    const process = () => {
      // A Placa de Vídeo precisa respirar, mas a fila deve ser rápida.
      if (this.map && this.map.getSource(SOURCE_ID) && this.featureStateQueue.size > 0) {
        let count = 0;
        for (const [id, state] of this.featureStateQueue.entries()) {
          this.map.setFeatureState({ source: SOURCE_ID, sourceLayer: "hexgrid", id }, state);
          this.featureStateQueue.delete(id);
          count++;
          // Lote de 250/frame (~15.000/s) varre o mundo inteiro em menos de 1 segundo
          if (count >= 250) break;
        }
        this.map.triggerRepaint();
      }
      this.animationFrameId = requestAnimationFrame(process);
    };
    this.animationFrameId = requestAnimationFrame(process);
  }

  private stopQueueProcessor() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private async mountLayers(): Promise<void> {
    if (!this.map) {
      return;
    }

    if (!this.map.isStyleLoaded()) {
      await new Promise<void>((resolve) => {
        this.map?.once("load", () => resolve());
      });
    }

    if (!this.map.getSource(SOURCE_ID)) {
      this.map.addSource(SOURCE_ID, {
        type: "vector",
        tiles: [buildTileUrl()],
        maxzoom: 5,
        promoteId: "regionId"
      });
    }

    if (!this.map.getSource(WAR_MARKER_SOURCE_ID)) {
      this.map.addSource(WAR_MARKER_SOURCE_ID, {
        type: "geojson",
        data: emptyMarkerCollection() as unknown as FeatureCollection
      });
    }

    if (!this.map.getSource(CAPITAL_MARKER_SOURCE_ID)) {
      this.map.addSource(CAPITAL_MARKER_SOURCE_ID, {
        type: "geojson",
        data: emptyMarkerCollection() as unknown as FeatureCollection
      });
    }

    if (!this.map.getLayer(FILL_LAYER_ID)) {
      this.map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        "source-layer": "hexgrid",
        paint: {
          "fill-color": ["coalesce", ["feature-state", "ownerColor"], "#8d816e"],
          "fill-opacity": 0.9,
          "fill-outline-color": ["coalesce", ["feature-state", "ownerColor"], "#8d816e"]
        }
      });
    }

    if (!this.map.getLayer(CONTESTED_LAYER_ID)) {
      this.map.addLayer({
        id: CONTESTED_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        "source-layer": "hexgrid",
        paint: {
          "line-color": "#8f1f1f",
          "line-width": [
            "case",
            ["==", ["coalesce", ["feature-state", "contested"], 0], 1],
            2.1,
            0.2
          ],
          "line-opacity": [
            "case",
            ["==", ["coalesce", ["feature-state", "contested"], 0], 1],
            0.88,
            0
          ],
          "line-dasharray": [1.2, 1.1]
        }
      });
    }

    if (!this.map.getLayer(BORDER_LAYER_ID)) {
      this.map.addLayer({
        id: BORDER_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        "source-layer": "hexgrid",
        paint: {
          "line-color": [
            "case",
            ["==", ["feature-state", "selected"], 1],
            "#ffffff",
            [">", ["coalesce", ["feature-state", "pulse"], 0], 0],
            "#f2b15a",
            ["==", ["coalesce", ["feature-state", "recentlyCaptured"], 0], 1],
            "#ef9e2b",
            "#000000"
          ],
          "line-width": [
            "case",
            ["==", ["feature-state", "selected"], 1],
            2.5,
            [">", ["coalesce", ["feature-state", "pulse"], 0], 0],
            ["+", 1.5, ["*", ["coalesce", ["feature-state", "pulse"], 0], 2.4]],
            ["==", ["coalesce", ["feature-state", "recentlyCaptured"], 0], 1],
            2.2,
            0.5
          ],
          "line-opacity": [
            "case",
            ["==", ["get", "isWater"], true],
            0.04,
            ["==", ["coalesce", ["feature-state", "contested"], 0], 1],
            0.98,
            0.12
          ]
        }
      });
    }

    if (!this.map.getLayer(WAR_MARKER_LAYER_ID)) {
      this.map.addLayer({
        id: WAR_MARKER_LAYER_ID,
        type: "circle",
        source: WAR_MARKER_SOURCE_ID,
        paint: {
          "circle-color": "#b12222",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1.3,
            2.8,
            4,
            5.2,
            7,
            7.8
          ],
          "circle-opacity": 0.88,
          "circle-stroke-color": "#f7d9a4",
          "circle-stroke-width": 1.1
        }
      });
    }

    if (!this.map.getLayer(CAPITAL_MARKER_LAYER_ID)) {
      this.map.addLayer({
        id: CAPITAL_MARKER_LAYER_ID,
        type: "circle",
        source: CAPITAL_MARKER_SOURCE_ID,
        paint: {
          "circle-color": "#d4af37", // Dourado sólido para a coroa
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1.3, 2.5,
            4, 4.5,
            7, 6.5
          ],
          "circle-opacity": 0.95,
          "circle-stroke-color": "#111111",
          "circle-stroke-width": 1.5
        }
      });
    }

    this.map.on("click", FILL_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const regionId = feature?.properties?.regionId;
      const label = feature?.properties?.name;

      if (typeof regionId === "string") {
        this.selectedRegionId = regionId;
        this.onRegionSelect?.({
          regionId,
          label: typeof label === "string" ? label : regionId
        });
      }
    });

    this.map.on("mouseenter", FILL_LAYER_ID, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = "pointer";
      }
    });

    this.map.on("mouseleave", FILL_LAYER_ID, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = "";
      }
    });
  }

  private applyLayerMode(): void {
    if (!this.map || !this.map.getLayer(FILL_LAYER_ID)) {
      return;
    }
    
    const WATER_COLOR = "#6b8696";
    const WATER_OPACITY = 0.55;

    // Wrapper data-driven para contornar o bug do MapLibre de avaliar feature-state em propriedades mistas
    const TRANSPARENT_OUTLINE: any = ["case", ["==", ["get", "isWater"], true], "rgba(0,0,0,0)", "rgba(0,0,0,0)"];

    switch (this.layerMode) {
      case "owner":
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-color", ["case", ["==", ["get", "isWater"], true], WATER_COLOR, ["coalesce", ["feature-state", "ownerColor"], "#8d816e"]]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", ["case", ["==", ["get", "isWater"], true], WATER_OPACITY, 0.9]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-outline-color", ["case", ["==", ["get", "isWater"], true], WATER_COLOR, ["coalesce", ["feature-state", "ownerColor"], "#8d816e"]]);
        break;
      case "unrest":
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-color", [
          "case",
          ["==", ["get", "isWater"], true], WATER_COLOR,
          [
            "interpolate",
            ["linear"],
            ["coalesce", ["feature-state", "unrest"], 0],
            0, "#3e6b57",
            0.45, "#bb7a2a",
            0.75, "#ad2a24"
          ]
        ]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", ["case", ["==", ["get", "isWater"], true], WATER_OPACITY, 0.9]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-outline-color", TRANSPARENT_OUTLINE);
        break;
      case "war":
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-color", [
          "case",
          ["==", ["get", "isWater"], true], WATER_COLOR,
          ["==", ["coalesce", ["feature-state", "contested"], 0], 1],
          "#a31f1f",
          ["coalesce", ["feature-state", "ownerColor"], "#8d816e"]
        ]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", [
          "case",
          ["==", ["get", "isWater"], true], WATER_OPACITY,
          ["==", ["coalesce", ["feature-state", "contested"], 0], 1],
          0.95,
          0.75
        ]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-outline-color", TRANSPARENT_OUTLINE);
        break;
      case "religion":
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-color", [
          "case", ["==", ["get", "isWater"], true], WATER_COLOR, ["coalesce", ["feature-state", "faithColor"], "#75624a"]
        ]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", [
          "case",
          ["==", ["get", "isWater"], true], WATER_OPACITY,
          ["interpolate",
          ["linear"],
          ["coalesce", ["feature-state", "dominantShare"], 0],
          0,
          0.5,
          0.5,
          0.72,
          1,
          0.9
        ]]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-outline-color", TRANSPARENT_OUTLINE);
        break;
      case "diplomacy":
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-color", [
          "case",
          ["==", ["get", "isWater"], true], WATER_COLOR,
          ["==", ["coalesce", ["feature-state", "isAllied"], 0], 1],
          "#3e6b8c", // Azul: Jogador e Aliados
          ["==", ["coalesce", ["feature-state", "isEnemy"], 0], 1],
          "#a32a2a", // Vermelho: Inimigos / Rivais
          "#8d816e"  // Neutro
        ]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", ["case", ["==", ["get", "isWater"], true], WATER_OPACITY, 0.85]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-outline-color", TRANSPARENT_OUTLINE);
        break;
      case "economy":
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-color", [
          "case",
          ["==", ["get", "isWater"], true], WATER_COLOR,
          [
            "interpolate",
            ["linear"],
            ["coalesce", ["feature-state", "wealthRatio"], 0],
            0, "#8d816e",
            0.2, "#a6955a",
            0.5, "#cca43b",
            1, "#f2d067"
          ]
        ]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", ["case", ["==", ["get", "isWater"], true], WATER_OPACITY, 0.85]);
        this.map.setPaintProperty(FILL_LAYER_ID, "fill-outline-color", TRANSPARENT_OUTLINE);
        break;
    }
  }

  private updateWarMarkers(regionIds: readonly string[]): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(WAR_MARKER_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    const features: WarMarkerFeature[] = [];
    for (const regionId of Array.from(new Set(regionIds)).sort()) {
      const def = this.staticData?.definitions[regionId];
      if (!def) continue;

      const center = [def.center.x, def.center.y] as [number, number];

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: center
        },
        properties: {
          regionId,
          label: "WAR"
        }
      });
    }

    source.setData({
      type: "FeatureCollection",
      features
    } as unknown as FeatureCollection);
  }

  private updateCapitalMarkers(kingdoms: Record<string, KingdomState>): void {
    if (!this.map) return;

    const source = this.map.getSource(CAPITAL_MARKER_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const features: WarMarkerFeature[] = [];
    for (const kingdomId in kingdoms) {
      if (kingdomId === "k_nature") continue; // A Terra Selvagem não tem capital
      
      const kingdom = kingdoms[kingdomId];
      const def = this.staticData?.definitions[kingdom.capitalRegionId];
      if (!def) continue;

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [def.center.x, def.center.y] as [number, number]
        },
        properties: {
          regionId: kingdom.capitalRegionId,
          label: "CAPITAL"
        }
      });
    }

    source.setData({
      type: "FeatureCollection",
      features
    } as unknown as FeatureCollection);
  }
}

function emptyMarkerCollection(): WarMarkerFeatureCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function buildPulse(clockMs: number, regionId: string): number {
  const seed = regionId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const normalized = Math.sin((clockMs + seed * 13) * 0.008);
  return Number(((normalized + 1) * 0.5).toFixed(3));
}

// Utilitário puro de conversão de cor para WebGL
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function colorForKingdom(kingdomId: string): string {
  if (!kingdomId || typeof kingdomId !== "string") return "rgba(0,0,0,0)";
  if (kingdomId === "k_nature") return "#3b453b"; // Verde Musgo Escuro para a Natureza Selvagem

  // Geração Procedural Infinita (Golden Ratio Hashing)
  let hash = 0;
  for (let i = 0; i < kingdomId.length; i++) {
    hash = (hash << 5) - hash + kingdomId.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  
  // Multiplicador para garantir pulos grandes na roda de cores, gerando IAs bem distintas
  const hue = (absHash * 137) % 360; 
  const saturation = 55 + (absHash % 35); // 55% a 90% (Cores mais vibrantes)
  const lightness = 45 + ((absHash >> 2) % 15); // 45% a 60% (Evita o excesso de marrom escuro)

  return hslToHex(hue, saturation, lightness);
}

function colorForFaith(faithId: string, staticData?: StaticWorldData): string {
  if (!faithId || typeof faithId !== "string") return "rgba(0,0,0,0)";
  if (faithId === "ancestral_cults") return "#4a463c"; // Marrom Seco para Tribos Iniciais

  const staticColor = staticData?.religions[faithId]?.color;
  if (typeof staticColor === "string" && staticColor.length > 0) {
    return staticColor;
  }

  const palette = ["#7b4a33", "#ad7b2f", "#4f6c3e", "#b66a6a", "#49657a", "#8a6a9b", "#2f6f74"];
  const hash = faithId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length] || "rgba(0,0,0,0)";
}

function buildTileUrl(): string {
  const currentUrl = new URL(window.location.href);
  currentUrl.hash = "";
  currentUrl.search = "";

  if (!currentUrl.pathname.endsWith("/")) {
    const hasFileName = currentUrl.pathname.split("/").pop()?.includes(".") ?? false;
    currentUrl.pathname = hasFileName
      ? currentUrl.pathname.replace(/[^/]*$/u, "")
      : `${currentUrl.pathname}/`;
  }

  // Concatenação manual estrita para evitar que o URL-encoder destrua as chaves de template do MapLibre (%7Bz%7D)
  return `${currentUrl.origin}${currentUrl.pathname}assets/tiles/{z}/{x}/{y}.pbf`;
}

﻿﻿﻿import { Application, Container, Graphics, Text } from "pixi.js";
import type { KingdomState } from "../../core/models/game-state";
import type { StaticWorldData } from "../../core/models/static-world-data";
import type { RegionDefinition, WorldState } from "../../core/models/world";
import type { GameMapRenderer, MapLayerMode, MapRenderContext, MapSelection } from "./map-renderer";

interface RegionNode {
  definition: RegionDefinition;
  shape: Graphics;
  label: Text;
}

const REGION_WIDTH = 26;
const REGION_HEIGHT = 16;

export class PixiMapRenderer implements GameMapRenderer {
  private app: Application | null = null;
  private layerContainer: Container | null = null;
  private readonly regionNodes = new Map<string, RegionNode>();
  private selectedRegionId: string | null = null;
  private mapLayer: MapLayerMode = "owner";

  constructor(
    private readonly container: HTMLElement,
    private readonly staticData: StaticWorldData,
    private readonly onRegionSelect?: (selection: MapSelection) => void
  ) {}

  async mount(world: WorldState, kingdoms: Record<string, KingdomState>): Promise<void> {
    if (!this.app) {
      this.app = new Application();
      await this.app.init({
        resizeTo: this.container,
        background: "#d9c8a7",
        antialias: true
      });

      this.container.innerHTML = "";
      this.container.appendChild(this.app.canvas);
      this.layerContainer = new Container();
      this.app.stage.addChild(this.layerContainer);
    }

    this.render(world, kingdoms);
  }

  setLayer(layer: MapLayerMode): void {
    this.mapLayer = layer;
  }

  render(world: WorldState, kingdoms: Record<string, KingdomState>, context?: MapRenderContext): void {
    if (!this.app || !this.layerContainer) {
      return;
    }

    if (this.regionNodes.size === 0) {
      this.drawRegions(world);
    }

    const contestedRegionIds = context?.contestedRegionIds?.length
      ? new Set(context.contestedRegionIds)
      : null;
    const recentlyCapturedRegionIds = context?.recentlyCapturedRegionIds?.length
      ? new Set(context.recentlyCapturedRegionIds)
      : null;
    const playerAlliedRegionIds = context?.playerAlliedRegionIds?.length
      ? new Set(context.playerAlliedRegionIds)
      : null;
    const playerEnemyRegionIds = context?.playerEnemyRegionIds?.length
      ? new Set(context.playerEnemyRegionIds)
      : null;

    for (const [regionId, regionState] of Object.entries(world.regions)) {
      const node = this.regionNodes.get(regionId);
      if (!node) {
        continue;
      }

      const owner = kingdoms[regionState.ownerId];
      const selected = this.selectedRegionId === regionId;
      const recentlyCaptured = recentlyCapturedRegionIds?.has(regionId) ?? false;

      const hexStr = owner?.color || colorForKingdom(owner?.id ?? regionState.ownerId);
      let fillColor = parseInt(hexStr.replace("#", "0x"), 16);
      if (this.mapLayer === "unrest") {
        fillColor = colorForUnrest(regionState.unrest);
      }

      if (this.mapLayer === "war") {
        fillColor = colorForWarPressure(
          contestedRegionIds?.has(regionId) ? 1 : regionState.devastation
        );
      }

      if (this.mapLayer === "religion") {
        fillColor = colorForFaith(regionState.dominantFaith, this.staticData);
      }

      if (this.mapLayer === "diplomacy") {
        if (playerAlliedRegionIds?.has(regionId)) {
          fillColor = 0x3e6b8c;
        } else if (playerEnemyRegionIds?.has(regionId)) {
          fillColor = 0xa32a2a;
        } else {
          fillColor = 0x8d816e;
        }
      }

      if (this.mapLayer === "economy") {
        const ratio = context?.regionWealthRatio?.[regionId] ?? 0;
        fillColor = colorForWealth(ratio);
      }

      const projected = this.toCanvasPoint(node.definition);
      redrawRegionShape(node.shape, projected, fillColor, selected, recentlyCaptured);
      node.label.x = projected.x;
      node.label.y = projected.y;
      node.label.visible = selected;
    }
  }

  destroy(): void {
    if (!this.app) {
      return;
    }

    this.app.destroy(true);
    this.app = null;
    this.layerContainer = null;
    this.regionNodes.clear();
  }

  private drawRegions(world: WorldState): void {
    if (!this.layerContainer) {
      return;
    }

    this.layerContainer.removeChildren();
    this.regionNodes.clear();

    for (const regionId of Object.keys(world.regions).sort()) {
      const region = this.staticData.definitions[regionId];
      if (!region) {
        continue;
      }

      const shape = new Graphics();
      shape.eventMode = "static";
      shape.cursor = "pointer";

      shape.on("pointertap", () => {
        this.selectedRegionId = region.id;
        this.onRegionSelect?.({ regionId: region.id, label: region.name });
      });

      const label = new Text({
        text: region.name,
        style: {
          fontFamily: "Georgia",
          fontSize: 10,
          fill: "#2a241b",
          align: "center"
        }
      });
      label.anchor.set(0.5);
      const projected = this.toCanvasPoint(region);
      label.x = projected.x;
      label.y = projected.y;
      label.visible = false;

      redrawRegionShape(shape, projected, 0x927a61, false, false);

      this.layerContainer.addChild(shape);
      this.layerContainer.addChild(label);
      this.regionNodes.set(region.id, { definition: region, shape, label });
    }
  }

  private toCanvasPoint(region: RegionDefinition): { x: number; y: number } {
    if (!this.app) {
      return {
        x: region.center.x,
        y: region.center.y
      };
    }

    const rawX = region.center.x;
    const rawY = region.center.y;
    if (Math.abs(rawX) <= 180 && Math.abs(rawY) <= 90) {
      const width = Math.max(1, this.app.renderer.width);
      const height = Math.max(1, this.app.renderer.height);
      return {
        x: ((rawX + 180) / 360) * width,
        y: ((90 - rawY) / 180) * height
      };
    }

    return {
      x: rawX,
      y: rawY
    };
  }
}

function redrawRegionShape(
  shape: Graphics,
  center: { x: number; y: number },
  fillColor: number,
  selected: boolean,
  recentlyCaptured: boolean
): void {
  const x = center.x - REGION_WIDTH / 2;
  const y = center.y - REGION_HEIGHT / 2;

  shape.clear();
  shape.lineStyle(selected ? 3 : recentlyCaptured ? 2.5 : 2, selected ? 0xf2d067 : recentlyCaptured ? 0xef9e2b : 0x4a3722, 1);
  shape.beginFill(fillColor, selected ? 0.95 : 0.82);
  shape.drawRoundedRect(x, y, REGION_WIDTH, REGION_HEIGHT, 14);
  shape.endFill();
}

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
  if (!kingdomId || kingdomId === "k_nature") return "#3b453b";
  let hash = 0;
  for (let i = 0; i < kingdomId.length; i++) { hash = (hash << 5) - hash + kingdomId.charCodeAt(i); hash |= 0; }
  const absHash = Math.abs(hash);
  const hue = (absHash * 137.508) % 360;
  return hslToHex(hue, 40 + (absHash % 30), 35 + ((absHash >> 2) % 25));
}

function colorForUnrest(unrest: number): number {
  if (unrest >= 0.7) {
    return 0xad2a24;
  }

  if (unrest >= 0.45) {
    return 0xc57127;
  }

  return 0x42715d;
}

function colorForWarPressure(devastation: number): number {
  if (devastation >= 0.35) {
    return 0x8f2020;
  }

  if (devastation >= 0.18) {
    return 0xb6542e;
  }

  return 0x4f5f6b;
}

function colorForFaith(faithId: string, staticData: StaticWorldData): number {
  const directColor = staticData.religions[faithId]?.color;
  if (typeof directColor === "string" && directColor.startsWith("#")) {
    return Number.parseInt(directColor.slice(1), 16);
  }

  const palette = [0x7b4a33, 0xad7b2f, 0x4f6c3e, 0xb66a6a, 0x49657a, 0x8a6a9b, 0x2f6f74];
  const hash = faithId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function colorForWealth(ratio: number): number {
  if (ratio >= 0.8) {
    return 0xf2d067;
  }

  if (ratio >= 0.4) {
    return 0xcca43b;
  }

  if (ratio >= 0.1) {
    return 0xa6955a;
  }

  return 0x8d816e;
}

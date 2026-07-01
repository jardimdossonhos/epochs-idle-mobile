﻿
import type { KingdomState } from "../../core/models/game-state";
import type { RegionDefinition, WorldState } from "../../core/models/world";

export type MapLayerMode = "owner" | "unrest" | "war" | "religion" | "diplomacy" | "economy";

export interface MapSelection {
  regionId: string;
  label?: string;
}

export interface MapRenderContext {
  contestedRegionIds?: readonly string[];
  recentlyCapturedRegionIds?: readonly string[];
  activeWarMarkerRegionIds?: readonly string[];
  playerAlliedRegionIds?: readonly string[];
  playerEnemyRegionIds?: readonly string[];
  regionWealthRatio?: Record<string, number>;
  animationClockMs?: number;
  orderedDefinitions?: readonly RegionDefinition[];
}

export interface GameMapRenderer {
  mount(world: WorldState, kingdoms: Record<string, KingdomState>): Promise<void>;
  render(world: WorldState, kingdoms: Record<string, KingdomState>, context?: MapRenderContext): void;
  setLayer(layer: MapLayerMode): void;
  destroy(): void;
}

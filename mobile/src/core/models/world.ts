import type { KingdomId, Point2D, RegionId, ReligionId } from "./types";
import { BiomeType, BuildingType } from "./enums";
import type { Character } from "./character";
import type { WorldReligion } from "./religion";

export type RegionZone =
  | "europe"
  | "north_africa"
  | "near_east"
  | "north_america"
  | "south_america"
  | "sub_saharan_africa"
  | "central_asia"
  | "south_asia"
  | "east_asia"
  | "oceania";

export interface RegionDefinition {
  id: RegionId;
  name: string;
  zone: RegionZone;
  strategicValue: number;
  economyValue: number;
  militaryValue: number;
  isCoastal: boolean;
  isWater: boolean;
  biome: BiomeType;
  neighbors: RegionId[];
  center: Point2D;
}

export interface RegionState {
  regionId: RegionId;
  ownerId: KingdomId;
  controllerId: KingdomId;
  autonomy: number;
  assimilation: number;
  unrest: number;
  devastation: number;
  dominantFaith: ReligionId;
  dominantShare: number;
  minorityFaith?: ReligionId;
  minorityShare?: number;
  faithUnrest: number;
  actionCooldowns?: Record<string, number>;
  buildings?: BuildingType[]; // Matriz de edificios construidos nos Slots locais
}

export interface StrategicRoute {
  id: string;
  from: RegionId;
  to: RegionId;
  routeType: "land" | "sea";
  controlWeight: number;
}

export type EventChainType = "economic_crisis" | "holy_war";

export type EventChainDataValue = string | number | boolean | null;

export interface EventChainState {
  id: string;
  kingdomId: string;
  chainType: EventChainType;
  stage: number;
  maxStages: number;
  startedAt: number;
  lastTriggered: number;
  data: Record<string, EventChainDataValue>;
}

export interface WorldState {
  mapId: string;
  regions: Record<RegionId, RegionState>;
  religions: Record<ReligionId, WorldReligion>; // Dicionario vivo de fes ativas no mundo
  characters?: Record<string, Character>; // Populacao universal (Lendarios, NPCs)
  eventChains?: Record<string, EventChainState>;
}

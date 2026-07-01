import type { RegionDefinition } from "../../../core/models/world";
import definitionsJson from "./world-definitions-v1.json";

interface WorldDefinitionsJson {
  mapId: string;
  source: string;
  regions: RegionDefinition[];
}

const definitions = definitionsJson as unknown as WorldDefinitionsJson;

export const WORLD_DEFINITIONS_MAP_ID = definitions.mapId;
export const WORLD_DEFINITIONS_V1: RegionDefinition[] = definitions.regions;

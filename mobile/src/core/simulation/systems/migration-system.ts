import { buildEvent } from "../../ecs/event-pool";
import { AutomationLevel } from "../../models/enums";
import type { StaticWorldData } from "../../models/static-world-data";
import type { SimulationSystem, TickContext } from "../tick-pipeline";
import type { RegionDefinition } from "../../models/world";
import { createEventId, getRegionIndex, TOTAL_HEXES } from "./utils";
import worldMapData from "../../../assets/data/world_map_data.json";

const MIGRATION_THRESHOLD = 150; 
const MIGRATION_AMOUNT = 50;     
const MAP_COLS = 800;
const MAP_ROWS = 400;

function getNeighbors(idx: number): number[] {
    const col = idx % MAP_COLS;
    const row = Math.floor(idx / MAP_COLS);
    const isOdd = row % 2 !== 0;
    
    const offsets = isOdd ? [
        [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 0]
    ] : [
        [-1, -1], [0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
    ];
    
    const neighbors: number[] = [];
    for (const [dc, dr] of offsets) {
        let nc = col + dc;
        const nr = row + dr;
        
        if (nr < 0 || nr >= MAP_ROWS) continue;
        
        nc = ((nc % MAP_COLS) + MAP_COLS) % MAP_COLS;
        neighbors.push(nr * MAP_COLS + nc);
    }
    return neighbors;
}

export function createMigrationSystem(staticData: StaticWorldData, _ignoredDefs: RegionDefinition[]): SimulationSystem {
  return {
    id: "migration_system",
    run: (context: TickContext) => {
      const state = context.nextState;
      if (state.meta.tick === 0 || state.meta.tick % 12 !== 0) return;
      if (!state.ecs || !state.ecs.regionOwner || !state.ecs.populationTotal) return;

      const migrations: Array<{ sourceId: string; targetId: string; amount: number; kingdomId: string }> = [];
      const migratedKingdomsThisCycle = new Set<string>();
      
      const startIndex = Math.floor(Math.random() * TOTAL_HEXES);
      const biomes = worldMapData.biomes;

      for (let offset = 0; offset < TOTAL_HEXES; offset++) {
        const i = (startIndex + offset) % TOTAL_HEXES;
        const ownerFactionId = state.ecs.regionOwner[i];
        
        if (ownerFactionId <= 0) continue; 

        const kingdomId = ownerFactionId === 1 ? "k_player" : `k_npc_${ownerFactionId - 1}`;
        const kingdom = state.kingdoms[kingdomId];
        if (!kingdom) continue;

        const currentPop = state.ecs.populationTotal[i];

        if (currentPop < 15 && getRegionIndex(kingdom.capitalRegionId) !== i) {
            state.ecs.regionOwner[i] = -1; 
            state.ecs.populationTotal[i] = 0;
            if (state.ecs.gold) state.ecs.gold[i] = 0;
            if (state.ecs.food) state.ecs.food[i] = 0;
            if (state.ecs.manpower) state.ecs.manpower[i] = 0;
            
            const evt = buildEvent("population.extinction", context.now, { regionId: `r_hex_${i}`, regionName: `Região ${i}` }, kingdom.id, undefined);
            if (evt) {
              evt.id = createEventId({ prefix: "evt_ext", tick: context.nextState.meta.tick, systemId: "migration", actorId: kingdom.id, sequence: context.events.length });
              context.events.push(evt);
            }
            continue;
        }

        if (migratedKingdomsThisCycle.has(kingdom.id)) continue;
        if (kingdom.administration.automation.expansion === AutomationLevel.Manual) continue;
        if (currentPop < MIGRATION_THRESHOLD) continue;

        const neighbors = getNeighbors(i);
        const validNeighbors = neighbors.filter(n => state.ecs!.regionOwner[n] === -1 && biomes[n] > 0); 

        if (validNeighbors.length === 0) continue;

        const targetIdx = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        
        state.ecs.regionOwner[targetIdx] = ownerFactionId;
        state.ecs.populationTotal[i] -= MIGRATION_AMOUNT;
        state.ecs.populationTotal[targetIdx] += MIGRATION_AMOUNT;
        
        migrations.push({ sourceId: `r_hex_${i}`, targetId: `r_hex_${targetIdx}`, amount: MIGRATION_AMOUNT, kingdomId: kingdom.id });
        migratedKingdomsThisCycle.add(kingdom.id);
      }

      for (const mig of migrations) {
        const evt = buildEvent("population.migration", context.now, mig, mig.kingdomId, undefined);
        if (evt) {
          evt.id = createEventId({ prefix: "evt_mig", tick: context.nextState.meta.tick, systemId: "migration", actorId: mig.kingdomId, sequence: context.events.length });
          context.events.push(evt);
        }
      }

      for (const kid of Object.keys(state.kingdoms)) {
        state.kingdoms[kid].ownedRegionIds = undefined;
      }
    }
  };
}
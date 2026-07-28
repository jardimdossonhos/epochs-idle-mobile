import { AutomationLevel } from "../../models/enums";
import type { StaticWorldData } from "../../models/static-world-data";
import type { SimulationSystem, TickContext } from "../tick-pipeline";
import type { RegionDefinition } from "../../models/world";
import { createEventId } from "./utils";

const MIGRATION_THRESHOLD = 150; // População necessária para engatilhar o transbordo
const MIGRATION_AMOUNT = 50;     // Quantidade demográfica que forma a nova colônia

export function createMigrationSystem(staticData: StaticWorldData, orderedDefinitions: RegionDefinition[]): SimulationSystem {
  const indexMap = new Map<string, number>();
  for (let i = 0; i < orderedDefinitions.length; i++) {
    indexMap.set(orderedDefinitions[i].id, i);
  }

  return {
    id: "migration_system",
    run: (context: TickContext) => {
      const state = context.nextState;
      // Roda apenas 1 vez por "Ano" (12 ciclos) para evitar afogar o Event Loop da UI
      // e dar tempo para o IPC do Worker consolidar e retornar a matemática do ano anterior.
      if (state.meta.tick === 0 || state.meta.tick % 12 !== 0) return;

      const migrations: Array<{ sourceId: string; targetId: string; amount: number; kingdomId: string }> = [];
      let eventSeq = 0;

      // Rastreia quem já migrou neste ano para impedir o efeito "Starburst" (saltos simultâneos de anexação)
      const migratedKingdomsThisCycle = new Set<string>();

      // Sorteamos um ponto inicial na malha xeque para evitar bias direcional (ex: expandir sempre para o norte)
      const startIndex = Math.floor(Math.random() * orderedDefinitions.length);

      // Avaliação linear de alta performance (Data-Oriented Scan)
      for (let offset = 0; offset < orderedDefinitions.length; offset++) {
        const i = (startIndex + offset) % orderedDefinitions.length;
        const def = orderedDefinitions[i];
        if (def.isWater) continue;

        const regionId = def.id;
        const region = state.world.regions[regionId];

        // Apenas tribos assentadas (Não-Selvagens) expandem
        if (!region || region.ownerId === "k_nature") continue;

        const kingdom = state.kingdoms[region.ownerId];
        if (!kingdom) continue;

        const currentPop = state.ecs?.populationTotal?.[i] || 0;

        // EXTINÇÃO: Se a população física morreu (ex: fome extrema), a terra volta à natureza
        if (currentPop < 15 && kingdom.capitalRegionId !== regionId) {
            region.ownerId = "k_nature";
            region.controllerId = "k_nature";
            region.unrest = 0;
            region.devastation = 0;
            region.assimilation = 0;
            region.autonomy = 0;
            
            // Zera os recursos restantes para não deixar rastros fantasmas
            if (state.ecs) {
                if (state.ecs.gold) (state.ecs.gold as any)[i] = 0;
                if (state.ecs.food) (state.ecs.food as any)[i] = 0;
                if (state.ecs.populationTotal) (state.ecs.populationTotal as any)[i] = 0;
                if (state.ecs.manpower) (state.ecs.manpower as any)[i] = 0;
            }

            context.events.push({
                id: createEventId({ prefix: "evt_ext", tick: state.meta.tick, systemId: "migration", actorId: kingdom.id, sequence: eventSeq++ }),
                type: "population.extinction",
                actorKingdomId: kingdom.id,
                payload: { regionId, regionName: def.name },
                occurredAt: context.now
            });
            continue;
        }

        // Trava de Progressão Cadenciada: Um império só pode colonizar 1 hexágono por ano.
        if (migratedKingdomsThisCycle.has(kingdom.id)) {
          continue; 
        }
        if (kingdom.administration.automation.expansion === AutomationLevel.Manual) {
          continue; // Expansão orgânica retida por política governamental
        }

        // Atingiu o Teto de Suporte (Carrying Capacity) local
        if (currentPop < MIGRATION_THRESHOLD) {
          continue;
        }

          const validNeighbors = def.neighbors.filter((nid) => {
            const nRegion = state.world.regions[nid];
            const nDef = staticData.definitions[nid];
            return nRegion && nRegion.ownerId === "k_nature" && nDef && !nDef.isWater;
          });

          if (validNeighbors.length === 0) {
            continue;
          }

            // Escolhe aleatoriamente uma direção desabitada
            const targetId = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
            
            // 1. Mutação Geopolítica (POO)
            const targetRegion = state.world.regions[targetId];
            targetRegion.ownerId = region.ownerId;
            targetRegion.controllerId = region.ownerId;
            targetRegion.dominantFaith = region.dominantFaith;
            targetRegion.dominantShare = region.dominantShare;
            targetRegion.minorityFaith = region.minorityFaith;
            targetRegion.minorityShare = region.minorityShare;
            targetRegion.unrest = 0;
            targetRegion.devastation = 0;

            // Mutação local do ECS para suportar progressão offline sem Worker ativo
            if (state.ecs && state.ecs.populationTotal) {
              const targetIdx = indexMap.get(targetId);
              if (targetIdx !== undefined) {
                (state.ecs.populationTotal as any)[i] -= MIGRATION_AMOUNT;
                (state.ecs.populationTotal as any)[targetIdx] += MIGRATION_AMOUNT;
              }
            }

            // 2. Empacota a Intenção Física para a fila
            migrations.push({ sourceId: regionId, targetId, amount: MIGRATION_AMOUNT, kingdomId: region.ownerId });
            
            // Bloqueia o império de fazer múltiplas migrações simultâneas neste mesmo ciclo
            migratedKingdomsThisCycle.add(kingdom.id);
      }

      // Dispara as emissões para a pipeline (Ignoradas no offline, consumidas em tempo real)
      for (const mig of migrations) {
        context.events.push({
          id: createEventId({
            prefix: "evt_mig",
            tick: state.meta.tick,
            systemId: "migration",
            actorId: mig.kingdomId,
            sequence: eventSeq++
          }),
          type: "population.migration",
          actorKingdomId: mig.kingdomId,
          payload: mig,
          occurredAt: context.now
        });
      }
    }
  };
}
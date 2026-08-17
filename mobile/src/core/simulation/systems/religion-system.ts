import { buildEvent } from "../../ecs/event-pool";
import { ReligiousPolicy } from "../../models/enums";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, getOwnedRegionIds, roundTo } from "./utils";
import type { EcsState } from "../../models/game-state";

function getRegionIdx(regionId: string): number {
  return parseInt(regionId.replace("r_hex_", ""), 10);
}

function faithShareEcs(ecs: EcsState, faithRegistry: Record<string, number>, regionIdx: number, faithIdStr: string): number {
  const targetFaithInt = faithRegistry[faithIdStr] ?? 0;
  
  if (ecs.regionDominantFaith[regionIdx] === targetFaithInt) {
    return clamp(ecs.regionDominantShare[regionIdx], 0, 1);
  }
  
  if (ecs.regionMinorityFaith[regionIdx] === targetFaithInt) {
    return clamp(ecs.regionMinorityShare[regionIdx], 0, 1);
  }
  
  return 0;
}

function normalizeSharesEcs(ecs: EcsState, regionIdx: number): void {
  // FUSÃO DE DADOS FANTASMAS: Impede que a mesma religião seja Maioria e Minoria
  if (ecs.regionMinorityFaith[regionIdx] !== 0 && ecs.regionMinorityFaith[regionIdx] === ecs.regionDominantFaith[regionIdx]) {
    ecs.regionDominantShare[regionIdx] += ecs.regionMinorityShare[regionIdx];
    ecs.regionMinorityFaith[regionIdx] = 0;
    ecs.regionMinorityShare[regionIdx] = 0;
  }

  ecs.regionDominantShare[regionIdx] = clamp(ecs.regionDominantShare[regionIdx], 0.05, 0.95);
  ecs.regionMinorityShare[regionIdx] = clamp(ecs.regionMinorityShare[regionIdx], 0.02, 0.5);

  const minority = ecs.regionMinorityShare[regionIdx];
  const total = ecs.regionDominantShare[regionIdx] + minority;

  if (total > 0.98) {
    const overflow = total - 0.98;
    if (minority > 0.02) {
      ecs.regionMinorityShare[regionIdx] = clamp(minority - overflow, 0.02, 0.5);
    } else {
      ecs.regionDominantShare[regionIdx] = clamp(ecs.regionDominantShare[regionIdx] - overflow, 0.05, 0.95);
    }
  }

  if (ecs.regionMinorityShare[regionIdx] <= 0.02) {
    ecs.regionMinorityFaith[regionIdx] = 0;
    ecs.regionMinorityShare[regionIdx] = 0;
  }
}

function applyFaithShareEcs(ecs: EcsState, faithRegistry: Record<string, number>, regionIdx: number, faithIdStr: string, nextShare: number): void {
  const target = clamp(nextShare, 0, 0.95);
  const targetFaithInt = faithRegistry[faithIdStr] ?? 0;

  if (ecs.regionDominantFaith[regionIdx] === targetFaithInt) {
    ecs.regionDominantShare[regionIdx] = target;
  } else if (ecs.regionMinorityFaith[regionIdx] === targetFaithInt) {
    ecs.regionMinorityShare[regionIdx] = target;
  } else if (target >= 0.04) {
    ecs.regionMinorityFaith[regionIdx] = targetFaithInt;
    ecs.regionMinorityShare[regionIdx] = Math.max(0.04, target);
  }

  if (
    ecs.regionMinorityFaith[regionIdx] !== 0 &&
    ecs.regionMinorityShare[regionIdx] > ecs.regionDominantShare[regionIdx]
  ) {
    const oldDominantFaith = ecs.regionDominantFaith[regionIdx];
    const oldDominantShare = ecs.regionDominantShare[regionIdx];
    ecs.regionDominantFaith[regionIdx] = ecs.regionMinorityFaith[regionIdx];
    ecs.regionDominantShare[regionIdx] = ecs.regionMinorityShare[regionIdx];
    ecs.regionMinorityFaith[regionIdx] = oldDominantFaith;
    ecs.regionMinorityShare[regionIdx] = oldDominantShare;
  }

  normalizeSharesEcs(ecs, regionIdx);
}

function listFrontierRegionIds(
  ownerId: string,
  rivalId: string,
  context: Parameters<SimulationSystem["run"]>[0]
): string[] {
  const frontier: string[] = [];
  const ownedRegionIds = getOwnedRegionIds(context.nextState, ownerId);
  const ecs = context.nextState.ecs;
  if (!ecs) return [];

  let rivalFactionId = -1;
  const rivalRegions = getOwnedRegionIds(context.nextState, rivalId);
  if (rivalRegions.length > 0) {
    rivalFactionId = ecs.regionOwner[getRegionIdx(rivalRegions[0])];
  }

  if (rivalFactionId === -1 && rivalId !== "k_nature") return [];

  for (let i = 0; i < ownedRegionIds.length; i++) {
    const regionId = ownedRegionIds[i];
    const neighbors = context.staticData.neighborsByRegionId[regionId] ?? [];
    
    let touchesRival = false;
    for (let j = 0; j < neighbors.length; j++) {
      const nIdx = getRegionIdx(neighbors[j]);
      if (ecs.regionOwner[nIdx] === rivalFactionId) {
        touchesRival = true;
        break;
      }
    }
    
    if (touchesRival) {
      frontier.push(regionId);
    }
  }

  return frontier;
}

export function createReligionSystem(): SimulationSystem {
  return {
    id: "religion",
    run(context): void {
      const state = context.nextState;
      const ecs = state.ecs;
      if (!ecs) return;
      
      const faithRegistry = state.world.faithRegistry;
      const tickScale = Math.max(1, context.tickScale);
      
      const reverseFaithRegistry: Record<number, string> = {};
      for (const [faithStr, faithInt] of Object.entries(faithRegistry)) {
        reverseFaithRegistry[faithInt] = faithStr;
      }

      for (const kingdomId of Object.keys(state.kingdoms).sort()) {
        if (kingdomId === "k_nature") continue;
        const kingdom = state.kingdoms[kingdomId];
        const ownedRegions = getOwnedRegionIds(state, kingdom.id);
        const kingdomFaith = kingdom.religion.stateFaith;
        
        let totalFaithShare = 0;
        for (const rId of ownedRegions) {
          totalFaithShare += faithShareEcs(ecs, faithRegistry, getRegionIdx(rId), kingdomFaith);
        }

        const regionalFaithAverage =
          ownedRegions.length === 0
            ? kingdom.religion.cohesion
            : totalFaithShare / ownedRegions.length;

        const clergySupport = kingdom.population.groups.clergy;
        const budgetSupport = kingdom.economy.budgetPriority.religion / 100;
        kingdom.religion.missionaryBudget = roundTo(clamp(budgetSupport, 0, 1));

        let authorityDelta = clergySupport * 0.012 + budgetSupport * 0.01 - kingdom.population.unrest * 0.008;
        let toleranceDelta = 0;

        switch (kingdom.religion.policy) {
          case ReligiousPolicy.Tolerant:
            toleranceDelta = 0.012;
            authorityDelta -= 0.005;
            break;
          case ReligiousPolicy.Orthodoxy:
            authorityDelta += 0.008;
            toleranceDelta = -0.004;
            break;
          case ReligiousPolicy.Zealous:
            authorityDelta += 0.012;
            toleranceDelta = -0.01;
            break;
        }

        kingdom.religion.authority = roundTo(clamp(kingdom.religion.authority + authorityDelta * tickScale, 0, 1));
        kingdom.religion.tolerance = roundTo(clamp(kingdom.religion.tolerance + toleranceDelta * tickScale, 0, 1));

        const cohesionTarget = clamp(
          regionalFaithAverage * 0.55 + kingdom.religion.authority * 0.28 + (1 - kingdom.religion.tolerance) * 0.17,
          0,
          1
        );

        kingdom.religion.cohesion = roundTo(
          clamp(kingdom.religion.cohesion + (cohesionTarget - kingdom.religion.cohesion) * 0.08 * tickScale, 0, 1)
        );

        let conversionBase = (1 - kingdom.religion.tolerance) * 0.08 + kingdom.religion.authority * 0.07;

        if (kingdom.religion.policy === ReligiousPolicy.Zealous) {
          conversionBase *= 3.0;
        }

        kingdom.religion.conversionPressure = roundTo(clamp(conversionBase, 0, 1.5));

        const influenceKeys = Object.keys(kingdom.religion.externalInfluenceIn).sort();
        for (const sourceId of influenceKeys) {
          const current = kingdom.religion.externalInfluenceIn[sourceId] ?? 0;
          const decayed = clamp(current - 0.002 * tickScale, 0, 1);
          if (decayed <= 0.0001) {
            delete kingdom.religion.externalInfluenceIn[sourceId];
          } else {
            kingdom.religion.externalInfluenceIn[sourceId] = roundTo(decayed, 4);
          }
        }

        for (const sourceId of influenceKeys) {
          const influence = kingdom.religion.externalInfluenceIn[sourceId] ?? 0;
          if (influence <= 0.01) {
            continue;
          }

          const sourceKingdom = state.kingdoms[sourceId];
          if (!sourceKingdom || sourceKingdom.id === kingdom.id) {
            continue;
          }

          const frontierRegionIds = listFrontierRegionIds(kingdom.id, sourceKingdom.id, context);
          if (frontierRegionIds.length === 0) {
            continue;
          }

          const missionaryPower = clamp(
            sourceKingdom.religion.authority * 0.55 + sourceKingdom.religion.missionaryBudget * 0.45,
            0,
            1
          );
          const resistance = clamp(kingdom.religion.tolerance * 0.5 + kingdom.religion.authority * 0.3 + kingdom.stability / 100 * 0.2, 0, 1);
          const pressure = clamp(influence * missionaryPower * (1 - resistance), 0, 1);
          if (pressure <= 0.0005) {
            continue;
          }

          const sourceFaith = sourceKingdom.religion.stateFaith;
          const conversionDeltaBase = pressure * 0.11 * tickScale;
          let regionsWithProgress = 0;

          for (const regionId of frontierRegionIds.slice(0, 6)) {
            const idx = getRegionIdx(regionId);
            const beforeShare = faithShareEcs(ecs, faithRegistry, idx, sourceFaith);
            const beforeDominantFaithInt = ecs.regionDominantFaith[idx];
            
            const faithUnrest = ecs.regionFaithUnrest[idx];
            const nextShare = clamp(beforeShare + conversionDeltaBase * (1 - faithUnrest * 0.35), 0, 1);
            applyFaithShareEcs(ecs, faithRegistry, idx, sourceFaith, nextShare);
            ecs.regionFaithUnrest[idx] = roundTo(clamp(faithUnrest + pressure * 0.05 * tickScale, 0, 1));

            const afterShare = faithShareEcs(ecs, faithRegistry, idx, sourceFaith);
            const targetFaithInt = faithRegistry[sourceFaith] ?? 0;
            if ((beforeShare < 0.3 && afterShare >= 0.3) || (beforeDominantFaithInt !== targetFaithInt && ecs.regionDominantFaith[idx] === targetFaithInt)) {
              regionsWithProgress += 1;
            }
          }

          if (state.meta.tick % Math.max(1, Math.floor(18 / tickScale)) === 0) {
            const evt = buildEvent("religion.mission_started", context.now, {
                influence: roundTo(influence, 4),
                pressure: roundTo(pressure, 4)
              }, sourceKingdom.id, kingdom.id);
            if (evt) {
              evt.id = createEventId({ prefix: "evt_religion", tick: context.nextState.meta.tick, systemId: "religion", actorId: sourceKingdom.id, sequence: context.events.length });
              context.events.push(evt);
            }
          }

          if (regionsWithProgress > 0) {
            const evt = buildEvent("religion.conversion_progress", context.now, {
                regionsWithProgress,
                sourceFaith
              }, sourceKingdom.id, kingdom.id);
            if (evt) {
              evt.id = createEventId({ prefix: "evt_religion", tick: context.nextState.meta.tick, systemId: "religion", actorId: sourceKingdom.id, sequence: context.events.length });
              context.events.push(evt);
            }
          }

          if (influence > 0.8 && kingdom.stability < 35 && state.meta.tick % Math.max(1, Math.floor(20 / tickScale)) === 0) {
            const evt = buildEvent("religion.coup_risk", context.now, {
                influence: roundTo(influence, 4),
                targetStability: roundTo(kingdom.stability, 2)
              }, sourceKingdom.id, kingdom.id);
            if (evt) {
              evt.id = createEventId({ prefix: "evt_religion", tick: context.nextState.meta.tick, systemId: "religion", actorId: sourceKingdom.id, sequence: context.events.length });
              context.events.push(evt);
            }
          }
        }

        let faithConflict = 0;

        for (const regionId of ownedRegions) {
          const idx = getRegionIdx(regionId);
          const currentShare = faithShareEcs(ecs, faithRegistry, idx, kingdomFaith);
          const drift = (kingdom.religion.cohesion - currentShare) * kingdom.religion.conversionPressure * 0.06 * tickScale;
          const nextShare = clamp(currentShare + drift, 0, 1);
          applyFaithShareEcs(ecs, faithRegistry, idx, kingdomFaith, nextShare);

          const heresyLevel = 1 - nextShare;
          
          let schismMultiplier = 1.0;
          const dominantFaithStr = reverseFaithRegistry[ecs.regionDominantFaith[idx]];
          if (dominantFaithStr) {
            const regDomFaithDef = state.world.religions[dominantFaithStr];
            const stateFaithDef = state.world.religions[kingdomFaith];
            
            if (regDomFaithDef && stateFaithDef) {
              const isSchism = regDomFaithDef.parentReligionId === kingdomFaith || stateFaithDef.parentReligionId === dominantFaithStr;
              if (isSchism) schismMultiplier = 2.5;
            }
          }

          const tensionGrowth = heresyLevel * 0.045 * schismMultiplier * (1 - (kingdom.religion.tolerance * 0.5));
          const tensionDecay = 0.005 + (kingdom.religion.tolerance * 0.015);
          
          ecs.regionFaithUnrest[idx] = roundTo(clamp(ecs.regionFaithUnrest[idx] + (tensionGrowth - tensionDecay) * tickScale, 0, 1));

          if (state.meta.tick % 5 === 0) {
            const neighbors = context.staticData.neighborsByRegionId[regionId] ?? [];
            for (const nId of neighbors) {
              const nIdx = getRegionIdx(nId);
              const ownerFaction = ecs.regionOwner[nIdx];
              
              if (ownerFaction === -1) continue;

              const nFaithInt = ecs.regionDominantFaith[nIdx];
              const nFaithStr = reverseFaithRegistry[nFaithInt];
              
              if (nFaithStr && nFaithStr !== kingdomFaith) {
                let nKingdomId: string | null = null;
                const kingdomIds = Object.keys(state.kingdoms);
                for (let k = 0; k < kingdomIds.length; k++) {
                   const kid = kingdomIds[k];
                   if (kid === "k_nature") continue;
                   const kRegs = getOwnedRegionIds(state, kid);
                   if (kRegs.length > 0 && ecs.regionOwner[getRegionIdx(kRegs[0])] === ownerFaction) {
                     nKingdomId = kid;
                     break;
                   }
                }

                if (nKingdomId) {
                  const nKingdom = state.kingdoms[nKingdomId];
                  const osmosisPressure = 0.0005 * 5 * (0.5 + nKingdom.religion.authority * 0.5) * (0.2 + kingdom.religion.tolerance * 0.8);
                  
                  const currentNShare = faithShareEcs(ecs, faithRegistry, idx, nFaithStr);
                  const nextNShare = clamp(currentNShare + osmosisPressure * tickScale, 0, 1);
                  applyFaithShareEcs(ecs, faithRegistry, idx, nFaithStr, nextNShare);
                  
                  ecs.regionFaithUnrest[idx] = roundTo(clamp(ecs.regionFaithUnrest[idx] + osmosisPressure * 0.1 * tickScale, 0, 1));
                }
              }
            }
          }

          const intoleranceFactor = 1 - kingdom.religion.tolerance;
          const unrestLeak = ecs.regionFaithUnrest[idx] * intoleranceFactor * 0.015 * tickScale;

          if (unrestLeak > 0.001) {
            const legacyRegion = state.world.regions[regionId];
            if (legacyRegion) {
              legacyRegion.unrest = roundTo(clamp(legacyRegion.unrest + unrestLeak, 0, 1));
            }
            faithConflict += unrestLeak;
          }
        }

        kingdom.legitimacy = roundTo(
          clamp(kingdom.legitimacy + kingdom.religion.authority * 0.45 + kingdom.religion.cohesion * 0.32 - faithConflict * 8, 0, 100)
        );

        kingdom.stability = roundTo(
          clamp(kingdom.stability + kingdom.religion.cohesion * 0.35 - (1 - kingdom.religion.tolerance) * 0.15 - faithConflict * 4, 0, 100)
        );

        const tensionIndex = (1 - kingdom.religion.tolerance) * 0.55 + faithConflict * 6 + (1 - kingdom.religion.cohesion) * 0.25;

        if (tensionIndex > 0.55 && state.meta.tick % Math.max(1, Math.floor(6 / tickScale)) === 0) {
          const evt = buildEvent("religion.tension", context.now, {
              tolerance: kingdom.religion.tolerance,
              cohesion: kingdom.religion.cohesion,
              tensionIndex: roundTo(tensionIndex)
            }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_religion", tick: context.nextState.meta.tick, systemId: "religion", actorId: kingdom.id, sequence: context.events.length });
            context.events.push(evt);
          }
        }
      }
    }
  };
}

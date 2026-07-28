import { ReligiousPolicy } from "../../models/enums";
import type { RegionState } from "../../models/world";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, getOwnedRegionIds, roundTo } from "./utils";

function faithShare(region: RegionState, faithId: string): number {
  if (region.dominantFaith === faithId) {
    return clamp(region.dominantShare, 0, 1);
  }

  if (region.minorityFaith === faithId) {
    return clamp(region.minorityShare ?? 0, 0, 1);
  }

  return 0;
}

function normalizeShares(region: RegionState): void {
  // FUSÃO DE DADOS FANTASMAS: Impede que a mesma religião seja Maioria e Minoria
  if (region.minorityFaith && region.minorityFaith === region.dominantFaith) {
    region.dominantShare += (region.minorityShare ?? 0);
    region.minorityFaith = undefined;
    region.minorityShare = undefined;
  }

  region.dominantShare = clamp(region.dominantShare, 0.05, 0.95);
  if (typeof region.minorityShare === "number") {
    region.minorityShare = clamp(region.minorityShare, 0.02, 0.5);
  }

  const minority = region.minorityShare ?? 0;
  const total = region.dominantShare + minority;

  if (total > 0.98) {
    const overflow = total - 0.98;
    if ((region.minorityShare ?? 0) > 0.02) {
      region.minorityShare = clamp((region.minorityShare ?? 0) - overflow, 0.02, 0.5);
    } else {
      region.dominantShare = clamp(region.dominantShare - overflow, 0.05, 0.95);
    }
  }

  const refreshedMinority = region.minorityShare ?? 0;
  if (refreshedMinority <= 0.02) {
    region.minorityFaith = undefined;
    region.minorityShare = undefined;
  }
}

function applyFaithShare(region: RegionState, faithId: string, nextShare: number): void {
  const target = clamp(nextShare, 0, 0.95);

  if (region.dominantFaith === faithId) {
    region.dominantShare = target;
  } else if (region.minorityFaith === faithId) {
    region.minorityShare = target;
  } else if (target >= 0.04) {
    region.minorityFaith = faithId;
    region.minorityShare = Math.max(0.04, target);
  }

  if (
    region.minorityFaith &&
    typeof region.minorityShare === "number" &&
    region.minorityShare > region.dominantShare
  ) {
    const oldDominantFaith = region.dominantFaith;
    const oldDominantShare = region.dominantShare;
    region.dominantFaith = region.minorityFaith;
    region.dominantShare = region.minorityShare;
    region.minorityFaith = oldDominantFaith;
    region.minorityShare = oldDominantShare;
  }

  normalizeShares(region);
}

function listFrontierRegionIds(
  ownerId: string,
  rivalId: string,
  context: Parameters<SimulationSystem["run"]>[0]
): string[] {
  const frontier: string[] = [];
  const allRegionIds = Object.keys(context.nextState.world.regions).sort();

  for (const regionId of allRegionIds) {
    const region = context.nextState.world.regions[regionId];
    if (region.ownerId !== ownerId) {
      continue;
    }

    const neighbors = context.staticData.neighborsByRegionId[regionId] ?? [];
    const touchesRival = neighbors.some((neighborId) => context.nextState.world.regions[neighborId]?.ownerId === rivalId);
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
      const tickScale = Math.max(1, context.tickScale);
      let eventSeq = 0;

      for (const kingdomId of Object.keys(state.kingdoms).sort()) {
        if (kingdomId === "k_nature") continue;
        const kingdom = state.kingdoms[kingdomId];
        const ownedRegions = getOwnedRegionIds(state, kingdom.id);
        const kingdomFaith = kingdom.religion.stateFaith;
        const regionalFaithAverage =
          ownedRegions.length === 0
            ? kingdom.religion.cohesion
            : ownedRegions.reduce((total, regionId) => total + faithShare(state.world.regions[regionId], kingdomFaith), 0) / ownedRegions.length;

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

        // A política Fanática (Zelosa) triplica a pressão de conversão interna
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
            const region = state.world.regions[regionId];
            const beforeShare = faithShare(region, sourceFaith);
            const beforeDominantFaith = region.dominantFaith;
            const nextShare = clamp(beforeShare + conversionDeltaBase * (1 - region.faithUnrest * 0.35), 0, 1);
            applyFaithShare(region, sourceFaith, nextShare);
            region.faithUnrest = roundTo(clamp(region.faithUnrest + pressure * 0.05 * tickScale, 0, 1));

            const afterShare = faithShare(region, sourceFaith);
            if ((beforeShare < 0.3 && afterShare >= 0.3) || (beforeDominantFaith !== sourceFaith && region.dominantFaith === sourceFaith)) {
              regionsWithProgress += 1;
            }
          }

          if (state.meta.tick % Math.max(1, Math.floor(18 / tickScale)) === 0) {
            context.events.push({
              id: createEventId({
                prefix: "evt_religion",
                tick: state.meta.tick,
                systemId: "religion",
                actorId: sourceKingdom.id,
                sequence: eventSeq++
              }),
              type: "religion.mission_started",
              actorKingdomId: sourceKingdom.id,
              targetKingdomId: kingdom.id,
              payload: {
                influence: roundTo(influence, 4),
                pressure: roundTo(pressure, 4)
              },
              occurredAt: context.now
            });
          }

          if (regionsWithProgress > 0) {
            context.events.push({
              id: createEventId({
                prefix: "evt_religion",
                tick: state.meta.tick,
                systemId: "religion",
                actorId: sourceKingdom.id,
                sequence: eventSeq++
              }),
              type: "religion.conversion_progress",
              actorKingdomId: sourceKingdom.id,
              targetKingdomId: kingdom.id,
              payload: {
                regionsWithProgress,
                sourceFaith
              },
              occurredAt: context.now
            });
          }

          if (influence > 0.8 && kingdom.stability < 35 && state.meta.tick % Math.max(1, Math.floor(20 / tickScale)) === 0) {
            context.events.push({
              id: createEventId({
                prefix: "evt_religion",
                tick: state.meta.tick,
                systemId: "religion",
                actorId: sourceKingdom.id,
                sequence: eventSeq++
              }),
              type: "religion.coup_risk",
              actorKingdomId: sourceKingdom.id,
              targetKingdomId: kingdom.id,
              payload: {
                influence: roundTo(influence, 4),
                targetStability: roundTo(kingdom.stability, 2)
              },
              occurredAt: context.now
            });
          }
        }

        let faithConflict = 0;

        for (const regionId of ownedRegions) {
          const region = state.world.regions[regionId];
          const currentShare = faithShare(region, kingdomFaith);
          const drift = (kingdom.religion.cohesion - currentShare) * kingdom.religion.conversionPressure * 0.06 * tickScale;
          const nextShare = clamp(currentShare + drift, 0, 1);
          applyFaithShare(region, kingdomFaith, nextShare);

          // NOVA MECÂNICA: Atrito Religioso e Choque de Fé
          // A heresia é a ausência da fé estatal na província (0 = 100% nossa religião, 1 = 0%)
          const heresyLevel = 1 - nextShare;
          
          // MECÂNICA DE CISMA: Verifica se a província é herege ou ortodoxa em relação à fé estatal
          let schismMultiplier = 1.0;
          const regDomFaithDef = state.world.religions[region.dominantFaith];
          const stateFaithDef = state.world.religions[kingdomFaith];
          
          if (regDomFaithDef && stateFaithDef) {
            const isSchism = regDomFaithDef.parentReligionId === kingdomFaith || stateFaithDef.parentReligionId === region.dominantFaith;
            if (isSchism) schismMultiplier = 2.5; // O ódio sectário multiplica a instabilidade civil em 250%
          }

          // A Tensão Religiosa cresce em terras hereges, mitigada se o império for tolerante
          const tensionGrowth = heresyLevel * 0.045 * schismMultiplier * (1 - (kingdom.religion.tolerance * 0.5));
          const tensionDecay = 0.005 + (kingdom.religion.tolerance * 0.015);
          
          region.faithUnrest = roundTo(clamp(region.faithUnrest + (tensionGrowth - tensionDecay) * tickScale, 0, 1));

          // MECÂNICA DE OSMOSE: Difusão orgânica de religiões pelas fronteiras
          // Roda a cada 5 ciclos para proteger a CPU, compensando a força com multiplicador 5x
          if (state.meta.tick % 5 === 0) {
            const neighbors = context.staticData.neighborsByRegionId[regionId] ?? [];
            for (const nId of neighbors) {
              const nRegion = state.world.regions[nId];
              if (!nRegion || nRegion.ownerId === "k_nature") continue;

              const nFaith = nRegion.dominantFaith;
              if (nFaith !== kingdomFaith) {
                const nKingdom = state.kingdoms[nRegion.ownerId];
                if (nKingdom) {
                  // Pressão base de 0.05% por pulso. Escala com o Fanatismo vizinho e a sua Tolerância.
                  const osmosisPressure = 0.0005 * 5 * (0.5 + nKingdom.religion.authority * 0.5) * (0.2 + kingdom.religion.tolerance * 0.8);
                  
                  const currentShare = faithShare(region, nFaith);
                  const nextShare = clamp(currentShare + osmosisPressure * tickScale, 0, 1);
                  applyFaithShare(region, nFaith, nextShare);
                  
                  // A fricção de borda gera uma leve tensão constante
                  region.faithUnrest = roundTo(clamp(region.faithUnrest + osmosisPressure * 0.1 * tickScale, 0, 1));
                }
              }
            }
          }

          // EFEITO CASCATA: A Tensão Religiosa vaza e alimenta a Instabilidade Civil (Unrest)
          // Se o governo é intolerante, os hereges se armam e a província entra em ebulição
          const intoleranceFactor = 1 - kingdom.religion.tolerance;
          const unrestLeak = region.faithUnrest * intoleranceFactor * 0.015 * tickScale;

          if (unrestLeak > 0.001) {
            region.unrest = roundTo(clamp(region.unrest + unrestLeak, 0, 1));
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
          context.events.push({
            id: createEventId({
              prefix: "evt_religion",
              tick: state.meta.tick,
              systemId: "religion",
              actorId: kingdom.id,
              sequence: eventSeq++
            }),
            type: "religion.tension",
            actorKingdomId: kingdom.id,
            payload: {
              tolerance: kingdom.religion.tolerance,
              cohesion: kingdom.religion.cohesion,
              tensionIndex: roundTo(tensionIndex)
            },
            occurredAt: context.now
          });
        }
      }
    }
  };
}

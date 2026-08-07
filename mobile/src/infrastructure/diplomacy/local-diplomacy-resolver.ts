import type { DiplomacyResolver, NpcDecision } from "../../core/contracts/services";
import type { BilateralRelation, Treaty } from "../../core/models/diplomacy";
import { DiplomaticRelation, TreatyType, ResourceType } from "../../core/models/enums";
import type { GameState, KingdomState } from "../../core/models/game-state";
import { buildTreatyId, sortUniqueIds } from "../../core/models/identifiers";
import type { KingdomId } from "../../core/models/types";
import type { DomainEvent } from "../../core/models/events";

const DEFAULT_TREATY_DURATION_MS = 1000 * 60 * 18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getOwnedRegionCount(state: GameState, kingdomId: KingdomId): number {
  let total = 0;

  for (const regionId of Object.keys(state.world.regions).sort()) {
    const region = state.world.regions[regionId];
    if (region.ownerId === kingdomId) {
      total += 1;
    }
  }

  return total;
}

function buildTerritoryCounts(state: GameState): Map<KingdomId, number> {
  const counts = new Map<KingdomId, number>();

  for (const kingdomId of Object.keys(state.kingdoms).sort()) {
    counts.set(kingdomId, 0);
  }

  for (const regionId of Object.keys(state.world.regions).sort()) {
    const ownerId = state.world.regions[regionId].ownerId;
    counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
  }

  return counts;
}

function ensureRelation(kingdom: KingdomState, otherKingdomId: KingdomId): BilateralRelation {
  const existing = kingdom.diplomacy.relations[otherKingdomId];
  if (existing) {
    return existing;
  }

  const created: BilateralRelation = {
    withKingdomId: otherKingdomId,
    status: DiplomaticRelation.Neutral,
    score: {
      trust: 0.4,
      fear: 0.2,
      rivalry: 0.2,
      religiousTension: 0.2,
      borderTension: 0.2,
      tradeValue: 0.2
    },
    grievance: 0.08,
    allianceStrength: 0,
    actionCooldowns: {}
  };

  kingdom.diplomacy.relations[otherKingdomId] = created;
  return created;
}

function setPairStatus(state: GameState, leftId: KingdomId, rightId: KingdomId, status: DiplomaticRelation): void {
  const left = state.kingdoms[leftId];
  const right = state.kingdoms[rightId];

  if (!left || !right) {
    return;
  }

  ensureRelation(left, rightId).status = status;
  ensureRelation(right, leftId).status = status;
}

function hasActiveTreaty(state: GameState, kingdomIdA: KingdomId, kingdomIdB: KingdomId, type: TreatyType, now: number): boolean {
  const kingdom = state.kingdoms[kingdomIdA];
  if (!kingdom) {
    return false;
  }

  return kingdom.diplomacy.treaties.some((treaty) => {
    const matchesType = treaty.type === type;
    const matchesParties = treaty.parties.includes(kingdomIdA) && treaty.parties.includes(kingdomIdB);
    const active = treaty.expiresAt === null || treaty.expiresAt > now;
    return matchesType && matchesParties && active;
  });
}

function addTreaty(kingdom: KingdomState, treaty: Treaty): void {
  const index = kingdom.diplomacy.treaties.findIndex((current) => current.id === treaty.id);

  if (index >= 0) {
    kingdom.diplomacy.treaties[index] = treaty;
    return;
  }

  kingdom.diplomacy.treaties.push(treaty);
}

export function registerPairTreaty(
  state: GameState,
  leftId: KingdomId,
  rightId: KingdomId,
  type: TreatyType,
  now: number,
  expiresAt: number | null,
  terms: Record<string, number | string | boolean>
): void {
  const left = state.kingdoms[leftId];
  const right = state.kingdoms[rightId];

  if (!left || !right) {
    return;
  }

  if (type !== TreatyType.Embargo && type !== TreatyType.JointWar) {
    const warIds = Object.keys(state.wars || {}).filter(wId => {
      const w = state.wars[wId];
      const leftInWar = w.attackers.includes(leftId) || w.defenders.includes(leftId);
      const rightInWar = w.attackers.includes(rightId) || w.defenders.includes(rightId);
      return leftInWar && rightInWar;
    });
    
    for (const wId of warIds) {
      delete state.wars[wId];
    }
    
    if (warIds.length > 0) {
      const leftRel = left.diplomacy.relations[rightId];
      if (leftRel && leftRel.status === DiplomaticRelation.Hostile) {
        leftRel.status = DiplomaticRelation.Truce;
      }
      const rightRel = right.diplomacy.relations[leftId];
      if (rightRel && rightRel.status === DiplomaticRelation.Hostile) {
        rightRel.status = DiplomaticRelation.Truce;
      }
    }
  }

  const parties = sortUniqueIds([leftId, rightId]);
  const treatyId = buildTreatyId(type, parties, now);
  const treaty: Treaty = {
    id: treatyId,
    type,
    parties,
    signedAt: now,
    expiresAt,
    terms
  };

  addTreaty(left, treaty);
  addTreaty(right, treaty);

  state.domainEventQueue = state.domainEventQueue || [];
  state.domainEventQueue.push({
    id: `treaty_${now}_${treatyId}`,
    type: "diplomacy.treaty_signed",
    payload: { 
      treatyType: type, 
      parties: treaty.parties,
      leftId,
      rightId
    },
    occurredAt: now,
    actorKingdomId: leftId,
    targetKingdomId: rightId
  } as unknown as DomainEvent);
}

export function proposeTreaty(
  state: GameState,
  senderId: KingdomId,
  targetId: KingdomId,
  type: TreatyType,
  now: number,
  expiresAt: number,
  durationMs?: number | null,
  terms?: Record<string, number | string | boolean>
): void {
  const target = state.kingdoms[targetId];
  if (!target) return;

  const proposalId = `prop_${now}_${senderId}_${targetId}_${type}`;
  
  target.diplomacy.proposals = target.diplomacy.proposals || [];
  target.diplomacy.proposals.push({
    id: proposalId,
    senderId,
    treatyType: type,
    expiresAt,
    durationMs,
    terms
  });

  state.domainEventQueue = state.domainEventQueue || [];
  state.domainEventQueue.push({
    id: `evt_prop_${now}_${proposalId}`,
    type: "diplomacy.proposal_received",
    payload: { proposalId, senderId, targetId, treatyType: type },
    occurredAt: now,
    actorKingdomId: senderId,
    targetKingdomId: targetId
  } as unknown as DomainEvent);
}

export function resolveProposal(
  state: GameState,
  proposalId: string,
  targetId: KingdomId,
  accepted: boolean,
  now: number
): void {
  const target = state.kingdoms[targetId];
  if (!target || !target.diplomacy.proposals) return;

  const idx = target.diplomacy.proposals.findIndex(p => p.id === proposalId);
  if (idx < 0) return;

  const proposal = target.diplomacy.proposals[idx];
  target.diplomacy.proposals.splice(idx, 1);

  if (accepted) {
    registerPairTreaty(
      state, 
      proposal.senderId, 
      targetId, 
      proposal.treatyType, 
      now, 
      proposal.durationMs ? now + proposal.durationMs : null, 
      proposal.terms || {}
    );
  } else {
    const relation = target.diplomacy.relations[proposal.senderId];
    if (relation) {
      relation.score.trust = Math.max(0, relation.score.trust - 0.05);
      relation.grievance = Math.min(1, relation.grievance + 0.02);
    }
  }
}

function softenRelationForPeace(relation: BilateralRelation): void {
  relation.grievance = roundTo(clamp(relation.grievance - 0.12, 0, 1));
  relation.score.rivalry = roundTo(clamp(relation.score.rivalry - 0.08, 0, 1));
  relation.score.borderTension = roundTo(clamp(relation.score.borderTension - 0.05, 0, 1));
  relation.score.trust = roundTo(clamp(relation.score.trust + 0.04, 0, 1));
}
function executeBilateralTreaty(
  state: GameState,
  actorId: KingdomId,
  targetId: KingdomId,
  treatyType: TreatyType,
  now: number,
  durationMs: number | null,
  terms: Record<string, number | string | boolean>,
  onNpcAccept: () => void
): void {
  const target = state.kingdoms[targetId];
  if (!target) return;

  if (target.isPlayer) {
    const PROPOSAL_LIFETIME_MS = state.meta.tickDurationMs * 6;
    proposeTreaty(state, actorId, targetId, treatyType, now, now + PROPOSAL_LIFETIME_MS, durationMs, terms);
  } else {
    onNpcAccept();
    registerPairTreaty(state, actorId, targetId, treatyType, now, durationMs ? now + durationMs : null, terms);
  }
}

export class LocalDiplomacyResolver implements DiplomacyResolver {
  resolveTick(state: GameState, now: number): GameState {
    const player = Object.keys(state.kingdoms)
      .sort()
      .map((kingdomId) => state.kingdoms[kingdomId])
      .find((kingdom) => kingdom.isPlayer);
    const totalRegions = Math.max(1, Object.keys(state.world.regions).length);
    const territoryCounts = buildTerritoryCounts(state);
    const playerTerritoryShare = player ? getOwnedRegionCount(state, player.id) / totalRegions : 0;
    const dominantEntry = Array.from(territoryCounts.entries()).sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })[0];
    const dominantKingdomId = dominantEntry?.[0] ?? null;
    const dominantShare = dominantEntry ? dominantEntry[1] / totalRegions : 0;

    for (const kingdomId of Object.keys(state.kingdoms).sort()) {
      const kingdom = state.kingdoms[kingdomId];
      kingdom.diplomacy.treaties = kingdom.diplomacy.treaties.filter(
        (treaty) => treaty.expiresAt === null || treaty.expiresAt > now
      );

      if (kingdom.diplomacy.proposals) {
        const expired = kingdom.diplomacy.proposals.filter(p => p.expiresAt <= now);
        for (const p of expired) {
          resolveProposal(state, p.id, kingdom.id, false, now);
        }
      }

      for (const relationId of Object.keys(kingdom.diplomacy.relations).sort()) {
        const relation = kingdom.diplomacy.relations[relationId];
        relation.actionCooldowns = relation.actionCooldowns ?? {};
        const hostilityBias = relation.status === DiplomaticRelation.Hostile ? 0.012 : 0;
        const alliedBias = relation.status === DiplomaticRelation.Allied ? 0.009 : 0;

        const personality = kingdom.npc?.personality ?? {
          ambition: 0.5,
          caution: 0.5,
          greed: 0.5,
          zeal: 0.5,
          honor: 0.5,
          betrayalTendency: 0.2
        };

        const seedStr = `${kingdom.id}->${relationId}`;
        let charCodeSum = 0;
        for (let i = 0; i < seedStr.length; i++) {
          charCodeSum += seedStr.charCodeAt(i);
        }
        const trustWave = Math.sin((state.meta.tick + charCodeSum) * 0.15) * 0.003;
        const rivalryWave = Math.cos((state.meta.tick + charCodeSum) * 0.12) * 0.003;

        const trustAdjustment = (personality.honor * 0.003) - (personality.betrayalTendency * 0.002) + trustWave;
        const rivalryAdjustment = (personality.ambition * 0.003) - (personality.honor * 0.002) + rivalryWave;

        relation.score.trust = roundTo(clamp(relation.score.trust + alliedBias - hostilityBias - relation.grievance * 0.008 + 0.002 + trustAdjustment, 0, 1));
        relation.score.rivalry = roundTo(
          clamp(relation.score.rivalry + relation.score.borderTension * 0.004 + hostilityBias * 0.7 - alliedBias * 0.5 + rivalryAdjustment, 0, 1)
        );
        relation.score.fear = roundTo(clamp(relation.score.fear + relation.score.rivalry * 0.003 - relation.score.trust * 0.002, 0, 1));
        relation.score.tradeValue = roundTo(clamp(relation.score.tradeValue + relation.score.trust * 0.003 - relation.score.rivalry * 0.003, 0, 1));

        if (relation.status === DiplomaticRelation.Hostile) {
          relation.grievance = roundTo(clamp(relation.grievance + 0.004, 0, 1));
        } else {
          relation.grievance = roundTo(clamp(relation.grievance - 0.003, 0, 1));
        }

        const isSovereignStatus = [
          DiplomaticRelation.Allied,
          DiplomaticRelation.Truce,
          DiplomaticRelation.Vassal,
          DiplomaticRelation.Overlord,
          DiplomaticRelation.Hostile
        ].includes(relation.status);

        if (!isSovereignStatus) {
          if (relation.grievance > 0.72 || (relation.score.rivalry > 0.64 && relation.score.trust < 0.28)) {
            relation.status = DiplomaticRelation.Hostile;
          } else if (relation.score.trust > 0.62 && relation.score.rivalry < 0.45) {
            relation.status = DiplomaticRelation.Friendly;
          } else {
            relation.status = DiplomaticRelation.Neutral;
          }
        }

        // MECÂNICA DE CISMA: Ódio diplomático entre a fé-mãe e a heresia.
        const otherKingdom = state.kingdoms[relationId];
        if (otherKingdom) {
          const kingdomFaithDef = state.world.religions[kingdom.religion.stateFaith];
          const otherFaithDef = state.world.religions[otherKingdom.religion.stateFaith];

          if (kingdomFaithDef && otherFaithDef) {
            const isSchism = kingdomFaithDef.parentReligionId === otherFaithDef.id || otherFaithDef.parentReligionId === kingdomFaithDef.id;
            if (isSchism) {
              relation.score.trust = roundTo(clamp(relation.score.trust - 0.025, 0, 1)); // Ódio corrói a confiança
              relation.score.rivalry = roundTo(clamp(relation.score.rivalry + 0.015, 0, 1)); // Aumenta a rivalidade
              relation.grievance = roundTo(clamp(relation.grievance + 0.01, 0, 1)); // Gera agravo contínuo
            }
          }
        }
      }

      if (dominantKingdomId && dominantKingdomId !== kingdom.id) {
        const ownShare = (territoryCounts.get(kingdom.id) ?? 0) / totalRegions;
        const dominantPressure = clamp((dominantShare - ownShare) * 1.45, 0, 1);
        const relationToDominant = kingdom.diplomacy.relations[dominantKingdomId];

        if (relationToDominant && dominantPressure > 0.08) {
          relationToDominant.score.rivalry = roundTo(clamp(relationToDominant.score.rivalry + 0.004 + dominantPressure * 0.012, 0, 1));
          relationToDominant.score.fear = roundTo(clamp(relationToDominant.score.fear + 0.005 + dominantPressure * 0.014, 0, 1));
          relationToDominant.score.trust = roundTo(clamp(relationToDominant.score.trust - 0.003 - dominantPressure * 0.01, 0, 1));
        }

        if (!kingdom.isPlayer && dominantPressure > 0.16) {
          for (const relationId of Object.keys(kingdom.diplomacy.relations).sort()) {
            if (relationId === dominantKingdomId || relationId === kingdom.id) {
              continue;
            }

            const allyShare = (territoryCounts.get(relationId) ?? 0) / totalRegions;
            if (dominantShare - allyShare <= 0.08) {
              continue;
            }

            const relation = kingdom.diplomacy.relations[relationId];
            relation.score.trust = roundTo(clamp(relation.score.trust + 0.004, 0, 1));
            relation.score.rivalry = roundTo(clamp(relation.score.rivalry - 0.003, 0, 1));
          }
        }
      }

      // APLICAÇÃO DE BENEFÍCIOS ECONÔMICOS DOS ACORDOS COMERCIAIS
      for (const treaty of kingdom.diplomacy.treaties) {
        if (treaty.type === TreatyType.TradeAgreement && (treaty.expiresAt === null || treaty.expiresAt > now)) {
          // Para cada acordo comercial ativo, aplica bônus econômico
          const tradeBonus = (treaty.terms.tradeBonus as number) || 0.05;

          // Bônus de crescimento populacional e econômico
          kingdom.population.growthRatePerTick = roundTo(clamp(kingdom.population.growthRatePerTick + tradeBonus * 0.00005, 0.00001, 0.001), 6);

          // Redução de corrupção devido ao comércio
          kingdom.economy.corruption = roundTo(clamp(kingdom.economy.corruption - tradeBonus * 0.02, 0, 1));

          // Aumento do bem-estar populacional devido ao comércio
          kingdom.population.unrest = roundTo(clamp(kingdom.population.unrest - tradeBonus * 0.05, 0, 1));
        }
      }

      // SISTEMA DE PACTOS DEFENSIVOS: Verifica se aliados estão sendo atacados
      for (const treaty of kingdom.diplomacy.treaties) {
        if (treaty.type === TreatyType.DefensivePact && (treaty.expiresAt === null || treaty.expiresAt > now)) {
          // Para cada pacto defensivo ativo, verifica se o aliado está em guerra
          const allyId = treaty.parties.find(p => p !== kingdom.id);
          if (allyId) {
            const ally = state.kingdoms[allyId];
            if (ally) {
              // Verifica se o aliado está sendo atacado
              const allyWars = Object.values(state.wars).filter(war =>
                war.defenders.includes(allyId) &&
                !war.defenders.includes(kingdom.id) && // Não estamos já defendendo
                war.attackers.some(attacker => !war.defenders.includes(attacker)) // Guerra ativa
              );

              if (allyWars.length > 0 && !kingdom.isPlayer) {
                // Aliado está sendo atacado - devemos declarar guerra em defesa
                const warToJoin = allyWars[0]; // Junta-se à primeira guerra ativa

                // Verifica se já não estamos em guerra com os atacantes
                const alreadyAtWar = warToJoin.attackers.some(attacker =>
                  Object.values(state.wars).some(w =>
                    (w.attackers.includes(kingdom.id) && w.defenders.includes(attacker)) ||
                    (w.defenders.includes(kingdom.id) && w.attackers.includes(attacker))
                  )
                );

                if (!alreadyAtWar && kingdom.diplomacy.warExhaustion < 0.8) {
                  // Declara guerra em defesa do aliado
                  const newWarId = `war_${kingdom.id}_${warToJoin.attackers[0]}_${now}`;
                  state.wars[newWarId] = {
                    id: newWarId,
                    attackers: [kingdom.id],
                    defenders: warToJoin.attackers,
                    startedAt: now,
                    warScore: 0,
                    fronts: [],
                    casualties: {}
                  };

                  // Atualiza exaustão de guerra
                  kingdom.diplomacy.warExhaustion = roundTo(clamp(kingdom.diplomacy.warExhaustion + 0.15, 0, 1));

                  // Honra o pacto defensivo - aumenta confiança com o aliado
                  const allyRelation = ensureRelation(kingdom, allyId);
                  allyRelation.score.trust = roundTo(clamp(allyRelation.score.trust + 0.1, 0, 1));
                  allyRelation.grievance = roundTo(clamp(allyRelation.grievance - 0.05, 0, 1));
                }
              }
            }
          }
        }
      }
      // SISTEMA DE COALIZÃO SECRETA: Ódio emerge matematicamente
      for (const treaty of kingdom.diplomacy.treaties) {
        if (treaty.type === TreatyType.SecretCoalition && (treaty.expiresAt === null || treaty.expiresAt > now)) {
          const coalitionTargetId = String(treaty.terms?.targetKingdomId);
          if (coalitionTargetId && coalitionTargetId !== "undefined") {
            const relation = ensureRelation(kingdom, coalitionTargetId);
            // Boost pesado de ódio. Em poucos ticks, a IA chegará ao teto e declarará guerra/embargo.
            relation.grievance = roundTo(clamp(relation.grievance + 0.08, 0, 1));
            relation.score.rivalry = roundTo(clamp(relation.score.rivalry + 0.12, 0, 1));
            relation.score.fear = roundTo(clamp(relation.score.fear + 0.05, 0, 1));
          }
        }
      }

      if (!kingdom.isPlayer) {
        const threatTargetId = dominantKingdomId ?? player?.id;
        const relationToThreat = threatTargetId ? kingdom.diplomacy.relations[threatTargetId] : undefined;
        const rivalry = relationToThreat?.score.rivalry ?? 0.3;
        const trust = relationToThreat?.score.trust ?? 0.4;
        const pressure = threatTargetId === player?.id ? playerTerritoryShare : dominantShare;

        kingdom.diplomacy.coalitionThreat = roundTo(
          clamp(pressure * 0.7 + rivalry * 0.22 + (1 - trust) * 0.16 + kingdom.diplomacy.warExhaustion * 0.12, 0, 1)
        );
      }
    }

    return state;
  }

  applyDecision(state: GameState, decision: NpcDecision): GameState {
    const actor = state.kingdoms[decision.actorKingdomId];
    const targetId = decision.targetKingdomId;

    if (!actor || !targetId) {
      return state;
    }

    const target = state.kingdoms[targetId];
    if (!target) {
      return state;
    }

    const now = state.meta.lastUpdatedAt;
    const actorRelation = ensureRelation(actor, target.id);
    const targetRelation = ensureRelation(target, actor.id);

    switch (decision.actionType) {
      case "formar_coalizao": {
        const coalTargetId = String(decision.payload?.targetKingdomId);
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.SecretCoalition, now, DEFAULT_TREATY_DURATION_MS * 4, { targetKingdomId: coalTargetId }, () => {
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.15, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.15, 0, 1));
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Friendly);
        });
        break;
      }
      case "oferta_alianca": {
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.Alliance, now, DEFAULT_TREATY_DURATION_MS * 2, { militarySupport: true }, () => {
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.12, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.12, 0, 1));
          actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.06, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.06, 0, 1));
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Allied);
        });
        break;
      }
      case "pressao_fronteirica": {
        actorRelation.score.rivalry = roundTo(clamp(actorRelation.score.rivalry + 0.05, 0, 1));
        actorRelation.score.borderTension = roundTo(clamp(actorRelation.score.borderTension + 0.07, 0, 1));
        targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear + 0.08, 0, 1));
        targetRelation.score.rivalry = roundTo(clamp(targetRelation.score.rivalry + 0.06, 0, 1));
        targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.08, 0, 1));

        if (targetRelation.grievance > 0.52) {
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Hostile);
        }

        break;
      }
      case "embargo_comercial": {
        actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue - 0.12, 0, 1));
        targetRelation.score.tradeValue = roundTo(clamp(targetRelation.score.tradeValue - 0.2, 0, 1));
        targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.1, 0, 1));

        registerPairTreaty(state, actor.id, target.id, TreatyType.Embargo, now, now + DEFAULT_TREATY_DURATION_MS, {
          blockedRoutes: true
        });

        break;
      }
      case "pacto_nao_agressao": {
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.NonAggression, now, DEFAULT_TREATY_DURATION_MS * 2, { noBorderWar: true }, () => {
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.06, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.06, 0, 1));
          actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.04, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.04, 0, 1));
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Friendly);
        });
        break;
      }
      case "exigir_tributo": {
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.Tribute, now, null, { overlordId: actor.id, vassalId: target.id, tributeRate: 0.1 }, () => {
          actorRelation.score.fear = roundTo(clamp(actorRelation.score.fear + 0.09, 0, 1));
          targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear + 0.12, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.08, 0, 1));
          actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue + 0.04, 0, 1));
        });
        break;
      }
      case "oferecer_tributo": {
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.Tribute, now, null, { overlordId: target.id, vassalId: actor.id, tributeRate: 0.1 }, () => {
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.15, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.2, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.2, 0, 1));
        });
        break;
      }
      case "romper_tributo": {
        actor.diplomacy.treaties = actor.diplomacy.treaties.filter(t => t.type !== TreatyType.Tribute || !t.parties.includes(target.id));
        target.diplomacy.treaties = target.diplomacy.treaties.filter(t => t.type !== TreatyType.Tribute || !t.parties.includes(actor.id));
        
        targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.25, 0, 1));
        targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust - 0.3, 0, 1));
        
        // Breaking a tribute unilaterally causes massive relation hits
        break;
      }
      case "exigir_vassalagem": {
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.Vassalage, now, null, { overlordId: actor.id, vassalId: target.id, tributeRate: 0.15 }, () => {
          actorRelation.score.fear = roundTo(clamp(actorRelation.score.fear + 0.15, 0, 1));
          targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear + 0.2, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.15, 0, 1));
          ensureRelation(actor, target.id).status = DiplomaticRelation.Vassal;
          ensureRelation(target, actor.id).status = DiplomaticRelation.Overlord;
        });
        break;
      }
      case "oferecer_rendicao": {
        // NPC offers to become a vassal (TreatyType.Vassalage)
        // If target accepts, target is Overlord, actor is Vassal.
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.Vassalage, now, null, { overlordId: target.id, vassalId: actor.id, tributeRate: 0.15 }, () => {
          actorRelation.score.fear = roundTo(clamp(actorRelation.score.fear + 0.15, 0, 1));
          targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear + 0.2, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.15, 0, 1));
          ensureRelation(actor, target.id).status = DiplomaticRelation.Vassal;
          ensureRelation(target, actor.id).status = DiplomaticRelation.Overlord;
          
          // Also set truce to stop the war
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Truce);
        });
        break;
      }
      case "proposta_paz":
      case "oferecer_paz_branca": {
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.Peace, now, DEFAULT_TREATY_DURATION_MS, { borderFreeze: true }, () => {
          softenRelationForPeace(actorRelation);
          softenRelationForPeace(targetRelation);
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Truce);
        });
        break;
      }
      case "declarar_guerra": {
        actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust - 0.15, 0, 1));
        targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust - 0.2, 0, 1));
        actorRelation.grievance = roundTo(clamp(actorRelation.grievance + 0.12, 0, 1));
        targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.18, 0, 1));

        for (const kid of [actor.id, target.id]) {
          const kObj = state.kingdoms[kid];
          if (kObj && kObj.diplomacy && kObj.diplomacy.treaties) {
            kObj.diplomacy.treaties = kObj.diplomacy.treaties.filter(
              t => !(
                (t.type === TreatyType.Peace || t.type === TreatyType.NonAggression) &&
                t.parties.includes(actor.id) &&
                t.parties.includes(target.id)
              )
            );
          }
        }

        setPairStatus(state, actor.id, target.id, DiplomaticRelation.Hostile);
        break;
      }
      case "acordo_comercial": {
        // Define termos do acordo comercial baseado na diferença econômica
        const actorEconomy = actor.population.growthRatePerTick;
        const targetEconomy = target.population.growthRatePerTick;
        const tradeTerms = {
          tariffRate: 0.05, // 5% de tarifa reduzida
          tradeBonus: Math.abs(actorEconomy - targetEconomy) * 0.1, // Bônus baseado na diferença econômica
          duration: DEFAULT_TREATY_DURATION_MS * 3 // 3x mais longo que tratados normais
        };

        executeBilateralTreaty(state, actor.id, target.id, TreatyType.TradeAgreement, now, tradeTerms.duration, tradeTerms, () => {
          actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue + 0.15, 0, 1));
          targetRelation.score.tradeValue = roundTo(clamp(targetRelation.score.tradeValue + 0.15, 0, 1));
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.08, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.08, 0, 1));
          actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.03, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.03, 0, 1));
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Friendly);
        });
        break;
      }
      case "pacto_defensivo": {
        executeBilateralTreaty(state, actor.id, target.id, TreatyType.DefensivePact, now, DEFAULT_TREATY_DURATION_MS * 4, { mutualDefense: true, allianceStrength: 0.8 }, () => {
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.12, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.12, 0, 1));
          actorRelation.score.fear = roundTo(clamp(actorRelation.score.fear - 0.05, 0, 1));
          targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear - 0.05, 0, 1));
          actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.06, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.06, 0, 1));
          setPairStatus(state, actor.id, target.id, DiplomaticRelation.Allied);
        });
        break;
      }
      case "financiar_guerra": {
        // Financiamento de guerra: fornece recursos financeiros ao aliado em guerra
const fundingAmount = Math.min(actor.economy.stock[ResourceType.Gold] * 0.1, 200); // 10% do tesouro ou 200 max

        if (fundingAmount > 10) { // Só financia se tiver recursos significativos
          // Transfere ouro
          actor.economy.stock[ResourceType.Gold] = Math.max(0, actor.economy.stock[ResourceType.Gold] - fundingAmount);
          target.economy.stock[ResourceType.Gold] += fundingAmount;

          // Melhora relações
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.06, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.08, 0, 1));
          targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.04, 0, 1));

          // Cria um "tratado" temporário de financiamento (não aparece como tratado formal)
          // Mas registra como apoio financeiro
          actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue + 0.05, 0, 1));

          // O alvo ganha bônus temporário de moral/produção devido ao financiamento
          for (const army of target.military.armies) {
            army.morale = roundTo(clamp(army.morale + 0.1, 0, 1));
          }
        }
        break;
      }
      default: {
        if (hasActiveTreaty(state, actor.id, target.id, TreatyType.NonAggression, now)) {
          actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.01, 0, 1));
          targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.01, 0, 1));
        }
      }
    }

    return state;
  }
}

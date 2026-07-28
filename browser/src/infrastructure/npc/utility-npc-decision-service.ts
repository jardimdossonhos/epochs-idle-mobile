﻿import { NpcArchetype, DiplomaticRelation } from "../../core/models/enums";
import type { INpcDecisionService, NpcDecision } from "../../core/contracts/services";
import type { GameState, KingdomState } from "../../core/models/game-state";
import type { KingdomId, TimestampMs } from "../../core/models/types";
import type { StaticWorldData } from "../../core/models/static-world-data";

const WAR_COOLDOWN_KEY = "war:declaration";

interface ActionContext {
  state: GameState;
  now: TimestampMs;
  actor: KingdomState;
  target: KingdomState;
  actorPerceivedPower: number;
  targetPerceivedPower: number;
  isAtWar: boolean;
  staticData: StaticWorldData;
}

function getArmyStrength(kingdom: KingdomState): number {
  if (!kingdom) return 0;
  return kingdom.military.armies.reduce((total, army) => total + army.manpower * army.quality * (0.6 + army.morale * 0.4), 0);
}

function getPerceivedArmyStrength(actor: KingdomState, target: KingdomState): number {
  const realStrength = getArmyStrength(target);
  if (actor.isPlayer) return realStrength; // Player has perfect info for now

  // Bounded Rationality: NPC estimates enemy strength with a margin of error
  const perceptionError = 1.0 - (actor.npc?.personality.caution ?? 0.5) * 0.4; // Cautious leaders are more accurate
  const noise = (Math.random() - 0.5) * 0.3; // Random fluctuation
  return realStrength * perceptionError * (1 + noise);
}

function isAtWarBetween(state: GameState, leftId: string, rightId: string): boolean {
  return Object.values(state.wars).some(
    (war) =>
      (war.attackers.includes(leftId) && war.defenders.includes(rightId)) ||
      (war.attackers.includes(rightId) && war.defenders.includes(leftId))
  );
}

function activeWarCount(state: GameState, kingdomId: string): number {
  return Object.values(state.wars).filter((war) => war.attackers.includes(kingdomId) || war.defenders.includes(kingdomId)).length;
}

function getMemoryModifier(actor: KingdomState, targetId: KingdomId, now: TimestampMs): number {
  const memories = actor.npc?.memories ?? [];
  let totalGrievance = 0;
  
  for (const memory of memories) {
    if (memory.otherKingdomId === targetId) {
      const ageInYears = (now - memory.happenedAt) / (1000 * 60); // Assuming 1 min = 1 year for decay
      const decayFactor = Math.exp(-ageInYears / 50); // Memory half-life of ~35 years
      totalGrievance += memory.grievanceDelta * decayFactor;
    }
  }
  return totalGrievance;
}

function getDistance(staticData: StaticWorldData, regionA: string, regionB: string): number {
  const a = staticData.definitions[regionA]?.center;
  const b = staticData.definitions[regionB]?.center;
  if (!a || !b) return Infinity;
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreDeclareWar(ctx: ActionContext): number {
  if (ctx.isAtWar) return 0;
  if (activeWarCount(ctx.state, ctx.actor.id) >= 2) return 0;
  if (ctx.actor.diplomacy.warExhaustion > 0.7) return 0;
  
  const warCooldownUntil = ctx.actor.diplomacy.relations[ctx.target.id]?.actionCooldowns?.[WAR_COOLDOWN_KEY] ?? 0;
  if (warCooldownUntil > ctx.now) return 0;

  const personality = ctx.actor.npc!.personality;
  const relation = ctx.actor.diplomacy.relations[ctx.target.id];

  const strengthRatio = ctx.actorPerceivedPower / Math.max(1, ctx.targetPerceivedPower);
  const memoryModifier = getMemoryModifier(ctx.actor, ctx.target.id, ctx.now);

  let score = 0;
  // Archetype base desire for war
  if ([NpcArchetype.Expansionist, NpcArchetype.Revanchist].includes(personality.archetype)) score += 0.3;
  if (NpcArchetype.Opportunist === personality.archetype && strengthRatio > 1.2) score += 0.4;

  // Structural and relational factors
  score += (strengthRatio - 1.0) * 0.4; // Higher score if stronger
  score += (relation?.score.rivalry ?? 0) * 0.2;
  score += (relation?.grievance ?? 0) * 0.25;
  score += memoryModifier * 0.3; // Past grievances matter

  // Internal pressures (negative factors)
  score -= ctx.actor.diplomacy.warExhaustion * 0.5;
  score -= (1 - (ctx.actor.stability / 100)) * 0.4; // Unstable kingdoms avoid war

  return clamp(score, 0, 1);
}

function scoreProposePeace(ctx: ActionContext): number {
  if (!ctx.isAtWar) return 0;

  const strengthRatio = ctx.actorPerceivedPower / Math.max(1, ctx.targetPerceivedPower);
  
  let score = 0;
  score += ctx.actor.diplomacy.warExhaustion * 0.6; // Main driver for peace
  score += (1 - (ctx.actor.stability / 100)) * 0.3;

  // If losing, more likely to sue for peace
  if (strengthRatio < 0.8) {
    score += (1.0 - strengthRatio) * 0.4;
  }

  return clamp(score, 0, 1);
}

function scoreOfferAlliance(ctx: ActionContext): number {
  if (ctx.isAtWar) return 0;
  if (ctx.actor.diplomacy.relations[ctx.target.id]?.status !== DiplomaticRelation.Neutral) return 0;

  const personality = ctx.actor.npc!.personality;
  const relation = ctx.actor.diplomacy.relations[ctx.target.id];

  let score = 0;
  if ([NpcArchetype.Diplomatic, NpcArchetype.Defensive].includes(personality.archetype)) score += 0.2;

  score += (relation?.score.trust ?? 0) * 0.5;
  score -= (relation?.score.rivalry ?? 0) * 0.3;
  score -= getMemoryModifier(ctx.actor, ctx.target.id, ctx.now) * 0.4; // Negative memories prevent alliances

  // External threat promotes alliances
  const externalThreat = ctx.actor.diplomacy.coalitionThreat;
  score += externalThreat * 0.3;

  return clamp(score, 0, 1);
}

function scoreTradeAgreement(ctx: ActionContext): number {
  if (ctx.isAtWar) return 0;

  const personality = ctx.actor.npc!.personality;
  const relation = ctx.actor.diplomacy.relations[ctx.target.id];

  // Verifica se já existe um acordo comercial ativo
  const hasActiveTrade = ctx.actor.diplomacy.treaties.some(t =>
    t.type === "trade_agreement" &&
    t.parties.includes(ctx.target.id) &&
    (t.expiresAt === null || t.expiresAt > ctx.now)
  );

  if (hasActiveTrade) return 0;

  let score = 0;

  // Personalidades comerciais são mais propensas a acordos
  if ([NpcArchetype.Diplomatic, NpcArchetype.Opportunist].includes(personality.archetype)) score += 0.25;

  // Fatores econômicos: diferença de crescimento cria oportunidade de comércio
  const actorGrowth = ctx.actor.population.growthRatePerTick;
  const targetGrowth = ctx.target.population.growthRatePerTick;
  const growthDifference = Math.abs(actorGrowth - targetGrowth);

  score += growthDifference * 3000; // Escala para um valor utilizável no sistema de decisões

  // Relações positivas aumentam chance
  score += (relation?.score.trust ?? 0) * 0.4;
  score += (relation?.score.tradeValue ?? 0) * 0.5;

  // Relações negativas diminuem chance
  score -= (relation?.score.rivalry ?? 0) * 0.3;
  score -= getMemoryModifier(ctx.actor, ctx.target.id, ctx.now) * 0.2;

  // Distância importa: comércio funciona melhor com vizinhos próximos
  const distance = getDistance(ctx.staticData, ctx.actor.capitalRegionId, ctx.target.capitalRegionId);
  const distancePenalty = Math.max(0, (distance - 5) / 10); // Penalidade cresce após 5 unidades de distância
  score -= distancePenalty * 0.2;

  return clamp(score, 0, 1);
}

function scoreDefensivePact(ctx: ActionContext): number {
  if (ctx.isAtWar) return 0;

  const personality = ctx.actor.npc!.personality;
  const relation = ctx.actor.diplomacy.relations[ctx.target.id];

  // Verifica se já existe um pacto defensivo ativo
  const hasActiveDefense = ctx.actor.diplomacy.treaties.some(t =>
    t.type === "defensive_pact" &&
    t.parties.includes(ctx.target.id) &&
    (t.expiresAt === null || t.expiresAt > ctx.now)
  );

  if (hasActiveDefense) return 0;

  let score = 0;

  // Personalidades defensivas são mais propensas a pactos defensivos
  if ([NpcArchetype.Defensive, NpcArchetype.Diplomatic].includes(personality.archetype)) score += 0.3;

  // Alta confiança é essencial para pactos defensivos
  score += (relation?.score.trust ?? 0) * 0.6;

  // Percepção de ameaça externa aumenta desejo de alianças defensivas
  const externalThreat = ctx.actor.diplomacy.coalitionThreat;
  score += externalThreat * 0.4;

  // Diferença de poder: reinos mais fracos buscam proteção
  const powerRatio = ctx.actorPerceivedPower / Math.max(1, ctx.targetPerceivedPower);
  if (powerRatio < 0.8) {
    score += (1 - powerRatio) * 0.3; // Reinos mais fracos querem proteção
  } else if (powerRatio > 1.2) {
    score += 0.1; // Reinos mais fortes podem oferecer proteção
  }

  // Relações ruins diminuem chance
  score -= (relation?.score.rivalry ?? 0) * 0.4;
  score -= getMemoryModifier(ctx.actor, ctx.target.id, ctx.now) * 0.3;

  // Distância próxima aumenta chance (vizinhos precisam de defesa mútua)
  const distance = getDistance(ctx.staticData, ctx.actor.capitalRegionId, ctx.target.capitalRegionId);
  if (distance <= 8) {
    score += (8 - distance) / 8 * 0.2; // Bônus para vizinhos próximos
  }

  return clamp(score, 0, 1);
}

function scoreFinanceWar(ctx: ActionContext): number {
  if (ctx.isAtWar) return 0; // Não financia se já está em guerra

  const personality = ctx.actor.npc!.personality;
  const relation = ctx.actor.diplomacy.relations[ctx.target.id];

  // Verifica se o alvo está em guerra
  const targetWars = Object.values(ctx.state.wars).filter(war =>
    war.attackers.includes(ctx.target.id) || war.defenders.includes(ctx.target.id)
  );

  if (targetWars.length === 0) return 0; // Alvo não está em guerra

  let score = 0;

  // Personalidades oportunistas gostam de financiar guerras
  if (personality.archetype === NpcArchetype.Opportunist) score += 0.25;

  // Relações positivas aumentam chance de apoio
  score += (relation?.score.trust ?? 0) * 0.3;

  // Se temos aliança ou pacto defensivo, mais chance de apoiar
  const hasAlliance = ctx.actor.diplomacy.treaties.some(t =>
    (t.type === "alliance" || t.type === "defensive_pact") &&
    t.parties.includes(ctx.target.id) &&
    (t.expiresAt === null || t.expiresAt > ctx.now)
  );

  if (hasAlliance) score += 0.4;

  // Relações ruins diminuem chance
  score -= (relation?.score.rivalry ?? 0) * 0.5;

  // Considera exaustão de guerra própria
  score -= ctx.actor.diplomacy.warExhaustion * 0.3;

  // Chance maior se o alvo está perdendo (oportunidade de influência)
  const targetWar = targetWars[0];
  const isTargetWinning = targetWar.attackers.includes(ctx.target.id) ?
    targetWar.warScore > 0 : targetWar.warScore < 0;

  if (!isTargetWinning) {
    score += 0.2; // Apoia os perdedores para ganhar influência
  }

  return clamp(score, 0, 1);
}

export class UtilityNpcDecisionService implements INpcDecisionService {
  constructor(private readonly staticWorldData: StaticWorldData) {}

  decide(state: GameState, actorKingdomId: string, now: TimestampMs): NpcDecision[] {
    const actor = state.kingdoms[actorKingdomId];

    if (!actor || actor.isPlayer || !actor.npc) {
      return [];
    }

    // AI thinks less frequently to save CPU
    if (state.meta.tick % 12 !== 0) {
      return [];
    }

    const potentialTargets = Object.values(state.kingdoms).filter(
      (kingdom) => kingdom.id !== actor.id && 
                   kingdom.id !== "k_nature" &&
                   getDistance(this.staticWorldData, actor.capitalRegionId, kingdom.capitalRegionId) <= 15.0
    );

    const decisions: NpcDecision[] = [];

    for (const target of potentialTargets) {
      const context: ActionContext = {
        state,
        now,
        actor,
        target,
        actorPerceivedPower: getArmyStrength(actor), // NPC knows its own strength
        targetPerceivedPower: getPerceivedArmyStrength(actor, target),
        isAtWar: isAtWarBetween(state, actor.id, target.id),
        staticData: this.staticWorldData
      };

      const warScore = scoreDeclareWar(context);
      if (warScore > 0.55) { // High threshold for such a drastic action
        decisions.push({
          actorKingdomId,
          actionType: "declarar_guerra",
          priority: warScore,
          targetKingdomId: target.id,
          payload: { rationale: "utility_calculation", score: warScore }
        });
      }

      const peaceScore = scoreProposePeace(context);
      if (peaceScore > 0.6) {
        decisions.push({
          actorKingdomId,
          actionType: "proposta_paz",
          priority: peaceScore,
          targetKingdomId: target.id,
          payload: { rationale: "utility_calculation", score: peaceScore }
        });
      }

      const allianceScore = scoreOfferAlliance(context);
      if (allianceScore > 0.65) {
        decisions.push({
          actorKingdomId,
          actionType: "oferta_alianca",
          priority: allianceScore,
          targetKingdomId: target.id,
          payload: { rationale: "utility_calculation", score: allianceScore }
        });
      }

      const tradeScore = scoreTradeAgreement(context);
      if (tradeScore > 0.5) {
        decisions.push({
          actorKingdomId,
          actionType: "acordo_comercial",
          priority: tradeScore,
          targetKingdomId: target.id,
          payload: { rationale: "utility_calculation", score: tradeScore }
        });
      }

      const defensivePactScore = scoreDefensivePact(context);
      if (defensivePactScore > 0.7) { // Threshold mais alto para compromissos defensivos
        decisions.push({
          actorKingdomId,
          actionType: "pacto_defensivo",
          priority: defensivePactScore,
          targetKingdomId: target.id,
          payload: { rationale: "utility_calculation", score: defensivePactScore }
        });
      }

      const financeWarScore = scoreFinanceWar(context);
      if (financeWarScore > 0.6) {
        decisions.push({
          actorKingdomId,
          actionType: "financiar_guerra",
          priority: financeWarScore,
          targetKingdomId: target.id,
          payload: { rationale: "utility_calculation", score: financeWarScore }
        });
      }
    }

    // Return the top N decisions
    return decisions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }
}

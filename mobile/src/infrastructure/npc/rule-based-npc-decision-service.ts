import { NpcArchetype } from "../../core/models/enums";
import type { INpcDecisionService, NpcDecision } from "../../core/contracts/services";
import type { GameState } from "../../core/models/game-state";

function armyStrengthFor(state: GameState, kingdomId: string): number {
  const kingdom = state.kingdoms[kingdomId];
  if (!kingdom) {
    return 0;
  }

  return kingdom.military.armies.reduce((total, army) => total + army.manpower * army.quality * (0.6 + army.morale * 0.4), 0);
}

function isAtWarBetween(state: GameState, leftId: string, rightId: string): boolean {
  return Object.keys(state.wars)
    .sort()
    .map((warId) => state.wars[warId])
    .some(
      (war) =>
        (war.attackers.includes(leftId) && war.defenders.includes(rightId)) ||
        (war.attackers.includes(rightId) && war.defenders.includes(leftId))
    );
}

function activeWarCount(state: GameState, kingdomId: string): number {
  return Object.keys(state.wars)
    .sort()
    .map((warId) => state.wars[warId])
    .filter((war) => war.attackers.includes(kingdomId) || war.defenders.includes(kingdomId)).length;
}

function hostilityFromMemory(state: GameState, actorKingdomId: string, targetKingdomId: string): number {
  const memories = state.kingdoms[actorKingdomId]?.npc?.memories ?? [];

  const targetMemories = memories.filter((memory) => memory.otherKingdomId === targetKingdomId).slice(0, 6);

  if (targetMemories.length === 0) {
    return 0;
  }

  const hostility = targetMemories.reduce((total, memory) => total + memory.grievanceDelta + memory.fearDelta * 0.3, 0);
  return hostility / targetMemories.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function targetWeight(targetIsPlayer: boolean): number {
  return targetIsPlayer ? 0.06 : 0.02;
}

const WAR_COOLDOWN_KEY = "war:declaration";

export class RuleBasedNpcDecisionService implements INpcDecisionService {
  decide(state: GameState, actorKingdomId: string): NpcDecision[] {
    const actor = state.kingdoms[actorKingdomId];

    if (!actor || actor.isPlayer || !actor.npc) {
      return [];
    }

    if (state.meta.tick % 3 !== 0) {
      return [];
    }

    const actorStrength = Math.max(1, armyStrengthFor(state, actor.id));
    const actorWarCount = activeWarCount(state, actor.id);
    const coalitionPressure = actor.diplomacy.coalitionThreat;
    const potentialTargets = Object.keys(state.kingdoms)
      .sort()
      .map((kingdomId) => state.kingdoms[kingdomId])
      .filter((kingdom) => kingdom.id !== actor.id);

    const decisions: NpcDecision[] = [];
    let alreadyOpenedWar = false;

    for (const target of potentialTargets) {
      const relation = actor.diplomacy.relations[target.id];
      if (!relation) {
        continue;
      }

      const atWar = isAtWarBetween(state, actor.id, target.id);
      const targetStrength = Math.max(1, armyStrengthFor(state, target.id));
      const strengthRatio = actorStrength / targetStrength;
      const memoryHostility = hostilityFromMemory(state, actor.id, target.id);
      const warCooldownUntil = relation.actionCooldowns?.[WAR_COOLDOWN_KEY] ?? 0;

      if (atWar) {
        const peacePriority = clamp(
          actor.diplomacy.warExhaustion * 0.58 +
            (strengthRatio < 0.9 ? 0.2 : 0) +
            (actor.stability < 40 ? 0.14 : 0),
          0,
          1
        );

        if (peacePriority > 0.54) {
          decisions.push({
            actorKingdomId,
            actionType: "proposta_paz",
            priority: peacePriority,
            targetKingdomId: target.id,
            payload: {
              rationale: "fadiga_em_frente_ativa",
              warExhaustion: actor.diplomacy.warExhaustion,
              strengthRatio
            }
          });
        }

        continue;
      }

      const aggressionIndex =
        relation.score.rivalry * 0.34 +
        relation.grievance * 0.24 +
        memoryHostility * 0.16 +
        actor.npc.personality.ambition * 0.14 +
        (1 - relation.score.trust) * 0.12 -
        coalitionPressure * 0.1;

      const allianceIndex =
        relation.score.trust * 0.46 +
        relation.score.tradeValue * 0.19 +
        (1 - relation.grievance) * 0.21 +
        (actor.npc.personality.honor - actor.npc.personality.betrayalTendency) * 0.14;

      const canOpenWar =
        !alreadyOpenedWar &&
        actorWarCount < 2 &&
        actor.diplomacy.warExhaustion < 0.74 &&
        warCooldownUntil <= state.meta.lastUpdatedAt &&
        actor.stability > 37 &&
        aggressionIndex > 0.26 &&
        strengthRatio > 0.8;

      if (
        canOpenWar &&
        [NpcArchetype.Expansionist, NpcArchetype.Opportunist, NpcArchetype.Revanchist, NpcArchetype.Treacherous].includes(
          actor.npc.personality.archetype
        )
      ) {
        decisions.push({
          actorKingdomId,
          actionType: "declarar_guerra",
          priority: clamp(aggressionIndex * 0.62 + strengthRatio * 0.22 + targetWeight(target.isPlayer), 0, 1),
          targetKingdomId: target.id,
          payload: {
            rationale: "janela_estrategica",
            aggressionIndex,
            strengthRatio
          }
        });
        alreadyOpenedWar = true;
        continue;
      }

      if (aggressionIndex > 0.42 && strengthRatio > 0.9) {
        decisions.push({
          actorKingdomId,
          actionType: "pressao_fronteirica",
          priority: clamp(aggressionIndex * 0.64 + relation.score.borderTension * 0.2 + targetWeight(target.isPlayer), 0, 1),
          targetKingdomId: target.id,
          payload: {
            rationale: "coercao_sem_guerra",
            aggressionIndex,
            strengthRatio
          }
        });
      }

      if (allianceIndex > 0.6 && [NpcArchetype.Diplomatic, NpcArchetype.Mercantile, NpcArchetype.Defensive].includes(actor.npc.personality.archetype)) {
        decisions.push({
          actorKingdomId,
          actionType: "oferta_alianca",
          priority: clamp(allianceIndex * 0.9 + (target.isPlayer ? 0.03 : 0), 0, 1),
          targetKingdomId: target.id,
          payload: {
            rationale: "equilibrio_regional",
            allianceIndex
          }
        });
      }

      if (relation.score.tradeValue < 0.24 && relation.score.rivalry > 0.48 && actor.npc.personality.greed > 0.55) {
        decisions.push({
          actorKingdomId,
          actionType: "embargo_comercial",
          priority: clamp(0.42 + relation.score.rivalry * 0.28 + targetWeight(target.isPlayer), 0, 1),
          targetKingdomId: target.id,
          payload: {
            rationale: "guerra_economica",
            rivalry: relation.score.rivalry
          }
        });
      }
    }

    return decisions
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }

        const leftTarget = left.targetKingdomId ?? "";
        const rightTarget = right.targetKingdomId ?? "";
        if (leftTarget !== rightTarget) {
          return leftTarget.localeCompare(rightTarget);
        }

        return left.actionType.localeCompare(right.actionType);
      })
      .slice(0, 3);
  }
}

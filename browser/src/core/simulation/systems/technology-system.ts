﻿import { TechnologyDomain } from "../../models/enums";
import type { KingdomState } from "../../models/game-state";
import type { TechnologyNode } from "../../models/technology";
import { getTechnologyNode, selectDefaultResearchNode, selectResearchNodeTowardsTarget } from "../../data/technology-tree";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, roundTo } from "./utils";

function applyResearchEffects(kingdom: KingdomState, node: TechnologyNode): void {
  for (const effectObj of node.effects) {
    const effect = effectObj.target;
    const value = effectObj.value;
    switch (effect) {
      case "military.techLevel":
        kingdom.military.militaryTechLevel = roundTo(clamp(kingdom.military.militaryTechLevel + value, 1, 10));
        break;
      case "military.reserveManpower":
        kingdom.military.reserveManpower = Math.max(0, kingdom.military.reserveManpower + Math.round(value));
        break;
      case "administration.capacity":
        kingdom.administration.adminCapacity = roundTo(Math.max(20, kingdom.administration.adminCapacity + value));
        break;
      case "administration.corruption":
        kingdom.administration.corruption = roundTo(clamp(kingdom.administration.corruption + value, 0, 1));
        break;
      case "religion.authority":
        kingdom.religion.authority = roundTo(clamp(kingdom.religion.authority + value, 0, 1));
        break;
      case "religion.cohesion":
        kingdom.religion.cohesion = roundTo(clamp(kingdom.religion.cohesion + value, 0, 1));
        break;
      case "religion.tolerance":
        kingdom.religion.tolerance = roundTo(clamp(kingdom.religion.tolerance + value, 0, 1));
        break;
      case "population.growthRate":
        kingdom.population.growthRatePerTick = roundTo(clamp(kingdom.population.growthRatePerTick + value, 0.00005, 0.0005), 6);
        break;
      case "economy.goldStock":
        kingdom.economy.stock.gold = roundTo(Math.max(0, kingdom.economy.stock.gold + value));
        break;
      case "economy.foodStock":
        kingdom.economy.stock.food = roundTo(Math.max(0, kingdom.economy.stock.food + value));
        break;
      case "economy.woodStock":
        kingdom.economy.stock.wood = roundTo(Math.max(0, kingdom.economy.stock.wood + value));
        break;
      case "economy.ironStock":
        kingdom.economy.stock.iron = roundTo(Math.max(0, kingdom.economy.stock.iron + value));
        break;
      case "economy.faithStock":
        kingdom.economy.stock.faith = roundTo(Math.max(0, kingdom.economy.stock.faith + value));
        break;
      case "stability":
        kingdom.stability = roundTo(clamp(kingdom.stability + value, 0, 100));
        break;
      case "legitimacy":
        kingdom.legitimacy = roundTo(clamp(kingdom.legitimacy + value, 0, 100));
        break;
    }
  }
}

function ensureActiveResearch(kingdom: KingdomState): TechnologyNode | null {
  const goalId = kingdom.technology.researchGoalId;
  if (goalId) {
    if (kingdom.technology.unlocked.includes(goalId)) {
      kingdom.technology.researchGoalId = null;
    } else {
      const goalNode = selectResearchNodeTowardsTarget(kingdom.technology, goalId);
      if (goalNode) {
        kingdom.technology.activeResearchId = goalNode.id;
        kingdom.technology.researchFocus = goalNode.domain;
        return goalNode;
      }
    }
  }

  const activeId = kingdom.technology.activeResearchId;
  const activeNode = activeId ? getTechnologyNode(activeId) : undefined;
  const isUnlocked = activeId ? kingdom.technology.unlocked.includes(activeId) : false;

  if (!isUnlocked && activeNode && activeNode.required.every((requiredId) => kingdom.technology.unlocked.includes(requiredId))) {
    return activeNode;
  }

  const next = selectDefaultResearchNode(kingdom.technology, kingdom.technology.researchFocus);
  kingdom.technology.activeResearchId = next?.id ?? null;
  return next;
}

function selectNextResearchNode(kingdom: KingdomState): TechnologyNode | null {
  const goalId = kingdom.technology.researchGoalId;
  if (goalId) {
    if (kingdom.technology.unlocked.includes(goalId)) {
      kingdom.technology.researchGoalId = null;
    } else {
      const goalNode = selectResearchNodeTowardsTarget(kingdom.technology, goalId);
      if (goalNode) {
        return goalNode;
      }
    }
  }

  return selectDefaultResearchNode(kingdom.technology, kingdom.technology.researchFocus);
}

export function createTechnologySystem(): SimulationSystem {
  return {
    id: "technology",
    run(context): void {
      let eventSeq = 0;

      for (const kingdomId of Object.keys(context.nextState.kingdoms).sort()) {
        const kingdom = context.nextState.kingdoms[kingdomId];
        const budgetTechFactor = kingdom.economy.budgetPriority.technology / 20;
        const focusBoost = kingdom.technology.researchFocus === TechnologyDomain.Military ? 0.08 : 0.04;
        const baseResearchRate = 1.0;
        const researchDelta = baseResearchRate * (0.5 + budgetTechFactor + focusBoost);

        kingdom.technology.accumulatedResearch = roundTo(kingdom.technology.accumulatedResearch + researchDelta);

        const activeNode = ensureActiveResearch(kingdom);
        if (!activeNode) {
          continue;
        }

        if (kingdom.technology.accumulatedResearch < activeNode.cost) {
          continue;
        }

        kingdom.technology.accumulatedResearch = roundTo(kingdom.technology.accumulatedResearch - activeNode.cost);

        if (!kingdom.technology.unlocked.includes(activeNode.id)) {
          kingdom.technology.unlocked.push(activeNode.id);
        }

        applyResearchEffects(kingdom, activeNode);
        const next = selectNextResearchNode(kingdom);
        kingdom.technology.activeResearchId = next?.id ?? null;

        context.events.push({
          id: createEventId({
            prefix: "evt_research",
            tick: context.nextState.meta.tick,
            systemId: "technology",
            actorId: kingdom.id,
            sequence: eventSeq++
          }),
          type: "technology.completed",
          actorKingdomId: kingdom.id,
          payload: {
            technologyId: activeNode.id,
            technologyName: activeNode.name,
            domain: activeNode.domain,
            unlockedCount: kingdom.technology.unlocked.length,
            focus: kingdom.technology.researchFocus,
            goalId: kingdom.technology.researchGoalId
          },
          occurredAt: context.now
        });
      }
    }
  };
}

import { ArmyPosture, AutomationLevel, BuildingType, ResourceType, TechnologyDomain } from "../../models/enums";
import { selectDefaultResearchNode, selectResearchNodeTowardsTarget } from "../../data/technology-tree";
import type { BudgetPriority } from "../../models/economy";
import type { EcsState, GameState, KingdomState } from "../../models/game-state";
import type { RegionDefinition } from "../../models/world";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, getOwnedRegionIds, roundTo } from "./utils";

function isEnabled(level: AutomationLevel): boolean {
  return level !== AutomationLevel.Manual;
}

function applyBudgetTarget(current: BudgetPriority, target: BudgetPriority, strength: number): BudgetPriority {
  const next: BudgetPriority = {
    economy: current.economy + (target.economy - current.economy) * strength,
    military: current.military + (target.military - current.military) * strength,
    religion: current.religion + (target.religion - current.religion) * strength,
    administration: current.administration + (target.administration - current.administration) * strength,
    technology: current.technology + (target.technology - current.technology) * strength
  };

  const total = Math.max(1, next.economy + next.military + next.religion + next.administration + next.technology);

  return {
    economy: roundTo((next.economy / total) * 100),
    military: roundTo((next.military / total) * 100),
    religion: roundTo((next.religion / total) * 100),
    administration: roundTo((next.administration / total) * 100),
    technology: roundTo((next.technology / total) * 100)
  };
}

function activeWarCount(state: GameState, kingdomId: string): number {
  return Object.keys(state.wars)
    .sort()
    .map((warId) => state.wars[warId])
    .filter((war) => war.attackers.includes(kingdomId) || war.defenders.includes(kingdomId)).length;
}

function computeThreat(kingdom: KingdomState): number {
  const relationThreat = Object.keys(kingdom.diplomacy.relations)
    .sort()
    .map((relationId) => kingdom.diplomacy.relations[relationId])
    .reduce((top, relation) => {
      const current = relation.score.rivalry * 0.6 + relation.score.fear * 0.2 + relation.grievance * 0.2;
      return Math.max(top, current);
    }, 0);

  return clamp(Math.max(kingdom.diplomacy.coalitionThreat, relationThreat), 0, 1);
}

function selectResearchDomain(kingdom: KingdomState, threat: number, warCount: number): TechnologyDomain {
  const foodPressure = kingdom.population.pressure.famineRisk;

  if (warCount > 0 || threat > 0.72) {
    return TechnologyDomain.Military;
  }

  if (kingdom.administration.corruption > 0.22 || kingdom.administration.usedCapacity > kingdom.administration.adminCapacity * 0.92) {
    return TechnologyDomain.Administration;
  }

  if (foodPressure > 0.45) {
    return TechnologyDomain.Economy;
  }

  if (kingdom.religion.cohesion < 0.48) {
    return TechnologyDomain.Religion;
  }

  return TechnologyDomain.Logistics;
}

function selectExpansionTargets(
  state: GameState,
  kingdomId: string,
  definitions: Record<string, { neighbors: string[]; strategicValue: number }>
): string[] {
  const ownedRegions = getOwnedRegionIds(state, kingdomId);
  const candidates: string[] = [];

  for (const regionId of ownedRegions) {
    const definition = definitions[regionId];

    if (!definition) {
      continue;
    }

    for (const neighborId of definition.neighbors) {
      const neighborState = state.world.regions[neighborId];

      if (!neighborState || neighborState.ownerId === kingdomId || candidates.includes(neighborId)) {
        continue;
      }

      candidates.push(neighborId);
    }
  }

  return candidates.sort().slice(0, 2);
}

const BUILDING_COSTS: Record<BuildingType, Partial<Record<ResourceType, number>>> = {
  [BuildingType.Market]: { [ResourceType.Gold]: 300, [ResourceType.Wood]: 150 },
  [BuildingType.Barracks]: { [ResourceType.Gold]: 200, [ResourceType.Iron]: 100, [ResourceType.Wood]: 100 },
  [BuildingType.Monastery]: { [ResourceType.Gold]: 250, [ResourceType.Wood]: 200, [ResourceType.Faith]: 50 },
  [BuildingType.University]: { [ResourceType.Gold]: 400, [ResourceType.Wood]: 200 },
  [BuildingType.Fortress]: { [ResourceType.Gold]: 500, [ResourceType.Wood]: 300, [ResourceType.Iron]: 200 }
};

function getKingdomEcsResource(state: GameState, kingdomId: string, resource: ResourceType, orderedDefinitions: RegionDefinition[]): number {
  if (!state.ecs) return 0;
  const arr = state.ecs[resource as keyof EcsState] as Float64Array | number[];
  if (!arr) return 0;
  let total = 0;
  for (let i = 0; i < orderedDefinitions.length; i++) {
    const def = orderedDefinitions[i];
    if (!def.isWater && state.world.regions[def.id]?.ownerId === kingdomId) {
      total += arr[i];
    }
  }
  return total;
}

function canAfford(state: GameState, kingdomId: string, cost: Partial<Record<ResourceType, number>>, orderedDefinitions: RegionDefinition[]): boolean {
  for (const [res, amount] of Object.entries(cost)) {
    const available = getKingdomEcsResource(state, kingdomId, res as ResourceType, orderedDefinitions);
    if (available < (amount as number)) return false;
  }
  return true;
}

function handleConstructionAutomation(state: GameState, kingdom: KingdomState, context: Parameters<SimulationSystem["run"]>[0], orderedDefinitions: RegionDefinition[]) {
  const ownedRegions = getOwnedRegionIds(state, kingdom.id);
  const availableRegions = ownedRegions.filter(rId => {
    const b = state.world.regions[rId].buildings || [];
    return b.length < 2;
  });

  if (availableRegions.length === 0) return;

  const level = kingdom.administration.automation.construction;
  if (!level || level === AutomationLevel.Manual) return;

  let chosenBuilding: BuildingType | null = null;
  let chosenRegionId: string | null = null;

  if (level === AutomationLevel.NearlyAutomatic) {
    for (const rId of availableRegions) {
      const region = state.world.regions[rId];
      const buildings = region.buildings || [];

      if (region.unrest > 0.4 && !buildings.includes(BuildingType.Fortress)) {
        if (canAfford(state, kingdom.id, BUILDING_COSTS[BuildingType.Fortress], orderedDefinitions)) {
          chosenBuilding = BuildingType.Fortress;
          chosenRegionId = rId;
          break;
        }
      }

      if (region.faithUnrest > 0.3 && !buildings.includes(BuildingType.Monastery)) {
        if (canAfford(state, kingdom.id, BUILDING_COSTS[BuildingType.Monastery], orderedDefinitions)) {
          chosenBuilding = BuildingType.Monastery;
          chosenRegionId = rId;
          break;
        }
      }
    }

    if (!chosenBuilding) {
      const gold = getKingdomEcsResource(state, kingdom.id, ResourceType.Gold, orderedDefinitions);
      const randomRegion = availableRegions[Math.floor(Math.random() * availableRegions.length)];
      const b = state.world.regions[randomRegion].buildings || [];

      if (gold > 1000 && !b.includes(BuildingType.University) && canAfford(state, kingdom.id, BUILDING_COSTS[BuildingType.University], orderedDefinitions)) {
        chosenBuilding = BuildingType.University;
        chosenRegionId = randomRegion;
      } else if (!b.includes(BuildingType.Market) && canAfford(state, kingdom.id, BUILDING_COSTS[BuildingType.Market], orderedDefinitions)) {
        chosenBuilding = BuildingType.Market;
        chosenRegionId = randomRegion;
      } else if (!b.includes(BuildingType.Barracks) && canAfford(state, kingdom.id, BUILDING_COSTS[BuildingType.Barracks], orderedDefinitions)) {
        chosenBuilding = BuildingType.Barracks;
        chosenRegionId = randomRegion;
      }
    }
  } else if (level === AutomationLevel.Assisted) {
    const props = kingdom.administration.automation.constructionProportions || {
      [BuildingType.Market]: 40,
      [BuildingType.Barracks]: 30,
      [BuildingType.Monastery]: 10,
      [BuildingType.University]: 10,
      [BuildingType.Fortress]: 10
    };

    const counts: Record<string, number> = { [BuildingType.Market]: 0, [BuildingType.Barracks]: 0, [BuildingType.Monastery]: 0, [BuildingType.University]: 0, [BuildingType.Fortress]: 0 };
    let totalBuildings = 0;

    for (const rId of ownedRegions) {
      const b = state.world.regions[rId].buildings || [];
      for (const type of b) { counts[type] = (counts[type] || 0) + 1; totalBuildings++; }
    }

    let maxDeficit = -Infinity;
    for (const type of Object.values(BuildingType)) {
      const targetPct = ((props as Record<string, number>)[type] || 0) / 100;
      const currentPct = totalBuildings === 0 ? 0 : counts[type] / totalBuildings;
      const deficit = targetPct - currentPct;
      if (deficit > maxDeficit && canAfford(state, kingdom.id, BUILDING_COSTS[type], orderedDefinitions)) { maxDeficit = deficit; chosenBuilding = type; }
    }

    if (chosenBuilding) {
      for (const rId of availableRegions) {
        const b = state.world.regions[rId].buildings || [];
        if (!b.includes(chosenBuilding)) { chosenRegionId = rId; break; }
      }
    }
  }

  if (chosenBuilding && chosenRegionId) {
    const region = state.world.regions[chosenRegionId];
    region.buildings = region.buildings || [];
    region.buildings.push(chosenBuilding);

    context.events.push({
      id: createEventId({ prefix: "evt_build", tick: state.meta.tick, systemId: "automation", actorId: kingdom.id, sequence: 0 }),
      type: "automation.build_structure",
      actorKingdomId: kingdom.id,
      payload: { regionId: chosenRegionId, buildingType: chosenBuilding, cost: BUILDING_COSTS[chosenBuilding] },
      occurredAt: context.now
    });
  }
}

export function createAutomationSystem(orderedDefinitions: RegionDefinition[]): SimulationSystem {
  return {
    id: "automation",
    run(context): void {
      const state = context.nextState;
      const definitions = context.staticData.definitions;

      for (const kingdomId of Object.keys(state.kingdoms).sort()) {
        if (kingdomId === "k_nature") continue;
        const kingdom = state.kingdoms[kingdomId];
        const warCount = activeWarCount(state, kingdom.id);
        const threat = computeThreat(kingdom);

        if (isEnabled(kingdom.administration.automation.economy)) {
          let targetBudget: BudgetPriority = {
            economy: 25,
            military: 20,
            religion: 15,
            administration: 20,
            technology: 20
          };

          const foodReserveTarget = kingdom.population.total / 6_500;
          const lowFood = kingdom.economy.stock.food < foodReserveTarget;
          const lowGold = kingdom.economy.stock.gold < 85;

          if (lowFood || lowGold) {
            targetBudget = {
              economy: 34,
              military: 18,
              religion: 10,
              administration: 24,
              technology: 14
            };
          } else if (warCount > 0 || threat > 0.64) {
            targetBudget = {
              economy: 24,
              military: 34,
              religion: 10,
              administration: 18,
              technology: 14
            };
          } else if (kingdom.economy.stock.gold > 220) {
            targetBudget = {
              economy: 22,
              military: 18,
              religion: 12,
              administration: 20,
              technology: 28
            };
          }

          const automationStrength = kingdom.administration.automation.economy === AutomationLevel.NearlyAutomatic ? 0.35 : 0.2;

          kingdom.economy.budgetPriority = applyBudgetTarget(kingdom.economy.budgetPriority, targetBudget, automationStrength);
        }

        if (isEnabled(kingdom.administration.automation.defense)) {
          if (warCount > 0 || threat > 0.62) {
            kingdom.military.posture = ArmyPosture.Defensive;
            kingdom.military.recruitmentPriority = roundTo(clamp(kingdom.military.recruitmentPriority + 0.03, 0.35, 0.92));
            kingdom.military.offensiveFocus = roundTo(clamp(kingdom.military.offensiveFocus - 0.03, 0.12, 0.72));
          } else {
            kingdom.military.recruitmentPriority = roundTo(clamp(kingdom.military.recruitmentPriority - 0.01, 0.25, 0.85));
            kingdom.military.offensiveFocus = roundTo(clamp(kingdom.military.offensiveFocus + 0.01, 0.2, 0.85));
          }
        }

        if (isEnabled(kingdom.administration.automation.construction || AutomationLevel.Manual)) {
          if (state.meta.tick % 5 === 0) {
            handleConstructionAutomation(state, kingdom, context, orderedDefinitions);
          }
        }

        if (isEnabled(kingdom.administration.automation.expansion)) {
          if (warCount === 0 && threat < 0.52 && kingdom.stability > 52 && kingdom.economy.stock.gold > 120) {
            kingdom.military.posture = ArmyPosture.Aggressive;
            kingdom.military.offensiveFocus = roundTo(clamp(kingdom.military.offensiveFocus + 0.02, 0.3, 0.95));
            kingdom.military.targetRegionIds = selectExpansionTargets(state, kingdom.id, definitions)
              .sort((leftId, rightId) => (definitions[rightId]?.strategicValue ?? 0) - (definitions[leftId]?.strategicValue ?? 0))
              .slice(0, 2);
          } else if (warCount > 0 || threat > 0.72) {
            kingdom.military.targetRegionIds = [];
          }
        }

        if (isEnabled(kingdom.administration.automation.technology)) {
          const goalId = kingdom.technology.researchGoalId;
          if (!goalId || kingdom.technology.unlocked.includes(goalId)) {
            const domain = selectResearchDomain(kingdom, threat, warCount);
            kingdom.technology.researchFocus = domain;
          }

          if (kingdom.technology.activeResearchId === null || state.meta.tick % 28 === 0) {
            const target = kingdom.technology.researchGoalId
              ? selectResearchNodeTowardsTarget(kingdom.technology, kingdom.technology.researchGoalId) ??
                selectDefaultResearchNode(kingdom.technology, kingdom.technology.researchFocus)
              : selectDefaultResearchNode(kingdom.technology, kingdom.technology.researchFocus);
            kingdom.technology.activeResearchId = target?.id ?? null;
          }
        }

        if (isEnabled(kingdom.administration.automation.diplomacyReactive) && threat > 0.7) {
          for (const relation of Object.keys(kingdom.diplomacy.relations)
            .sort()
            .map((relationId) => kingdom.diplomacy.relations[relationId])
            .sort((left, right) => right.score.rivalry - left.score.rivalry)
            .slice(0, 2)) {
            relation.score.rivalry = roundTo(clamp(relation.score.rivalry - 0.02, 0, 1));
            relation.score.borderTension = roundTo(clamp(relation.score.borderTension - 0.015, 0, 1));
            relation.score.trust = roundTo(clamp(relation.score.trust + 0.01, 0, 1));
          }
        }
      }
    }
  };
}

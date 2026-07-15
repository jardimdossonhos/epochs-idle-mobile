"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKingdomCapitalIndex = getKingdomCapitalIndex;
exports.createAutomationSystem = createAutomationSystem;
const enums_1 = require("../../models/enums");
const technology_tree_1 = require("../../data/technology-tree");
const utils_1 = require("./utils");
function isEnabled(level) {
    return level !== enums_1.AutomationLevel.Manual;
}
function applyBudgetTarget(current, target, strength) {
    const next = {
        economy: current.economy + (target.economy - current.economy) * strength,
        military: current.military + (target.military - current.military) * strength,
        religion: current.religion + (target.religion - current.religion) * strength,
        administration: current.administration + (target.administration - current.administration) * strength,
        technology: current.technology + (target.technology - current.technology) * strength
    };
    const total = Math.max(1, next.economy + next.military + next.religion + next.administration + next.technology);
    return {
        economy: (0, utils_1.roundTo)((next.economy / total) * 100),
        military: (0, utils_1.roundTo)((next.military / total) * 100),
        religion: (0, utils_1.roundTo)((next.religion / total) * 100),
        administration: (0, utils_1.roundTo)((next.administration / total) * 100),
        technology: (0, utils_1.roundTo)((next.technology / total) * 100)
    };
}
function activeWarCount(state, kingdomId) {
    return Object.keys(state.wars)
        .sort()
        .map((warId) => state.wars[warId])
        .filter((war) => war.attackers.includes(kingdomId) || war.defenders.includes(kingdomId)).length;
}
function computeThreat(kingdom) {
    const relationThreat = Object.keys(kingdom.diplomacy.relations)
        .sort()
        .map((relationId) => kingdom.diplomacy.relations[relationId])
        .reduce((top, relation) => {
        const current = relation.score.rivalry * 0.6 + relation.score.fear * 0.2 + relation.grievance * 0.2;
        return Math.max(top, current);
    }, 0);
    return (0, utils_1.clamp)(Math.max(kingdom.diplomacy.coalitionThreat, relationThreat), 0, 1);
}
function selectResearchDomain(kingdom, threat, warCount) {
    const foodPressure = kingdom.population.pressure.famineRisk;
    if (warCount > 0 || threat > 0.72) {
        return enums_1.TechnologyDomain.Military;
    }
    if (kingdom.administration.corruption > 0.22 || kingdom.administration.usedCapacity > kingdom.administration.adminCapacity * 0.92) {
        return enums_1.TechnologyDomain.Administration;
    }
    if (foodPressure > 0.45) {
        return enums_1.TechnologyDomain.Economy;
    }
    if (kingdom.religion.cohesion < 0.48) {
        return enums_1.TechnologyDomain.Religion;
    }
    return enums_1.TechnologyDomain.Logistics;
}
function selectExpansionTargets(state, kingdomId, definitions) {
    const ownedRegions = (0, utils_1.getOwnedRegionIds)(state, kingdomId);
    const candidates = [];
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
const BUILDING_COSTS = {
    [enums_1.BuildingType.Market]: { [enums_1.ResourceType.Gold]: 300, [enums_1.ResourceType.Wood]: 150 },
    [enums_1.BuildingType.Barracks]: { [enums_1.ResourceType.Gold]: 200, [enums_1.ResourceType.Iron]: 100, [enums_1.ResourceType.Wood]: 100 },
    [enums_1.BuildingType.Monastery]: { [enums_1.ResourceType.Gold]: 250, [enums_1.ResourceType.Wood]: 200, [enums_1.ResourceType.Faith]: 50 },
    [enums_1.BuildingType.University]: { [enums_1.ResourceType.Gold]: 400, [enums_1.ResourceType.Wood]: 200 },
    [enums_1.BuildingType.Fortress]: { [enums_1.ResourceType.Gold]: 500, [enums_1.ResourceType.Wood]: 300, [enums_1.ResourceType.Iron]: 200 }
};
function getKingdomEcsResource(state, kingdomId, resource, orderedDefinitions) {
    if (!state.ecs)
        return 0;
    const arr = state.ecs[resource];
    if (!arr)
        return 0;
    let total = 0;
    for (let i = 0; i < orderedDefinitions.length; i++) {
        const def = orderedDefinitions[i];
        if (!def.isWater && state.world.regions[def.id]?.ownerId === kingdomId) {
            total += arr[i];
        }
    }
    return total;
}
function getKingdomCapitalIndex(kingdom, orderedDefinitions) {
    return orderedDefinitions.findIndex(def => def.id === kingdom.capitalRegionId);
}
function canAfford(state, kingdomId, cost, orderedDefinitions) {
    for (const [res, amount] of Object.entries(cost)) {
        const available = getKingdomEcsResource(state, kingdomId, res, orderedDefinitions);
        if (available < amount)
            return false;
    }
    return true;
}
function handleConstructionAutomation(state, kingdom, context, orderedDefinitions) {
    const ownedRegions = (0, utils_1.getOwnedRegionIds)(state, kingdom.id);
    const availableRegions = ownedRegions.filter(rId => {
        const b = state.world.regions[rId].buildings || [];
        return b.length < 2;
    });
    if (availableRegions.length === 0)
        return;
    const level = kingdom.administration.automation.construction;
    if (!level || level === enums_1.AutomationLevel.Manual)
        return;
    let chosenBuilding = null;
    let chosenRegionId = null;
    if (level === enums_1.AutomationLevel.NearlyAutomatic) {
        for (const rId of availableRegions) {
            const region = state.world.regions[rId];
            const buildings = region.buildings || [];
            if (region.unrest > 0.4 && !buildings.includes(enums_1.BuildingType.Fortress)) {
                if (canAfford(state, kingdom.id, BUILDING_COSTS[enums_1.BuildingType.Fortress], orderedDefinitions)) {
                    chosenBuilding = enums_1.BuildingType.Fortress;
                    chosenRegionId = rId;
                    break;
                }
            }
            if (region.faithUnrest > 0.3 && !buildings.includes(enums_1.BuildingType.Monastery)) {
                if (canAfford(state, kingdom.id, BUILDING_COSTS[enums_1.BuildingType.Monastery], orderedDefinitions)) {
                    chosenBuilding = enums_1.BuildingType.Monastery;
                    chosenRegionId = rId;
                    break;
                }
            }
        }
        if (!chosenBuilding) {
            const gold = getKingdomEcsResource(state, kingdom.id, enums_1.ResourceType.Gold, orderedDefinitions);
            const randomRegion = availableRegions[Math.floor(Math.random() * availableRegions.length)];
            const b = state.world.regions[randomRegion].buildings || [];
            if (gold > 1000 && !b.includes(enums_1.BuildingType.University) && canAfford(state, kingdom.id, BUILDING_COSTS[enums_1.BuildingType.University], orderedDefinitions)) {
                chosenBuilding = enums_1.BuildingType.University;
                chosenRegionId = randomRegion;
            }
            else if (!b.includes(enums_1.BuildingType.Market) && canAfford(state, kingdom.id, BUILDING_COSTS[enums_1.BuildingType.Market], orderedDefinitions)) {
                chosenBuilding = enums_1.BuildingType.Market;
                chosenRegionId = randomRegion;
            }
            else if (!b.includes(enums_1.BuildingType.Barracks) && canAfford(state, kingdom.id, BUILDING_COSTS[enums_1.BuildingType.Barracks], orderedDefinitions)) {
                chosenBuilding = enums_1.BuildingType.Barracks;
                chosenRegionId = randomRegion;
            }
        }
    }
    else if (level === enums_1.AutomationLevel.Assisted) {
        const props = kingdom.administration.automation.constructionProportions || {
            [enums_1.BuildingType.Market]: 40,
            [enums_1.BuildingType.Barracks]: 30,
            [enums_1.BuildingType.Monastery]: 10,
            [enums_1.BuildingType.University]: 10,
            [enums_1.BuildingType.Fortress]: 10
        };
        const counts = { [enums_1.BuildingType.Market]: 0, [enums_1.BuildingType.Barracks]: 0, [enums_1.BuildingType.Monastery]: 0, [enums_1.BuildingType.University]: 0, [enums_1.BuildingType.Fortress]: 0 };
        let totalBuildings = 0;
        for (const rId of ownedRegions) {
            const b = state.world.regions[rId].buildings || [];
            for (const type of b) {
                counts[type] = (counts[type] || 0) + 1;
                totalBuildings++;
            }
        }
        let maxDeficit = -Infinity;
        for (const type of Object.values(enums_1.BuildingType)) {
            const targetPct = (props[type] || 0) / 100;
            const currentPct = totalBuildings === 0 ? 0 : counts[type] / totalBuildings;
            const deficit = targetPct - currentPct;
            if (deficit > maxDeficit && canAfford(state, kingdom.id, BUILDING_COSTS[type], orderedDefinitions)) {
                maxDeficit = deficit;
                chosenBuilding = type;
            }
        }
        if (chosenBuilding) {
            for (const rId of availableRegions) {
                const b = state.world.regions[rId].buildings || [];
                if (!b.includes(chosenBuilding)) {
                    chosenRegionId = rId;
                    break;
                }
            }
        }
    }
    if (chosenBuilding && chosenRegionId) {
        const region = state.world.regions[chosenRegionId];
        region.buildings = region.buildings || [];
        region.buildings.push(chosenBuilding);
        context.events.push({
            id: (0, utils_1.createEventId)({ prefix: "evt_build", tick: state.meta.tick, systemId: "automation", actorId: kingdom.id, sequence: 0 }),
            type: "automation.build_structure",
            actorKingdomId: kingdom.id,
            payload: { regionId: chosenRegionId, buildingType: chosenBuilding, cost: BUILDING_COSTS[chosenBuilding] },
            occurredAt: context.now
        });
    }
}
function createAutomationSystem(orderedDefinitions) {
    return {
        id: "automation",
        run(context) {
            const state = context.nextState;
            const definitions = context.staticData.definitions;
            for (const kingdomId of Object.keys(state.kingdoms).sort()) {
                if (kingdomId === "k_nature")
                    continue;
                const kingdom = state.kingdoms[kingdomId];
                const warCount = activeWarCount(state, kingdom.id);
                const threat = computeThreat(kingdom);
                if (isEnabled(kingdom.administration.automation.economy)) {
                    let targetBudget = {
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
                    }
                    else if (warCount > 0 || threat > 0.64) {
                        targetBudget = {
                            economy: 24,
                            military: 34,
                            religion: 10,
                            administration: 18,
                            technology: 14
                        };
                    }
                    else if (kingdom.economy.stock.gold > 220) {
                        targetBudget = {
                            economy: 22,
                            military: 18,
                            religion: 12,
                            administration: 20,
                            technology: 28
                        };
                    }
                    const automationStrength = kingdom.administration.automation.economy === enums_1.AutomationLevel.NearlyAutomatic ? 0.35 : 0.2;
                    kingdom.economy.budgetPriority = applyBudgetTarget(kingdom.economy.budgetPriority, targetBudget, automationStrength);
                }
                if (isEnabled(kingdom.administration.automation.defense)) {
                    if (warCount > 0 || threat > 0.62) {
                        kingdom.military.posture = enums_1.ArmyPosture.Defensive;
                        kingdom.military.recruitmentPriority = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.military.recruitmentPriority + 0.03, 0.35, 0.92));
                        kingdom.military.offensiveFocus = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.military.offensiveFocus - 0.03, 0.12, 0.72));
                    }
                    else {
                        kingdom.military.recruitmentPriority = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.military.recruitmentPriority - 0.01, 0.25, 0.85));
                        kingdom.military.offensiveFocus = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.military.offensiveFocus + 0.01, 0.2, 0.85));
                    }
                }
                if (isEnabled(kingdom.administration.automation.construction || enums_1.AutomationLevel.Manual)) {
                    if (state.meta.tick % 5 === 0) {
                        handleConstructionAutomation(state, kingdom, context, orderedDefinitions);
                    }
                }
                if (isEnabled(kingdom.administration.automation.expansion)) {
                    if (warCount === 0 && threat < 0.52 && kingdom.stability > 52 && kingdom.economy.stock.gold > 120) {
                        kingdom.military.posture = enums_1.ArmyPosture.Aggressive;
                        kingdom.military.offensiveFocus = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.military.offensiveFocus + 0.02, 0.3, 0.95));
                        kingdom.military.targetRegionIds = selectExpansionTargets(state, kingdom.id, definitions)
                            .sort((leftId, rightId) => (definitions[rightId]?.strategicValue ?? 0) - (definitions[leftId]?.strategicValue ?? 0))
                            .slice(0, 2);
                    }
                    else if (warCount > 0 || threat > 0.72) {
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
                            ? (0, technology_tree_1.selectResearchNodeTowardsTarget)(kingdom.technology, kingdom.technology.researchGoalId) ??
                                (0, technology_tree_1.selectDefaultResearchNode)(kingdom.technology, kingdom.technology.researchFocus)
                            : (0, technology_tree_1.selectDefaultResearchNode)(kingdom.technology, kingdom.technology.researchFocus);
                        kingdom.technology.activeResearchId = target?.id ?? null;
                    }
                }
                if (isEnabled(kingdom.administration.automation.diplomacyReactive) && threat > 0.7) {
                    for (const relation of Object.keys(kingdom.diplomacy.relations)
                        .sort()
                        .map((relationId) => kingdom.diplomacy.relations[relationId])
                        .sort((left, right) => right.score.rivalry - left.score.rivalry)
                        .slice(0, 2)) {
                        relation.score.rivalry = (0, utils_1.roundTo)((0, utils_1.clamp)(relation.score.rivalry - 0.02, 0, 1));
                        relation.score.borderTension = (0, utils_1.roundTo)((0, utils_1.clamp)(relation.score.borderTension - 0.015, 0, 1));
                        relation.score.trust = (0, utils_1.roundTo)((0, utils_1.clamp)(relation.score.trust + 0.01, 0, 1));
                    }
                }
                if (kingdom.administration.directives?.religious_mission) {
                    const ownedRegions = (0, utils_1.getOwnedRegionIds)(state, kingdom.id);
                    const borderKingdomIds = new Set();
                    for (const regionId of ownedRegions) {
                        const definition = definitions[regionId];
                        if (!definition)
                            continue;
                        for (const neighborId of definition.neighbors) {
                            const neighborRegion = state.world.regions[neighborId];
                            if (neighborRegion && neighborRegion.ownerId && neighborRegion.ownerId !== kingdom.id && neighborRegion.ownerId !== "k_nature") {
                                borderKingdomIds.add(neighborRegion.ownerId);
                            }
                        }
                    }
                    const sortedBorderTargets = Array.from(borderKingdomIds).sort();
                    let missionSeq = 0;
                    for (const targetKingdomId of sortedBorderTargets) {
                        const targetKingdom = state.kingdoms[targetKingdomId];
                        if (!targetKingdom)
                            continue;
                        const relation = kingdom.diplomacy.relations[targetKingdomId];
                        if (!relation)
                            continue;
                        const cooldownKey = "religion:send_missionaries";
                        const cooldownUntil = relation.actionCooldowns?.[cooldownKey] ?? 0;
                        if (cooldownUntil > context.now) {
                            continue;
                        }
                        const goldCost = 18;
                        const faithCost = 26;
                        const legitimacyCost = 2;
                        const cost = {
                            [enums_1.ResourceType.Gold]: goldCost,
                            [enums_1.ResourceType.Faith]: faithCost,
                            [enums_1.ResourceType.Legitimacy]: legitimacyCost
                        };
                        if (!canAfford(state, kingdom.id, cost, orderedDefinitions)) {
                            continue;
                        }
                        if ((kingdom.economy.stock[enums_1.ResourceType.Gold] ?? 0) < goldCost ||
                            (kingdom.economy.stock[enums_1.ResourceType.Faith] ?? 0) < faithCost ||
                            (kingdom.economy.stock[enums_1.ResourceType.Legitimacy] ?? 0) < legitimacyCost) {
                            continue;
                        }
                        const capitalIndex = getKingdomCapitalIndex(kingdom, orderedDefinitions);
                        if (capitalIndex !== -1 && state.ecs) {
                            if (state.ecs.gold && capitalIndex < state.ecs.gold.length) {
                                state.ecs.gold[capitalIndex] = (0, utils_1.roundTo)(Math.max(0, state.ecs.gold[capitalIndex] - goldCost));
                            }
                            if (state.ecs.faith && capitalIndex < state.ecs.faith.length) {
                                state.ecs.faith[capitalIndex] = (0, utils_1.roundTo)(Math.max(0, state.ecs.faith[capitalIndex] - faithCost));
                            }
                            if (state.ecs.legitimacy && capitalIndex < state.ecs.legitimacy.length) {
                                state.ecs.legitimacy[capitalIndex] = (0, utils_1.roundTo)(Math.max(0, state.ecs.legitimacy[capitalIndex] - legitimacyCost));
                            }
                        }
                        kingdom.economy.stock[enums_1.ResourceType.Gold] = (0, utils_1.roundTo)(Math.max(0, (kingdom.economy.stock[enums_1.ResourceType.Gold] ?? 0) - goldCost));
                        kingdom.economy.stock[enums_1.ResourceType.Faith] = (0, utils_1.roundTo)(Math.max(0, (kingdom.economy.stock[enums_1.ResourceType.Faith] ?? 0) - faithCost));
                        kingdom.economy.stock[enums_1.ResourceType.Legitimacy] = (0, utils_1.roundTo)(Math.max(0, (kingdom.economy.stock[enums_1.ResourceType.Legitimacy] ?? 0) - legitimacyCost));
                        relation.actionCooldowns = relation.actionCooldowns ?? {};
                        relation.actionCooldowns[cooldownKey] = context.now + 90_000;
                        const reverseRelation = targetKingdom.diplomacy.relations[kingdom.id];
                        if (reverseRelation) {
                            reverseRelation.actionCooldowns = reverseRelation.actionCooldowns ?? {};
                            reverseRelation.actionCooldowns[cooldownKey] = context.now + 90_000;
                        }
                        const actorMissionaryPower = (0, utils_1.clamp)(kingdom.religion.authority * 0.5 + kingdom.religion.missionaryBudget * 0.5, 0, 1);
                        const targetResistance = (0, utils_1.clamp)(targetKingdom.religion.authority * 0.45 + targetKingdom.religion.tolerance * 0.35 + (targetKingdom.stability / 100) * 0.2, 0, 1);
                        const chance = (0, utils_1.clamp)(0.2 + actorMissionaryPower * 0.55 - targetResistance * 0.32, 0.08, 0.9);
                        const pressureGain = (0, utils_1.clamp)(0.2 + actorMissionaryPower * 0.18, 0.16, 0.42);
                        const roll = Math.random();
                        const success = roll <= chance;
                        if (success) {
                            const currentInfluence = targetKingdom.religion.externalInfluenceIn[kingdom.id] ?? 0;
                            const boostedInfluence = (0, utils_1.clamp)(currentInfluence + pressureGain, 0, 1);
                            targetKingdom.religion.externalInfluenceIn[kingdom.id] = (0, utils_1.roundTo)(boostedInfluence, 4);
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_religion",
                                    tick: state.meta.tick,
                                    systemId: "automation",
                                    actorId: kingdom.id,
                                    sequence: missionSeq++
                                }),
                                type: "religion.mission_started",
                                actorKingdomId: kingdom.id,
                                targetKingdomId: targetKingdom.id,
                                payload: {
                                    influence: (0, utils_1.roundTo)(boostedInfluence, 4),
                                    pressure: (0, utils_1.roundTo)(pressureGain, 4)
                                },
                                occurredAt: context.now
                            });
                        }
                        else {
                            kingdom.stability = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.stability - 0.25, 0, 100));
                        }
                    }
                }
            }
        }
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEconomySystem = createEconomySystem;
const enums_1 = require("../../models/enums");
const economy_1 = require("../../models/economy");
const utils_1 = require("./utils");
function createEconomySystem() {
    return {
        id: "economy",
        run(context) {
            const state = context.nextState;
            const definitions = context.staticData.definitions;
            let eventSeq = 0;
            for (const kingdomId of Object.keys(state.kingdoms).sort()) {
                if (kingdomId === "k_nature")
                    continue;
                const kingdom = state.kingdoms[kingdomId];
                const ownedRegionIds = (0, utils_1.getOwnedRegionIds)(state, kingdom.id);
                const regionEconomy = ownedRegionIds.reduce((acc, regionId) => {
                    const definition = definitions[regionId];
                    const region = state.world.regions[regionId];
                    if (!definition || !region) {
                        return acc;
                    }
                    const productivity = (0, utils_1.clamp)(1 - region.unrest * 0.48 - region.devastation * 0.62 - region.autonomy * 0.2 + region.assimilation * 0.16, 0.28, 1.35);
                    return {
                        economy: acc.economy + definition.economyValue * productivity,
                        military: acc.military + definition.militaryValue * productivity,
                        food: acc.food + definition.economyValue * (1.12 - region.devastation * 0.5)
                    };
                }, { economy: 0, military: 0, food: 0 });
                const populationFactor = kingdom.population.total / 100_000;
                const soldierShare = kingdom.population.groups.soldiers;
                const merchantShare = kingdom.population.groups.merchants;
                const armyManpower = kingdom.military.armies.reduce((sum, army) => sum + army.manpower, 0);
                const taxLoad = (0, utils_1.clamp)(kingdom.economy.taxPolicy.baseRate +
                    kingdom.economy.taxPolicy.tariffRate * 0.45 -
                    kingdom.economy.taxPolicy.nobleRelief * 0.22 -
                    kingdom.economy.taxPolicy.clergyExemption * 0.18, 0.06, 0.58);
                const budget = kingdom.economy.budgetPriority;
                const militaryBudgetFactor = budget.military / 100;
                const economyBudgetFactor = budget.economy / 100;
                const administrationBudgetFactor = budget.administration / 100;
                const taxIncomeFactor = 0.72 + taxLoad * 1.05;
                const goldIncome = (0, utils_1.roundTo)((regionEconomy.economy * (0.78 + merchantShare * 0.62) + populationFactor * 0.24) * taxIncomeFactor);
                const foodIncome = (0, utils_1.roundTo)(regionEconomy.food * (0.92 + economyBudgetFactor * 0.24) + kingdom.population.groups.peasants * 3.2);
                const woodIncome = (0, utils_1.roundTo)(regionEconomy.economy * (0.4 + economyBudgetFactor * 0.15));
                const ironIncome = (0, utils_1.roundTo)(regionEconomy.military * (0.26 + militaryBudgetFactor * 0.22));
                const faithIncome = (0, utils_1.roundTo)(ownedRegionIds.length * 0.12 * (1 + kingdom.religion.authority));
                const legitimacyIncome = (0, utils_1.roundTo)(0.06 + kingdom.stability / 560 + kingdom.legitimacy / 1_200);
                const adminPenalty = (0, utils_1.clamp)(kingdom.administration.usedCapacity / Math.max(1, kingdom.administration.adminCapacity), 0.4, 1.9);
                let councilSalaryTotal = 0;
                if (kingdom.administration.council) {
                    for (const minister of Object.values(kingdom.administration.council)) {
                        if (minister && minister.salary)
                            councilSalaryTotal += minister.salary;
                    }
                }
                const goldUpkeep = (0, utils_1.roundTo)(armyManpower / 8_300 +
                    kingdom.administration.usedCapacity * 0.042 +
                    kingdom.economy.corruption * 1.8 +
                    adminPenalty * (0.12 - administrationBudgetFactor * 0.04) +
                    councilSalaryTotal);
                const foodUpkeep = (0, utils_1.roundTo)(kingdom.population.total / 95_000 + armyManpower / 5_500);
                const woodUpkeep = (0, utils_1.roundTo)(armyManpower / 30_000);
                const ironUpkeep = (0, utils_1.roundTo)((armyManpower / 22_000) * (0.8 + soldierShare));
                const faithUpkeep = (0, utils_1.roundTo)(0.04 + (1 - kingdom.religion.tolerance) * 0.2);
                const legitimacyUpkeep = (0, utils_1.roundTo)((100 - kingdom.stability) / 900 + Math.max(0, taxLoad - 0.34) * 0.07);
                kingdom.economy.incomePerTick = (0, economy_1.createEmptyStock)();
                kingdom.economy.upkeepPerTick = (0, economy_1.createEmptyStock)();
                kingdom.economy.incomePerTick[enums_1.ResourceType.Gold] = goldIncome;
                kingdom.economy.incomePerTick[enums_1.ResourceType.Food] = foodIncome;
                kingdom.economy.incomePerTick[enums_1.ResourceType.Wood] = woodIncome;
                kingdom.economy.incomePerTick[enums_1.ResourceType.Iron] = ironIncome;
                kingdom.economy.incomePerTick[enums_1.ResourceType.Faith] = faithIncome;
                kingdom.economy.incomePerTick[enums_1.ResourceType.Legitimacy] = legitimacyIncome;
                kingdom.economy.upkeepPerTick[enums_1.ResourceType.Gold] = goldUpkeep;
                kingdom.economy.upkeepPerTick[enums_1.ResourceType.Food] = foodUpkeep;
                kingdom.economy.upkeepPerTick[enums_1.ResourceType.Wood] = woodUpkeep;
                kingdom.economy.upkeepPerTick[enums_1.ResourceType.Iron] = ironUpkeep;
                kingdom.economy.upkeepPerTick[enums_1.ResourceType.Faith] = faithUpkeep;
                kingdom.economy.upkeepPerTick[enums_1.ResourceType.Legitimacy] = legitimacyUpkeep;
                for (const resource of Object.values(enums_1.ResourceType)) {
                    kingdom.economy.stock[resource] = (0, utils_1.roundTo)(kingdom.economy.stock[resource] + kingdom.economy.incomePerTick[resource] - kingdom.economy.upkeepPerTick[resource]);
                }
                (0, utils_1.ensureResourceNonNegative)(kingdom);
                kingdom.population.pressure.taxation = (0, utils_1.roundTo)((0, utils_1.clamp)(taxLoad, 0, 1));
                kingdom.stability = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.stability - Math.max(0, taxLoad - 0.32) * 0.26 + economyBudgetFactor * 0.08 - kingdom.economy.corruption * 0.05, 0, 100));
                if (kingdom.economy.stock[enums_1.ResourceType.Food] < kingdom.population.total / 8_000 && context.nextState.meta.tick % 5 === 0) {
                    context.events.push({
                        id: (0, utils_1.createEventId)({
                            prefix: "evt_food",
                            tick: context.nextState.meta.tick,
                            systemId: "economy",
                            actorId: kingdom.id,
                            sequence: eventSeq++
                        }),
                        type: "economy.food_shortage",
                        actorKingdomId: kingdom.id,
                        payload: {
                            stock: kingdom.economy.stock[enums_1.ResourceType.Food],
                            required: (0, utils_1.roundTo)(kingdom.population.total / 8_000)
                        },
                        occurredAt: context.now
                    });
                }
            }
            // Processamento de Tributos Contínuos (Vassalagem)
            for (const kingdomId of Object.keys(state.kingdoms)) {
                const kingdom = state.kingdoms[kingdomId];
                for (const treaty of kingdom.diplomacy.treaties) {
                    if (treaty.type === enums_1.TreatyType.Vassalage && treaty.terms.vassalId === kingdom.id) {
                        const overlord = state.kingdoms[treaty.terms.overlordId];
                        if (overlord) {
                            const tribute = (0, utils_1.roundTo)(kingdom.economy.incomePerTick[enums_1.ResourceType.Gold] * (treaty.terms.tributeRate || 0.15));
                            kingdom.economy.incomePerTick[enums_1.ResourceType.Gold] -= tribute;
                            kingdom.economy.stock[enums_1.ResourceType.Gold] = Math.max(0, kingdom.economy.stock[enums_1.ResourceType.Gold] - tribute);
                            overlord.economy.incomePerTick[enums_1.ResourceType.Gold] += tribute;
                            overlord.economy.stock[enums_1.ResourceType.Gold] += tribute;
                        }
                    }
                }
            }
        }
    };
}

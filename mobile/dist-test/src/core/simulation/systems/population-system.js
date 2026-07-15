"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPopulationSystem = createPopulationSystem;
const enums_1 = require("../../models/enums");
const utils_1 = require("./utils");
function createPopulationSystem(orderedDefinitions) {
    return {
        id: "population",
        run(context) {
            let eventSeq = 0;
            for (const kingdomId of Object.keys(context.nextState.kingdoms).sort()) {
                const kingdom = context.nextState.kingdoms[kingdomId];
                const foodStock = kingdom.economy.stock[enums_1.ResourceType.Food];
                const requiredFood = kingdom.population.total / 7_000;
                const foodPressure = requiredFood <= 0 ? 0 : (0, utils_1.clamp)((requiredFood - foodStock) / requiredFood, 0, 1);
                const naturalGrowth = kingdom.population.total * kingdom.population.growthRatePerTick;
                const growthPenalty = 1 - foodPressure * 1.6 - kingdom.population.pressure.warWeariness * 0.2;
                const populationDelta = Math.round(naturalGrowth * growthPenalty);
                kingdom.population.total = Math.max(120_000, kingdom.population.total + populationDelta);
                kingdom.population.pressure.famineRisk = (0, utils_1.roundTo)((0, utils_1.clamp)(foodPressure, 0, 1));
                kingdom.population.unrest = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.population.unrest + foodPressure * 0.05 + kingdom.population.pressure.taxation * 0.01 - kingdom.religion.cohesion * 0.01, 0, 1));
                const stabilityShift = (0.5 - kingdom.population.unrest) * 1.2;
                kingdom.stability = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.stability + stabilityShift, 0, 100));
                if (kingdom.population.unrest > 0.75 && context.nextState.meta.tick % 7 === 0) {
                    context.events.push({
                        id: (0, utils_1.createEventId)({
                            prefix: "evt_unrest",
                            tick: context.nextState.meta.tick,
                            systemId: "population",
                            actorId: kingdom.id,
                            sequence: eventSeq++
                        }),
                        type: "population.unrest_warning",
                        actorKingdomId: kingdom.id,
                        payload: {
                            unrest: kingdom.population.unrest,
                            stability: kingdom.stability
                        },
                        occurredAt: context.now
                    });
                }
            }
            // Grow region populations
            if (context.nextState.ecs && context.nextState.ecs.populationTotal && context.nextState.ecs.populationGrowthRate) {
                const tickScale = context.tickScale ?? 1;
                for (let i = 0; i < orderedDefinitions.length; i++) {
                    const def = orderedDefinitions[i];
                    const regionState = context.nextState.world.regions[def.id];
                    if (!regionState || regionState.ownerId === "k_nature")
                        continue;
                    const kingdom = context.nextState.kingdoms[regionState.ownerId];
                    if (!kingdom)
                        continue;
                    const foodStock = kingdom.economy.stock[enums_1.ResourceType.Food];
                    const requiredFood = kingdom.population.total / 7_000;
                    const foodPressure = requiredFood <= 0 ? 0 : (0, utils_1.clamp)((requiredFood - foodStock) / requiredFood, 0, 1);
                    const growthPenalty = 1 - foodPressure * 1.6 - kingdom.population.pressure.warWeariness * 0.2;
                    const currentPop = context.nextState.ecs.populationTotal[i];
                    const growthRate = context.nextState.ecs.populationGrowthRate[i];
                    const delta = currentPop * growthRate * growthPenalty * tickScale;
                    context.nextState.ecs.populationTotal[i] = Math.max(0, currentPop + delta);
                }
            }
        }
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultPopulationDistribution = createDefaultPopulationDistribution;
const enums_1 = require("./enums");
function createDefaultPopulationDistribution() {
    return {
        [enums_1.PopulationClass.Peasants]: 0.72,
        [enums_1.PopulationClass.Nobles]: 0.04,
        [enums_1.PopulationClass.Clergy]: 0.07,
        [enums_1.PopulationClass.Soldiers]: 0.09,
        [enums_1.PopulationClass.Merchants]: 0.08
    };
}

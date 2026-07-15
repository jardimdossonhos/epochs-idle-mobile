"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyStock = createEmptyStock;
exports.createDefaultBudgetPriority = createDefaultBudgetPriority;
const enums_1 = require("./enums");
function createEmptyStock() {
    return {
        [enums_1.ResourceType.Gold]: 0,
        [enums_1.ResourceType.Food]: 0,
        [enums_1.ResourceType.Wood]: 0,
        [enums_1.ResourceType.Iron]: 0,
        [enums_1.ResourceType.Faith]: 0,
        [enums_1.ResourceType.Legitimacy]: 0
    };
}
function createDefaultBudgetPriority() {
    return {
        economy: 20,
        military: 20,
        religion: 20,
        administration: 20,
        technology: 20
    };
}

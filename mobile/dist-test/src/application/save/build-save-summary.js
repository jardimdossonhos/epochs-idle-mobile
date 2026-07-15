"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSaveSummary = buildSaveSummary;
const enums_1 = require("../../core/models/enums");
function buildSaveSummary(slotId, state, savedAt = Date.now()) {
    const player = Object.values(state.kingdoms).find((kingdom) => kingdom.isPlayer);
    if (!player) {
        throw new Error("Player kingdom not found while building save summary.");
    }
    const territoryCount = Object.values(state.world.regions).filter((region) => region.ownerId === player.id).length;
    const militaryPower = player.military.armies.reduce((sum, army) => sum + army.manpower * army.quality, 0);
    const economyPower = player.economy.stock[enums_1.ResourceType.Gold] +
        player.economy.stock[enums_1.ResourceType.Food] * 0.2 +
        player.economy.stock[enums_1.ResourceType.Iron] * 0.8 +
        player.economy.stock[enums_1.ResourceType.Wood] * 0.4;
    return {
        slotId,
        savedAt,
        campaignName: state.campaign.name,
        playerKingdomName: player.name,
        tick: state.meta.tick,
        territoryCount,
        militaryPower: Math.round(militaryPower),
        economyPower: Math.round(economyPower),
        victoryAchieved: state.victory.achievedPath !== null
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = clamp;
exports.roundTo = roundTo;
exports.getPlayerKingdom = getPlayerKingdom;
exports.getOwnedRegionIds = getOwnedRegionIds;
exports.ensureResourceNonNegative = ensureResourceNonNegative;
exports.createEventId = createEventId;
const enums_1 = require("../../models/enums");
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function roundTo(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
function getPlayerKingdom(state) {
    const player = Object.keys(state.kingdoms)
        .sort()
        .map((kingdomId) => state.kingdoms[kingdomId])
        .find((kingdom) => kingdom.isPlayer);
    if (!player) {
        throw new Error("No player kingdom found in game state.");
    }
    return player;
}
function getOwnedRegionIds(state, kingdomId) {
    const kingdom = state.kingdoms[kingdomId];
    if (!kingdom)
        return [];
    if (!kingdom.ownedRegionIds) {
        const regionIds = Object.keys(state.world.regions);
        for (const kid of Object.keys(state.kingdoms)) {
            state.kingdoms[kid].ownedRegionIds = [];
        }
        for (let i = 0; i < regionIds.length; i++) {
            const regionId = regionIds[i];
            const ownerId = state.world.regions[regionId].ownerId;
            if (ownerId && state.kingdoms[ownerId]) {
                state.kingdoms[ownerId].ownedRegionIds.push(regionId);
            }
        }
        for (const kid of Object.keys(state.kingdoms)) {
            state.kingdoms[kid].ownedRegionIds.sort();
        }
    }
    return kingdom.ownedRegionIds || [];
}
function ensureResourceNonNegative(kingdom) {
    for (const key of Object.values(enums_1.ResourceType)) {
        if (kingdom.economy.stock[key] < 0) {
            kingdom.economy.stock[key] = 0;
        }
    }
}
function sanitizeEventIdPart(value) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
function createEventId(input) {
    const actorId = sanitizeEventIdPart(input.actorId ?? "none");
    const systemId = sanitizeEventIdPart(input.systemId);
    const sequence = Math.max(0, Math.trunc(input.sequence));
    return `${input.prefix}_${Math.trunc(input.tick)}_${systemId}_${actorId}_${sequence}`;
}

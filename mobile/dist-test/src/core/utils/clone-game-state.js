"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneGameStateForSimulation = cloneGameStateForSimulation;
function cloneGameStateForSimulation(previousState) {
    return {
        meta: {
            ...previousState.meta
        },
        campaign: previousState.campaign,
        world: {
            mapId: previousState.world.mapId,
            regions: structuredClone(previousState.world.regions),
            religions: structuredClone(previousState.world.religions),
            characters: previousState.world.characters ? structuredClone(previousState.world.characters) : undefined,
            eventChains: previousState.world.eventChains ? structuredClone(previousState.world.eventChains) : undefined
        },
        kingdoms: structuredClone(previousState.kingdoms),
        wars: structuredClone(previousState.wars),
        events: structuredClone(previousState.events),
        victory: {
            ...previousState.victory
        },
        randomSeed: previousState.randomSeed
    };
}

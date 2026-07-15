"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStateHash = buildStateHash;
exports.buildStateFingerprint = buildStateFingerprint;
const stable_hash_1 = require("./stable-hash");
function serializeStateForHash(state) {
    return {
        meta: {
            schemaVersion: state.meta.schemaVersion,
            tick: state.meta.tick,
            tickDurationMs: state.meta.tickDurationMs
        },
        campaign: state.campaign,
        world: state.world,
        kingdoms: state.kingdoms,
        wars: state.wars,
        victory: state.victory,
        randomSeed: state.randomSeed
    };
}
function buildStateHash(state) {
    return (0, stable_hash_1.hashDeterministic)(serializeStateForHash(state));
}
function buildStateFingerprint(state) {
    return {
        tick: state.meta.tick,
        schemaVersion: state.meta.schemaVersion,
        campaignId: state.campaign.id,
        mapId: state.world.mapId,
        hash: buildStateHash(state)
    };
}

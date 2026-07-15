"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVictorySystem = createVictorySystem;
const enums_1 = require("../../models/enums");
const utils_1 = require("./utils");
function createVictorySystem() {
    return {
        id: "victory",
        run(context) {
            const state = context.nextState;
            let eventSeq = 0;
            const player = (0, utils_1.getPlayerKingdom)(state);
            const totalRegions = Math.max(1, Object.keys(state.world.regions).length);
            const playerTerritory = (0, utils_1.getOwnedRegionIds)(state, player.id).length;
            const territorialShare = playerTerritory / totalRegions;
            player.victoryProgress[enums_1.VictoryPath.TerritorialDomination] = (0, utils_1.roundTo)(territorialShare);
            if (state.victory.achievedPath === null) {
                const target = state.campaign.victoryTargets.find((item) => item.path === enums_1.VictoryPath.TerritorialDomination);
                if (target && territorialShare >= target.threshold) {
                    state.victory.achievedPath = enums_1.VictoryPath.TerritorialDomination;
                    state.victory.achievedAt = context.now;
                    state.victory.postVictoryMode = true;
                    context.events.push({
                        id: (0, utils_1.createEventId)({
                            prefix: "evt_victory",
                            tick: state.meta.tick,
                            systemId: "victory",
                            actorId: player.id,
                            sequence: eventSeq++
                        }),
                        type: "victory.achieved",
                        actorKingdomId: player.id,
                        payload: {
                            path: enums_1.VictoryPath.TerritorialDomination,
                            territorialShare: (0, utils_1.roundTo)(territorialShare)
                        },
                        occurredAt: context.now
                    });
                }
            }
            if (state.victory.postVictoryMode) {
                state.victory.crisisPressure = (0, utils_1.roundTo)((0, utils_1.clamp)(state.victory.crisisPressure + 0.002 + Math.max(0, territorialShare - 0.55) * 0.01, 0, 1));
            }
        }
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDiplomacySystem = createDiplomacySystem;
function createDiplomacySystem(diplomacyResolver) {
    return {
        id: "diplomacy",
        run(context) {
            context.nextState = diplomacyResolver.resolveTick(context.nextState, context.now);
        }
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickPipeline = void 0;
const clone_game_state_1 = require("../utils/clone-game-state");
class TickPipeline {
    systems;
    staticData;
    constructor(systems, staticData) {
        this.systems = systems;
        this.staticData = staticData;
    }
    run(previousState, deltaMs, now) {
        const nextState = (0, clone_game_state_1.cloneGameStateForSimulation)(previousState);
        // Bypass de Corrupção: Restaura o ponteiro real do Float64Array destruído pelo clone
        nextState.ecs = previousState.ecs;
        const events = this.runInPlace(nextState, deltaMs, now, 1);
        return {
            state: nextState,
            events
        };
    }
    runMutating(state, deltaMs, now) {
        const events = this.runInPlace(state, deltaMs, now, 1);
        return {
            state,
            events
        };
    }
    runBatch(previousState, tickCount, deltaMs, startNow, options = {}) {
        const ticks = Math.max(0, Math.trunc(tickCount));
        if (ticks === 0) {
            return {
                state: previousState,
                events: []
            };
        }
        const collectEvents = options.collectEvents ?? false;
        const maxCollectedEvents = Math.max(1, options.maxCollectedEvents ?? 120);
        const coarseStepTicks = Math.max(1, Math.trunc(options.coarseStepTicks ?? 1));
        const nextState = (0, clone_game_state_1.cloneGameStateForSimulation)(previousState);
        // Bypass de Corrupção: Restaura o ponteiro real do Float64Array destruído pelo clone
        nextState.ecs = previousState.ecs;
        const collectedEvents = [];
        let processedTicks = 0;
        while (processedTicks < ticks) {
            const remainingTicks = ticks - processedTicks;
            const tickScale = collectEvents ? 1 : Math.min(coarseStepTicks, remainingTicks);
            const now = startNow + (processedTicks + tickScale) * deltaMs;
            const events = this.runInPlace(nextState, deltaMs * tickScale, now, tickScale);
            processedTicks += tickScale;
            if (!collectEvents || events.length === 0) {
                continue;
            }
            collectedEvents.push(...events);
            if (collectedEvents.length > maxCollectedEvents) {
                collectedEvents.splice(0, collectedEvents.length - maxCollectedEvents);
            }
        }
        return {
            state: nextState,
            events: collectedEvents
        };
    }
    runInPlace(nextState, deltaMs, now, tickScale) {
        const context = {
            previousState: nextState,
            nextState,
            staticData: this.staticData,
            deltaMs,
            tickScale,
            now,
            events: []
        };
        context.nextState.meta.lastUpdatedAt = now;
        for (const system of this.systems) {
            system.run(context);
        }
        context.nextState.meta.tick += tickScale;
        context.nextState.meta.lastUpdatedAt = now;
        return context.events;
    }
}
exports.TickPipeline = TickPipeline;

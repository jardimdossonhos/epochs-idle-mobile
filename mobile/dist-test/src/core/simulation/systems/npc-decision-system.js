"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNpcDecisionSystem = createNpcDecisionSystem;
const utils_1 = require("./utils");
function createMemoryEntry(decision, now) {
    if (!decision.targetKingdomId) {
        return null;
    }
    switch (decision.actionType) {
        case "oferta_alianca":
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: 0.08,
                fearDelta: -0.02,
                grievanceDelta: -0.05,
                note: "oferta_alianca",
                happenedAt: now
            };
        case "declarar_guerra":
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: -0.2,
                fearDelta: 0.18,
                grievanceDelta: 0.22,
                note: "declaracao_guerra",
                happenedAt: now
            };
        case "pressao_fronteirica":
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: -0.05,
                fearDelta: 0.08,
                grievanceDelta: 0.09,
                note: "pressao_fronteirica",
                happenedAt: now
            };
        case "proposta_paz":
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: 0.06,
                fearDelta: -0.05,
                grievanceDelta: -0.1,
                note: "proposta_paz",
                happenedAt: now
            };
        case "acordo_comercial":
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: 0.08,
                fearDelta: -0.02,
                grievanceDelta: -0.03,
                note: "acordo_comercial",
                happenedAt: now
            };
        case "pacto_defensivo":
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: 0.12,
                fearDelta: -0.05,
                grievanceDelta: -0.06,
                note: "pacto_defensivo",
                happenedAt: now
            };
        case "financiar_guerra":
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: 0.08,
                fearDelta: -0.03,
                grievanceDelta: -0.04,
                note: "financiar_guerra",
                happenedAt: now
            };
        default:
            return {
                otherKingdomId: decision.targetKingdomId,
                trustDelta: 0,
                fearDelta: 0,
                grievanceDelta: 0,
                note: decision.actionType,
                happenedAt: now
            };
    }
}
function appendMemory(memories, entry) {
    return [entry, ...memories].slice(0, 28);
}
function findWarBetween(wars, leftId, rightId) {
    return wars.find((war) => (war.attackers.includes(leftId) && war.defenders.includes(rightId)) ||
        (war.attackers.includes(rightId) && war.defenders.includes(leftId)));
}
function createNpcDecisionSystem(decisionService, diplomacyResolver, warResolver) {
    return {
        id: "npc_decision",
        run(context) {
            const state = context.nextState;
            let eventSeq = 0;
            for (const kingdomId of Object.keys(state.kingdoms).sort()) {
                const kingdom = state.kingdoms[kingdomId];
                if (kingdom.isPlayer || !kingdom.npc) {
                    continue;
                }
                const decisions = decisionService.decide(state, kingdom.id, context.now);
                for (const decision of decisions) {
                    context.nextState = diplomacyResolver.applyDecision(context.nextState, decision);
                    let decisionResult = "registered";
                    let warRisk = 0;
                    if (decision.targetKingdomId && decision.actionType === "declarar_guerra") {
                        const attacker = context.nextState.kingdoms[decision.actorKingdomId];
                        const defender = context.nextState.kingdoms[decision.targetKingdomId];
                        if (attacker && defender) {
                            warRisk = warResolver.evaluateWarRisk(attacker, defender, context.nextState);
                            if (warRisk >= 0.22) {
                                const beforeWarIds = new Set(Object.keys(context.nextState.wars).sort());
                                context.nextState = warResolver.declareWar(context.nextState, attacker.id, defender.id);
                                const warsAfter = Object.keys(context.nextState.wars)
                                    .sort()
                                    .map((warId) => context.nextState.wars[warId]);
                                const newWar = warsAfter.find((war) => !beforeWarIds.has(war.id));
                                if (newWar) {
                                    decisionResult = "war_declared";
                                    context.events.push({
                                        id: (0, utils_1.createEventId)({
                                            prefix: "evt_war_start",
                                            tick: context.nextState.meta.tick,
                                            systemId: "npc_decision",
                                            actorId: attacker.id,
                                            sequence: eventSeq++
                                        }),
                                        type: "war.started",
                                        actorKingdomId: attacker.id,
                                        targetKingdomId: defender.id,
                                        payload: {
                                            warId: newWar.id,
                                            attackers: newWar.attackers,
                                            defenders: newWar.defenders
                                        },
                                        occurredAt: context.now
                                    });
                                }
                            }
                            else {
                                decisionResult = "war_cancelled_low_risk";
                            }
                        }
                    }
                    if (decision.targetKingdomId && decision.actionType === "proposta_paz") {
                        const activeWar = findWarBetween(Object.keys(context.nextState.wars)
                            .sort()
                            .map((warId) => context.nextState.wars[warId]), decision.actorKingdomId, decision.targetKingdomId);
                        if (activeWar) {
                            context.nextState = warResolver.enforcePeace(context.nextState, activeWar.id);
                            decisionResult = "peace_accepted";
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_war_peace",
                                    tick: context.nextState.meta.tick,
                                    systemId: "npc_decision",
                                    actorId: decision.actorKingdomId,
                                    sequence: eventSeq++
                                }),
                                type: "war.peace",
                                actorKingdomId: decision.actorKingdomId,
                                targetKingdomId: decision.targetKingdomId,
                                payload: {
                                    warId: activeWar.id,
                                    source: "npc_proposal"
                                },
                                occurredAt: context.now
                            });
                        }
                    }
                    const memory = createMemoryEntry(decision, context.now);
                    if (memory) {
                        kingdom.npc.memories = appendMemory(kingdom.npc.memories, memory);
                    }
                    kingdom.npc.lastDecisionTick = context.nextState.meta.tick;
                    context.events.push({
                        id: (0, utils_1.createEventId)({
                            prefix: "evt_npc",
                            tick: context.nextState.meta.tick,
                            systemId: "npc_decision",
                            actorId: decision.actorKingdomId,
                            sequence: eventSeq++
                        }),
                        type: "npc.decision",
                        actorKingdomId: decision.actorKingdomId,
                        targetKingdomId: decision.targetKingdomId,
                        payload: {
                            actionType: decision.actionType,
                            priority: (0, utils_1.roundTo)(decision.priority),
                            targetRegionId: decision.targetRegionId,
                            result: decisionResult,
                            warRisk,
                            ...decision.payload
                        },
                        occurredAt: context.now
                    });
                }
            }
        }
    };
}

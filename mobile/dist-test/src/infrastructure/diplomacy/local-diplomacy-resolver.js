"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalDiplomacyResolver = void 0;
const enums_1 = require("../../core/models/enums");
const identifiers_1 = require("../../core/models/identifiers");
const DEFAULT_TREATY_DURATION_MS = 1000 * 60 * 18;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function roundTo(value, decimals = 3) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
function getOwnedRegionCount(state, kingdomId) {
    let total = 0;
    for (const regionId of Object.keys(state.world.regions).sort()) {
        const region = state.world.regions[regionId];
        if (region.ownerId === kingdomId) {
            total += 1;
        }
    }
    return total;
}
function buildTerritoryCounts(state) {
    const counts = new Map();
    for (const kingdomId of Object.keys(state.kingdoms).sort()) {
        counts.set(kingdomId, 0);
    }
    for (const regionId of Object.keys(state.world.regions).sort()) {
        const ownerId = state.world.regions[regionId].ownerId;
        counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
    }
    return counts;
}
function ensureRelation(kingdom, otherKingdomId) {
    const existing = kingdom.diplomacy.relations[otherKingdomId];
    if (existing) {
        return existing;
    }
    const created = {
        withKingdomId: otherKingdomId,
        status: enums_1.DiplomaticRelation.Neutral,
        score: {
            trust: 0.4,
            fear: 0.2,
            rivalry: 0.2,
            religiousTension: 0.2,
            borderTension: 0.2,
            tradeValue: 0.2
        },
        grievance: 0.08,
        allianceStrength: 0,
        actionCooldowns: {}
    };
    kingdom.diplomacy.relations[otherKingdomId] = created;
    return created;
}
function setPairStatus(state, leftId, rightId, status) {
    const left = state.kingdoms[leftId];
    const right = state.kingdoms[rightId];
    if (!left || !right) {
        return;
    }
    ensureRelation(left, rightId).status = status;
    ensureRelation(right, leftId).status = status;
}
function hasActiveTreaty(state, kingdomIdA, kingdomIdB, type, now) {
    const kingdom = state.kingdoms[kingdomIdA];
    if (!kingdom) {
        return false;
    }
    return kingdom.diplomacy.treaties.some((treaty) => {
        const matchesType = treaty.type === type;
        const matchesParties = treaty.parties.includes(kingdomIdA) && treaty.parties.includes(kingdomIdB);
        const active = treaty.expiresAt === null || treaty.expiresAt > now;
        return matchesType && matchesParties && active;
    });
}
function addTreaty(kingdom, treaty) {
    const index = kingdom.diplomacy.treaties.findIndex((current) => current.id === treaty.id);
    if (index >= 0) {
        kingdom.diplomacy.treaties[index] = treaty;
        return;
    }
    kingdom.diplomacy.treaties.push(treaty);
}
function registerPairTreaty(state, leftId, rightId, type, now, expiresAt, terms) {
    const left = state.kingdoms[leftId];
    const right = state.kingdoms[rightId];
    if (!left || !right) {
        return;
    }
    const parties = (0, identifiers_1.sortUniqueIds)([leftId, rightId]);
    const treatyId = (0, identifiers_1.buildTreatyId)(type, parties, now);
    const treaty = {
        id: treatyId,
        type,
        parties,
        signedAt: now,
        expiresAt,
        terms
    };
    addTreaty(left, treaty);
    addTreaty(right, treaty);
}
function softenRelationForPeace(relation) {
    relation.grievance = roundTo(clamp(relation.grievance - 0.12, 0, 1));
    relation.score.rivalry = roundTo(clamp(relation.score.rivalry - 0.08, 0, 1));
    relation.score.borderTension = roundTo(clamp(relation.score.borderTension - 0.05, 0, 1));
    relation.score.trust = roundTo(clamp(relation.score.trust + 0.04, 0, 1));
}
class LocalDiplomacyResolver {
    resolveTick(state, now) {
        const player = Object.keys(state.kingdoms)
            .sort()
            .map((kingdomId) => state.kingdoms[kingdomId])
            .find((kingdom) => kingdom.isPlayer);
        const totalRegions = Math.max(1, Object.keys(state.world.regions).length);
        const territoryCounts = buildTerritoryCounts(state);
        const playerTerritoryShare = player ? getOwnedRegionCount(state, player.id) / totalRegions : 0;
        const dominantEntry = Array.from(territoryCounts.entries()).sort((left, right) => {
            if (right[1] !== left[1]) {
                return right[1] - left[1];
            }
            return left[0].localeCompare(right[0]);
        })[0];
        const dominantKingdomId = dominantEntry?.[0] ?? null;
        const dominantShare = dominantEntry ? dominantEntry[1] / totalRegions : 0;
        for (const kingdomId of Object.keys(state.kingdoms).sort()) {
            const kingdom = state.kingdoms[kingdomId];
            kingdom.diplomacy.treaties = kingdom.diplomacy.treaties.filter((treaty) => treaty.expiresAt === null || treaty.expiresAt > now);
            for (const relationId of Object.keys(kingdom.diplomacy.relations).sort()) {
                const relation = kingdom.diplomacy.relations[relationId];
                relation.actionCooldowns = relation.actionCooldowns ?? {};
                const hostilityBias = relation.status === enums_1.DiplomaticRelation.Hostile ? 0.012 : 0;
                const alliedBias = relation.status === enums_1.DiplomaticRelation.Allied ? 0.009 : 0;
                const personality = kingdom.npc?.personality ?? {
                    ambition: 0.5,
                    caution: 0.5,
                    greed: 0.5,
                    zeal: 0.5,
                    honor: 0.5,
                    betrayalTendency: 0.2
                };
                const seedStr = `${kingdom.id}->${relationId}`;
                let charCodeSum = 0;
                for (let i = 0; i < seedStr.length; i++) {
                    charCodeSum += seedStr.charCodeAt(i);
                }
                const trustWave = Math.sin((state.meta.tick + charCodeSum) * 0.15) * 0.003;
                const rivalryWave = Math.cos((state.meta.tick + charCodeSum) * 0.12) * 0.003;
                const trustAdjustment = (personality.honor * 0.003) - (personality.betrayalTendency * 0.002) + trustWave;
                const rivalryAdjustment = (personality.ambition * 0.003) - (personality.honor * 0.002) + rivalryWave;
                relation.score.trust = roundTo(clamp(relation.score.trust + alliedBias - hostilityBias - relation.grievance * 0.008 + 0.002 + trustAdjustment, 0, 1));
                relation.score.rivalry = roundTo(clamp(relation.score.rivalry + relation.score.borderTension * 0.004 + hostilityBias * 0.7 - alliedBias * 0.5 + rivalryAdjustment, 0, 1));
                relation.score.fear = roundTo(clamp(relation.score.fear + relation.score.rivalry * 0.003 - relation.score.trust * 0.002, 0, 1));
                relation.score.tradeValue = roundTo(clamp(relation.score.tradeValue + relation.score.trust * 0.003 - relation.score.rivalry * 0.003, 0, 1));
                if (relation.status === enums_1.DiplomaticRelation.Hostile) {
                    relation.grievance = roundTo(clamp(relation.grievance + 0.004, 0, 1));
                }
                else {
                    relation.grievance = roundTo(clamp(relation.grievance - 0.003, 0, 1));
                }
                if (relation.grievance > 0.72 || (relation.score.rivalry > 0.64 && relation.score.trust < 0.28)) {
                    relation.status = enums_1.DiplomaticRelation.Hostile;
                }
                else if (relation.score.trust > 0.78 && relation.score.rivalry < 0.28) {
                    relation.status = enums_1.DiplomaticRelation.Allied;
                }
                else if (relation.score.trust > 0.62 && relation.score.rivalry < 0.45) {
                    relation.status = enums_1.DiplomaticRelation.Friendly;
                }
                else if (relation.status !== enums_1.DiplomaticRelation.Truce) {
                    relation.status = enums_1.DiplomaticRelation.Neutral;
                }
                // MECÂNICA DE CISMA: Ódio diplomático entre a fé-mãe e a heresia.
                const otherKingdom = state.kingdoms[relationId];
                if (otherKingdom) {
                    const kingdomFaithDef = state.world.religions[kingdom.religion.stateFaith];
                    const otherFaithDef = state.world.religions[otherKingdom.religion.stateFaith];
                    if (kingdomFaithDef && otherFaithDef) {
                        const isSchism = kingdomFaithDef.parentReligionId === otherFaithDef.id || otherFaithDef.parentReligionId === kingdomFaithDef.id;
                        if (isSchism) {
                            relation.score.trust = roundTo(clamp(relation.score.trust - 0.025, 0, 1)); // Ódio corrói a confiança
                            relation.score.rivalry = roundTo(clamp(relation.score.rivalry + 0.015, 0, 1)); // Aumenta a rivalidade
                            relation.grievance = roundTo(clamp(relation.grievance + 0.01, 0, 1)); // Gera agravo contínuo
                        }
                    }
                }
            }
            if (dominantKingdomId && dominantKingdomId !== kingdom.id) {
                const ownShare = (territoryCounts.get(kingdom.id) ?? 0) / totalRegions;
                const dominantPressure = clamp((dominantShare - ownShare) * 1.45, 0, 1);
                const relationToDominant = kingdom.diplomacy.relations[dominantKingdomId];
                if (relationToDominant && dominantPressure > 0.08) {
                    relationToDominant.score.rivalry = roundTo(clamp(relationToDominant.score.rivalry + 0.004 + dominantPressure * 0.012, 0, 1));
                    relationToDominant.score.fear = roundTo(clamp(relationToDominant.score.fear + 0.005 + dominantPressure * 0.014, 0, 1));
                    relationToDominant.score.trust = roundTo(clamp(relationToDominant.score.trust - 0.003 - dominantPressure * 0.01, 0, 1));
                }
                if (!kingdom.isPlayer && dominantPressure > 0.16) {
                    for (const relationId of Object.keys(kingdom.diplomacy.relations).sort()) {
                        if (relationId === dominantKingdomId || relationId === kingdom.id) {
                            continue;
                        }
                        const allyShare = (territoryCounts.get(relationId) ?? 0) / totalRegions;
                        if (dominantShare - allyShare <= 0.08) {
                            continue;
                        }
                        const relation = kingdom.diplomacy.relations[relationId];
                        relation.score.trust = roundTo(clamp(relation.score.trust + 0.004, 0, 1));
                        relation.score.rivalry = roundTo(clamp(relation.score.rivalry - 0.003, 0, 1));
                    }
                }
            }
            // APLICAÇÃO DE BENEFÍCIOS ECONÔMICOS DOS ACORDOS COMERCIAIS
            for (const treaty of kingdom.diplomacy.treaties) {
                if (treaty.type === enums_1.TreatyType.TradeAgreement && (treaty.expiresAt === null || treaty.expiresAt > now)) {
                    // Para cada acordo comercial ativo, aplica bônus econômico
                    const tradeBonus = treaty.terms.tradeBonus || 0.05;
                    // Bônus de crescimento populacional e econômico
                    kingdom.population.growthRatePerTick = roundTo(clamp(kingdom.population.growthRatePerTick + tradeBonus * 0.00005, 0.00001, 0.001), 6);
                    // Redução de corrupção devido ao comércio
                    kingdom.economy.corruption = roundTo(clamp(kingdom.economy.corruption - tradeBonus * 0.02, 0, 1));
                    // Aumento do bem-estar populacional devido ao comércio
                    kingdom.population.unrest = roundTo(clamp(kingdom.population.unrest - tradeBonus * 0.05, 0, 1));
                }
            }
            // SISTEMA DE PACTOS DEFENSIVOS: Verifica se aliados estão sendo atacados
            for (const treaty of kingdom.diplomacy.treaties) {
                if (treaty.type === enums_1.TreatyType.DefensivePact && (treaty.expiresAt === null || treaty.expiresAt > now)) {
                    // Para cada pacto defensivo ativo, verifica se o aliado está em guerra
                    const allyId = treaty.parties.find(p => p !== kingdom.id);
                    if (allyId) {
                        const ally = state.kingdoms[allyId];
                        if (ally) {
                            // Verifica se o aliado está sendo atacado
                            const allyWars = Object.values(state.wars).filter(war => war.defenders.includes(allyId) &&
                                !war.defenders.includes(kingdom.id) && // Não estamos já defendendo
                                war.attackers.some(attacker => !war.defenders.includes(attacker)) // Guerra ativa
                            );
                            if (allyWars.length > 0 && !kingdom.isPlayer) {
                                // Aliado está sendo atacado - devemos declarar guerra em defesa
                                const warToJoin = allyWars[0]; // Junta-se à primeira guerra ativa
                                // Verifica se já não estamos em guerra com os atacantes
                                const alreadyAtWar = warToJoin.attackers.some(attacker => Object.values(state.wars).some(w => (w.attackers.includes(kingdom.id) && w.defenders.includes(attacker)) ||
                                    (w.defenders.includes(kingdom.id) && w.attackers.includes(attacker))));
                                if (!alreadyAtWar && kingdom.diplomacy.warExhaustion < 0.8) {
                                    // Declara guerra em defesa do aliado
                                    const newWarId = `war_${kingdom.id}_${warToJoin.attackers[0]}_${now}`;
                                    state.wars[newWarId] = {
                                        id: newWarId,
                                        attackers: [kingdom.id],
                                        defenders: warToJoin.attackers,
                                        startedAt: now,
                                        warScore: 0,
                                        fronts: [],
                                        casualties: {}
                                    };
                                    // Atualiza exaustão de guerra
                                    kingdom.diplomacy.warExhaustion = roundTo(clamp(kingdom.diplomacy.warExhaustion + 0.15, 0, 1));
                                    // Honra o pacto defensivo - aumenta confiança com o aliado
                                    const allyRelation = ensureRelation(kingdom, allyId);
                                    allyRelation.score.trust = roundTo(clamp(allyRelation.score.trust + 0.1, 0, 1));
                                    allyRelation.grievance = roundTo(clamp(allyRelation.grievance - 0.05, 0, 1));
                                }
                            }
                        }
                    }
                }
            }
            if (!kingdom.isPlayer) {
                const threatTargetId = dominantKingdomId ?? player?.id;
                const relationToThreat = threatTargetId ? kingdom.diplomacy.relations[threatTargetId] : undefined;
                const rivalry = relationToThreat?.score.rivalry ?? 0.3;
                const trust = relationToThreat?.score.trust ?? 0.4;
                const pressure = threatTargetId === player?.id ? playerTerritoryShare : dominantShare;
                kingdom.diplomacy.coalitionThreat = roundTo(clamp(pressure * 0.7 + rivalry * 0.22 + (1 - trust) * 0.16 + kingdom.diplomacy.warExhaustion * 0.12, 0, 1));
            }
        }
        return state;
    }
    applyDecision(state, decision) {
        const actor = state.kingdoms[decision.actorKingdomId];
        const targetId = decision.targetKingdomId;
        if (!actor || !targetId) {
            return state;
        }
        const target = state.kingdoms[targetId];
        if (!target) {
            return state;
        }
        const now = state.meta.lastUpdatedAt;
        const actorRelation = ensureRelation(actor, target.id);
        const targetRelation = ensureRelation(target, actor.id);
        switch (decision.actionType) {
            case "oferta_alianca": {
                actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.08, 0, 1));
                targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.06, 0, 1));
                actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.04, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.05, 0, 1));
                if (actorRelation.score.trust > 0.6 && targetRelation.score.trust > 0.55) {
                    registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.Alliance, now, now + DEFAULT_TREATY_DURATION_MS * 2, {
                        militarySupport: true
                    });
                    setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Allied);
                }
                else {
                    setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Friendly);
                }
                break;
            }
            case "pressao_fronteirica": {
                actorRelation.score.rivalry = roundTo(clamp(actorRelation.score.rivalry + 0.05, 0, 1));
                actorRelation.score.borderTension = roundTo(clamp(actorRelation.score.borderTension + 0.07, 0, 1));
                targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear + 0.08, 0, 1));
                targetRelation.score.rivalry = roundTo(clamp(targetRelation.score.rivalry + 0.06, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.08, 0, 1));
                if (targetRelation.grievance > 0.52) {
                    setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Hostile);
                }
                break;
            }
            case "embargo_comercial": {
                actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue - 0.12, 0, 1));
                targetRelation.score.tradeValue = roundTo(clamp(targetRelation.score.tradeValue - 0.2, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.1, 0, 1));
                registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.Embargo, now, now + DEFAULT_TREATY_DURATION_MS, {
                    blockedRoutes: true
                });
                break;
            }
            case "pacto_nao_agressao": {
                actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.06, 0, 1));
                targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.06, 0, 1));
                actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.04, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.04, 0, 1));
                registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.NonAggression, now, now + DEFAULT_TREATY_DURATION_MS * 2, {
                    noBorderWar: true
                });
                setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Friendly);
                break;
            }
            case "exigir_tributo": {
                actorRelation.score.fear = roundTo(clamp(actorRelation.score.fear + 0.09, 0, 1));
                targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear + 0.12, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.08, 0, 1));
                actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue + 0.04, 0, 1));
                registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.Tribute, now, now + DEFAULT_TREATY_DURATION_MS, {
                    tributeRate: 0.1
                });
                break;
            }
            case "exigir_vassalagem": {
                actorRelation.score.fear = roundTo(clamp(actorRelation.score.fear + 0.15, 0, 1));
                targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear + 0.2, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.15, 0, 1));
                registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.Vassalage, now, null, {
                    overlordId: actor.id,
                    vassalId: target.id,
                    tributeRate: 0.15
                });
                ensureRelation(actor, target.id).status = enums_1.DiplomaticRelation.Vassal;
                ensureRelation(target, actor.id).status = enums_1.DiplomaticRelation.Overlord;
                break;
            }
            case "proposta_paz": {
                softenRelationForPeace(actorRelation);
                softenRelationForPeace(targetRelation);
                registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.Peace, now, now + DEFAULT_TREATY_DURATION_MS, {
                    borderFreeze: true
                });
                setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Truce);
                break;
            }
            case "declarar_guerra": {
                actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust - 0.15, 0, 1));
                targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust - 0.2, 0, 1));
                actorRelation.grievance = roundTo(clamp(actorRelation.grievance + 0.12, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance + 0.18, 0, 1));
                setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Hostile);
                break;
            }
            case "acordo_comercial": {
                // Acordos comerciais melhoram o valor comercial e a confiança
                actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue + 0.15, 0, 1));
                targetRelation.score.tradeValue = roundTo(clamp(targetRelation.score.tradeValue + 0.15, 0, 1));
                actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.08, 0, 1));
                targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.08, 0, 1));
                actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.03, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.03, 0, 1));
                // Define termos do acordo comercial baseado na diferença econômica
                const actorEconomy = actor.population.growthRatePerTick;
                const targetEconomy = target.population.growthRatePerTick;
                const tradeTerms = {
                    tariffRate: 0.05, // 5% de tarifa reduzida
                    tradeBonus: Math.abs(actorEconomy - targetEconomy) * 0.1, // Bônus baseado na diferença econômica
                    duration: DEFAULT_TREATY_DURATION_MS * 3 // 3x mais longo que tratados normais
                };
                registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.TradeAgreement, now, now + tradeTerms.duration, tradeTerms);
                setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Friendly);
                break;
            }
            case "pacto_defensivo": {
                // Pactos defensivos criam alianças mais profundas com obrigação de defesa mútua
                actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.12, 0, 1));
                targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.12, 0, 1));
                actorRelation.score.fear = roundTo(clamp(actorRelation.score.fear - 0.05, 0, 1));
                targetRelation.score.fear = roundTo(clamp(targetRelation.score.fear - 0.05, 0, 1));
                actorRelation.grievance = roundTo(clamp(actorRelation.grievance - 0.06, 0, 1));
                targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.06, 0, 1));
                registerPairTreaty(state, actor.id, target.id, enums_1.TreatyType.DefensivePact, now, now + DEFAULT_TREATY_DURATION_MS * 4, {
                    mutualDefense: true,
                    allianceStrength: 0.8
                });
                setPairStatus(state, actor.id, target.id, enums_1.DiplomaticRelation.Allied);
                break;
            }
            case "financiar_guerra": {
                // Financiamento de guerra: fornece recursos financeiros ao aliado em guerra
                const fundingAmount = Math.min(actor.economy.stock[enums_1.ResourceType.Gold] * 0.1, 200); // 10% do tesouro ou 200 max
                if (fundingAmount > 10) { // Só financia se tiver recursos significativos
                    // Transfere ouro
                    actor.economy.stock[enums_1.ResourceType.Gold] = Math.max(0, actor.economy.stock[enums_1.ResourceType.Gold] - fundingAmount);
                    target.economy.stock[enums_1.ResourceType.Gold] += fundingAmount;
                    // Melhora relações
                    actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.06, 0, 1));
                    targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.08, 0, 1));
                    targetRelation.grievance = roundTo(clamp(targetRelation.grievance - 0.04, 0, 1));
                    // Cria um "tratado" temporário de financiamento (não aparece como tratado formal)
                    // Mas registra como apoio financeiro
                    actorRelation.score.tradeValue = roundTo(clamp(actorRelation.score.tradeValue + 0.05, 0, 1));
                    // O alvo ganha bônus temporário de moral/produção devido ao financiamento
                    for (const army of target.military.armies) {
                        army.morale = roundTo(clamp(army.morale + 0.1, 0, 1));
                    }
                }
                break;
            }
            default: {
                if (hasActiveTreaty(state, actor.id, target.id, enums_1.TreatyType.NonAggression, now)) {
                    actorRelation.score.trust = roundTo(clamp(actorRelation.score.trust + 0.01, 0, 1));
                    targetRelation.score.trust = roundTo(clamp(targetRelation.score.trust + 0.01, 0, 1));
                }
            }
        }
        return state;
    }
}
exports.LocalDiplomacyResolver = LocalDiplomacyResolver;

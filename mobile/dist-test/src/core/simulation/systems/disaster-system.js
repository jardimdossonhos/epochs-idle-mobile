"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDisasterSystem = createDisasterSystem;
const utils_1 = require("./utils");
const enums_1 = require("../../models/enums");
function createDisasterSystem() {
    return {
        id: "disaster",
        run(context) {
            const state = context.nextState;
            let eventSeq = 0;
            const disastersEnabled = state.meta.disastersEnabled ?? true; // Default to ON for old saves
            // Roda o sorteio de eventos dinâmicos apenas a cada 10 ciclos (para poupar processamento) e se estiver habilitado
            if (disastersEnabled && state.meta.tick > 0 && state.meta.tick % 10 === 0) {
                const allKingdomIds = Object.keys(state.kingdoms);
                for (const kingdomId of allKingdomIds) {
                    const kingdom = state.kingdoms[kingdomId];
                    // DESASTRES NATURAIS (~2% de chance)
                    if (Math.random() < 0.02) {
                        const disasterType = Math.random();
                        if (disasterType < 0.3) {
                            // PRAGA - Mata população
                            const populationLoss = Math.floor(kingdom.population.total * 0.1) + 1; // 10% da população
                            kingdom.population.total = Math.max(1, kingdom.population.total - populationLoss);
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_plague",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "disaster.plague",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "population_loss", amount: populationLoss },
                                occurredAt: context.now,
                                title: "Praga Mortal",
                                details: `Uma praga devastadora atingiu ${kingdom.name}, dizimando ${populationLoss} súditos. A população restante está em pânico.`,
                                severity: "critical"
                            });
                        }
                        else if (disasterType < 0.6) {
                            // SECA - Reduz comida
                            const foodLoss = Math.floor(kingdom.economy.stock[enums_1.ResourceType.Food] * 0.4);
                            kingdom.economy.stock[enums_1.ResourceType.Food] = Math.max(0, kingdom.economy.stock[enums_1.ResourceType.Food] - foodLoss);
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_drought",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "disaster.drought",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "food_loss", amount: foodLoss },
                                occurredAt: context.now,
                                title: "Seca Devastadora",
                                details: `Uma seca prolongada arruinou as colheitas em ${kingdom.name}, reduzindo as reservas de comida em ${foodLoss} unidades.`,
                                severity: "high"
                            });
                        }
                        else {
                            // INUNDAÇÃO - Danifica infraestrutura
                            const infrastructureDamage = Math.floor(Math.random() * 20) + 10; // 10-30 de dano
                            kingdom.administration.adminCapacity = Math.max(10, kingdom.administration.adminCapacity - infrastructureDamage);
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_flood",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "disaster.flood",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "infrastructure_damage", amount: infrastructureDamage },
                                occurredAt: context.now,
                                title: "Inundação Catastrófica",
                                details: `Inundações devastadoras em ${kingdom.name} danificaram a infraestrutura administrativa, reduzindo a capacidade em ${infrastructureDamage} pontos.`,
                                severity: "high"
                            });
                        }
                    }
                    // EVENTOS POSITIVOS (~1.5% de chance)
                    if (Math.random() < 0.015) {
                        const positiveEventType = Math.random();
                        if (positiveEventType < 0.4) {
                            // BOA COLHEITA - Aumenta comida
                            const foodBonus = Math.floor(kingdom.economy.stock[enums_1.ResourceType.Food] * 0.3) + 50;
                            kingdom.economy.stock[enums_1.ResourceType.Food] += foodBonus;
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_bountiful_harvest",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "event.bountiful_harvest",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "food_gain", amount: foodBonus },
                                occurredAt: context.now,
                                title: "Colheita Abundante",
                                details: `As colheitas em ${kingdom.name} foram excepcionalmente produtivas, adicionando ${foodBonus} unidades de comida às reservas.`,
                                severity: "info"
                            });
                        }
                        else if (positiveEventType < 0.7) {
                            // DESCOBERTA TECNOLÓGICA - Acelera pesquisa
                            const researchBonus = Math.floor(Math.random() * 200) + 100;
                            kingdom.technology.accumulatedResearch += researchBonus;
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_technological_breakthrough",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "event.technological_breakthrough",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "research_gain", amount: researchBonus },
                                occurredAt: context.now,
                                title: "Descoberta Científica",
                                details: `Um avanço científico em ${kingdom.name} acelerou a pesquisa em ${researchBonus} pontos. Os estudiosos estão entusiasmados!`,
                                severity: "info"
                            });
                        }
                        else {
                            // MIGRAÇÃO POPULACIONAL - Aumenta população
                            const populationGain = Math.floor(Math.random() * 30) + 10;
                            kingdom.population.total += populationGain;
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_population_migration",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "event.population_migration",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "population_gain", amount: populationGain },
                                occurredAt: context.now,
                                title: "Migração Populacional",
                                details: `${populationGain} novos súditos migraram para ${kingdom.name}, atraídos pela prosperidade e estabilidade do reino.`,
                                severity: "info"
                            });
                        }
                    }
                    // EVENTOS SOCIAIS (~1% de chance, baseado em condições do reino)
                    const socialEventChance = kingdom.population.unrest > 0.6 ? 0.03 : 0.01; // Chance maior se houver agitação
                    if (Math.random() < socialEventChance) {
                        if (kingdom.population.unrest > 0.6) {
                            // REVOLTA - Aumenta instabilidade
                            const stabilityLoss = Math.floor(Math.random() * 15) + 5;
                            kingdom.stability = Math.max(0, kingdom.stability - stabilityLoss);
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_revolt",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "event.revolt",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "stability_loss", amount: stabilityLoss },
                                occurredAt: context.now,
                                title: "Revolta Popular",
                                details: `Uma revolta eclodiu em ${kingdom.name}, reduzindo a estabilidade em ${stabilityLoss} pontos. O povo exige mudanças!`,
                                severity: "critical"
                            });
                        }
                        else {
                            // FESTIVAL CULTURAL - Melhora felicidade
                            const happinessGain = Math.floor(Math.random() * 0.15 * 100) / 100; // 0.05-0.15
                            kingdom.population.unrest = (0, utils_1.roundTo)((0, utils_1.clamp)(kingdom.population.unrest - happinessGain, 0, 1));
                            context.events.push({
                                id: (0, utils_1.createEventId)({
                                    prefix: "evt_cultural_festival",
                                    tick: state.meta.tick,
                                    systemId: "disaster",
                                    actorId: kingdom.id,
                                    sequence: eventSeq++
                                }),
                                type: "event.cultural_festival",
                                actorKingdomId: kingdom.id,
                                payload: { impact: "happiness_gain", amount: happinessGain },
                                occurredAt: context.now,
                                title: "Festival Cultural",
                                details: `Um festival cultural em ${kingdom.name} elevou o moral da população, aumentando a felicidade em ${(happinessGain * 100).toFixed(1)}%.`,
                                severity: "info"
                            });
                        }
                    }
                }
            }
        }
    };
}

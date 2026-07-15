"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSession = void 0;
const build_save_summary_1 = require("./save/build-save-summary");
const diagnostics_1 = require("./diagnostics");
const technology_tree_1 = require("../core/data/technology-tree");
const economy_1 = require("../core/models/economy");
const enums_1 = require("../core/models/enums");
const identifiers_1 = require("../core/models/identifiers");
const state_fingerprint_1 = require("../core/utils/state-fingerprint");
const stable_hash_1 = require("../core/utils/stable-hash");
const clone_game_state_1 = require("../core/utils/clone-game-state");
const tick_pipeline_1 = require("../core/simulation/tick-pipeline");
const council_system_1 = require("../core/simulation/systems/council-system");
const save_slots_1 = require("../infrastructure/persistence/save-slots");
const gemini_service_1 = require("./ai/gemini-service");
// Cache de Indexação Global: Transforma buscas O(N) em O(1)
const REGION_INDEX_MAP = new Map();
class GameSession {
    deps;
    pipeline;
    listeners = new Set();
    currentState = null;
    accumulatedMs = 0;
    ticksSinceAutosave = 0;
    ticksSinceSnapshot = 0;
    ioQueue = Promise.resolve();
    sessionLogSeq = 0;
    commandSequence = 0;
    commandHeadHash = "genesis";
    tickSamples = [];
    isWorkerReady = false; // Bloqueio de segurança (Handshake)
    pendingManualSaveResolver = null;
    pendingAutosave = false;
    runtimeMetrics = {
        tickMsLast: 0,
        tickMsAverage: 0,
        offlineCatchUpMs: 0,
        offlineTicks: 0
    };
    devModeActive = false;
    fogOfWarDisabled = false;
    constructor(deps) {
        this.deps = deps;
        if (REGION_INDEX_MAP.size === 0) {
            const regionIds = Object.keys(this.deps.staticWorldData.definitions).sort();
            for (let i = 0; i < regionIds.length; i++) {
                REGION_INDEX_MAP.set(regionIds[i], i);
            }
        }
        this.pipeline = new tick_pipeline_1.TickPipeline(deps.systems, deps.staticWorldData);
    }
    async resumeFromBackground() {
        if (!this.currentState)
            return;
        // Calcula o progresso offline simulando ticks acumulados (Limitado a no max 1 semana para evitar Spiral of Death)
        const now = Date.now();
        const offlineMs = now - this.currentState.meta.lastUpdatedAt;
        // Só processar offline se ficou mais de 30 segundos fora
        if (offlineMs > 30 * 1000) {
            const maxOfflineMs = 7 * 24 * 60 * 60 * 1000;
            const effectiveOfflineMs = Math.min(offlineMs, maxOfflineMs);
            const tickDurationMs = Math.max(1, this.currentState.meta.tickDurationMs);
            const offlineTicks = Math.floor(effectiveOfflineMs / tickDurationMs);
            this.runtimeMetrics.offlineCatchUpMs = effectiveOfflineMs;
            this.runtimeMetrics.offlineTicks = offlineTicks;
            if (offlineTicks > 0) {
                const progressResult = await this.runOfflineProgression(this.currentState, now);
                this.currentState = progressResult.state;
                this.currentState.meta.lastUpdatedAt = now;
                this.emitState();
            }
            // Reseta a acumulação de ms para evitar o aviso de divida de CPU
            this.accumulatedMs = 0;
        }
    }
    migrateLegacyState(state) {
        if (state.meta.disastersEnabled === undefined) {
            state.meta.disastersEnabled = true;
        }
        if (state.meta.immortalityEnabled === undefined) {
            state.meta.immortalityEnabled = false;
        }
        if (!state.world.religions) {
            state.world.religions = {};
            const now = this.deps.clock.now();
            for (const [id, def] of Object.entries(this.deps.staticWorldData.religions)) {
                state.world.religions[id] = {
                    id,
                    name: def.name,
                    deityName: def.deityName,
                    deityDescription: def.deityDescription,
                    color: def.color,
                    tenets: [...def.tenets],
                    holyCityRegionId: null,
                    headOfFaithKingdomId: null,
                    founderId: null,
                    foundedAt: now,
                    parentReligionId: null
                };
            }
        }
    }
    async bootstrap(initialState) {
        await this.bootstrapCommandHead();
        this.isWorkerReady = false; // Trava a engine principal até confirmação do Worker
        const persisted = await this.deps.gameStateRepository.loadCurrent();
        const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());
        const baseState = recovered ?? initialState;
        this.migrateLegacyState(baseState);
        const now = this.deps.clock.now();
        // Respiro arquitetural: Evita que a Thread principal tranque o navegador ("Page Unresponsive")
        await new Promise(resolve => setTimeout(resolve, 50));
        const offlineResult = await this.runOfflineProgression(baseState, now);
        this.currentState = offlineResult.state;
        this.currentState.meta.lastClosedAt = null;
        this.currentState.meta.lastUpdatedAt = now;
        this.runtimeMetrics.offlineCatchUpMs = this.round(offlineResult.elapsedMs, 3);
        this.runtimeMetrics.offlineTicks = offlineResult.ticks;
        // Segurança: Retorna a velocidade para 0.5x ao carregar para evitar sobressaltos
        this.currentState.meta.speedMultiplier = 0.5;
        // Segurança 2: Inicia o jogo estritamente pausado para dar tempo ao jogador e à CPU respirarem
        this.currentState.meta.paused = true;
        // Padrão de Novo Jogo (Ciclo 0): Ativa a automação de expansão para o jogador
        if (this.currentState.meta.tick === 0) {
            const player = this.getPlayerKingdom(this.currentState);
            if (player && player.administration) {
                player.administration.automation.expansion = enums_1.AutomationLevel.Assisted;
            }
        }
        if (offlineResult.ticks > 0) {
            this.currentState.events = [
                this.createSessionLog("Progresso offline aplicado", `Foram simulados ${offlineResult.ticks} ticks durante sua ausência.`, "info", now),
                ...this.currentState.events
            ].slice(0, 180);
            this.recordSystemCommand("offline.progression", {
                ticksApplied: offlineResult.ticks,
                from: baseState.meta.lastClosedAt ?? baseState.meta.lastUpdatedAt,
                to: now
            });
        }
        // Notifica o sistema que um estado de jogo está pronto (seja novo ou recuperado)
        this.deps.eventBus.publish({ type: "game.loaded", payload: this.currentState });
        await this.deps.gameStateRepository.saveCurrent(this.currentState);
        if (this.deps.snapshotRepository) {
            const latestSnapshot = await this.deps.snapshotRepository.latest();
            if (!latestSnapshot) {
                await this.deps.snapshotRepository.save(this.buildStateSnapshot("bootstrap", now));
            }
        }
        this.emitState(true);
        if (this.deps.clock && typeof this.deps.clock.start === "function") {
            this.start();
        }
        return this.currentState;
    }
    markWorkerReady() {
        this.isWorkerReady = true;
        console.log("[GameSession] Handshake confirmado. Simulação liberada.");
    }
    start() {
        this.deps.clock.start((deltaMs, now) => {
            this.onClockTick(deltaMs, now);
        });
    }
    advanceTimeForTesting(deltaMs, now = this.deps.clock.now()) {
        this.processClockTick(deltaMs, now, true, 1, false);
    }
    stop(sync = false) {
        this.deps.clock.stop();
        if (!this.currentState) {
            return;
        }
        const now = this.deps.clock.now();
        this.currentState.meta.lastClosedAt = now;
        this.recordSystemCommand("session.stop", { reason: "manual_stop" }, now);
        // Converte os Float64Arrays para Arrays normais antes de serializar
        // Isso previne o bug onde o F5 corrompe os recursos gerando um objeto vazio {}
        const safeState = structuredClone(this.currentState);
        if (safeState.ecs) {
            // Bypass no structuredClone: extraímos os arrays nativos da fonte viva imune à corrupção de Proxy
            safeState.ecs = {
                gold: Array.from(this.currentState.ecs?.gold || []),
                food: Array.from(this.currentState.ecs?.food || []),
                wood: Array.from(this.currentState.ecs?.wood || []),
                iron: Array.from(this.currentState.ecs?.iron || []),
                faith: Array.from(this.currentState.ecs?.faith || []),
                legitimacy: Array.from(this.currentState.ecs?.legitimacy || []),
                populationTotal: Array.from(this.currentState.ecs?.populationTotal || []),
                populationGrowthRate: Array.from(this.currentState.ecs?.populationGrowthRate || []),
                manpower: Array.from(this.currentState.ecs?.manpower || []),
            };
        }
        if (sync) {
            this.deps.gameStateRepository.saveCurrentSync(safeState);
        }
        else {
            this.enqueueIo(async () => {
                await this.deps.gameStateRepository.saveCurrent(safeState);
            });
        }
    }
    subscribe(listener) {
        this.listeners.add(listener);
        if (this.currentState) {
            listener(this.currentState);
        }
        return () => {
            this.listeners.delete(listener);
        };
    }
    setPaused(paused) {
        const state = this.requireState();
        state.meta.paused = paused;
        this.recordPlayerCommand("session.pause", { paused });
        this.persistCurrent();
        this.emitState(true);
    }
    setDisastersEnabled(enabled) {
        const state = this.requireState();
        state.meta.disastersEnabled = enabled;
        this.recordPlayerCommand("session.disasters", { enabled });
        this.persistCurrent();
        this.emitState();
    }
    setOfflineProgression(enabled) {
        const state = this.requireState();
        state.meta.offlineProgression = enabled;
        this.recordPlayerCommand("session.offline_progression", { enabled });
        this.persistCurrent();
        this.emitState();
    }
    setImmortalityEnabled(enabled) {
        const state = this.requireState();
        state.meta.immortalityEnabled = enabled;
        this.recordPlayerCommand("session.immortality", { enabled });
        this.persistCurrent();
        this.emitState();
    }
    togglePause() {
        const state = this.requireState();
        this.setPaused(!state.meta.paused);
    }
    setSpeed(multiplier) {
        const state = this.requireState();
        state.meta.speedMultiplier = Math.max(0.5, Math.min(100, multiplier));
        if (state.meta.speedMultiplier >= 100) {
            state.meta.tickDurationMs = 1000;
        }
        else {
            state.meta.tickDurationMs = 3000;
        }
        this.recordPlayerCommand("session.speed", { speedMultiplier: state.meta.speedMultiplier, tickDurationMs: state.meta.tickDurationMs });
        this.persistCurrent();
        this.emitState(true);
    }
    setExpansionAutomation(level) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.administration.automation.expansion = level;
        this.appendActionLog("Automação de expansão atualizada", `Nível definido para ${level}.`, "info");
        this.recordPlayerCommand("expansion.automation", { level });
        this.persistCurrent();
        this.emitState();
    }
    setConstructionAutomation(level) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.administration.automation.construction = level;
        this.appendActionLog("Automação de construções atualizada", `Nível definido para ${level}.`, "info");
        this.recordPlayerCommand("construction.automation", { level });
        this.persistCurrent();
        this.emitState();
    }
    setEconomyAutomation(level) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.administration.automation.economy = level;
        player.administration.automation.construction = level;
        this.appendActionLog("Automação de economia e construções atualizada", `Nível definido para ${level}.`, "info");
        this.recordPlayerCommand("economy.automation", { level });
        this.persistCurrent();
        this.emitState();
    }
    setDefenseAutomation(level) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.administration.automation.defense = level;
        player.administration.automation.expansion = level;
        this.appendActionLog("Automação de defesa e expansão atualizada", `Nível definido para ${level}.`, "info");
        this.recordPlayerCommand("defense.automation", { level });
        this.persistCurrent();
        this.emitState();
    }
    toggleGlobalAutomation(active) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const auto = player.administration.automation;
        auto.globalToggleActive = active;
        if (active) {
            auto.previousState = {
                economy: auto.economy,
                construction: auto.construction || enums_1.AutomationLevel.Manual,
                defense: auto.defense,
                diplomacyReactive: auto.diplomacyReactive,
                expansion: auto.expansion,
                technology: auto.technology
            };
            auto.economy = enums_1.AutomationLevel.NearlyAutomatic;
            auto.construction = enums_1.AutomationLevel.NearlyAutomatic;
            auto.defense = enums_1.AutomationLevel.NearlyAutomatic;
            auto.diplomacyReactive = enums_1.AutomationLevel.NearlyAutomatic;
            auto.expansion = enums_1.AutomationLevel.Assisted; // Migração só possui Manual ou Assistida
            auto.technology = enums_1.AutomationLevel.NearlyAutomatic;
        }
        else if (auto.previousState) {
            Object.assign(auto, auto.previousState);
        }
        player.administration.directives = player.administration.directives ?? {};
        player.administration.directives.religious_mission = active;
        this.appendActionLog("Modo Automático Total", active ? "Ativado" : "Desativado", "info");
        this.persistCurrent();
        this.emitState();
    }
    hireMinister(candidateId, targetRole) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const admin = player.administration;
        admin.candidatePool = admin.candidatePool || [];
        admin.council = admin.council || {};
        const candidateIndex = admin.candidatePool.findIndex(c => c.id === candidateId);
        if (candidateIndex === -1) {
            return { ok: false, message: "Candidato não encontrado." };
        }
        const candidate = admin.candidatePool[candidateIndex];
        if (candidate.role === enums_1.MinisterRole.Wildcard) {
            if (!targetRole)
                return { ok: false, message: "Para lendas, selecione o cargo desejado." };
            candidate.role = targetRole; // Transmuta a Lenda para o cargo escolhido
        }
        else {
            targetRole = candidate.role;
        }
        if (admin.council[targetRole]) {
            return { ok: false, message: `Este cargo já está ocupado por outro ministro.` };
        }
        admin.candidatePool.splice(candidateIndex, 1);
        admin.council[targetRole] = candidate;
        this.appendActionLog("Novo Conselheiro", `${candidate.name} foi nomeado para o cargo de ${targetRole}.`, "info");
        this.recordPlayerCommand("council.hire", { candidateId, role: candidate.role });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: "Conselheiro contratado." };
    }
    reassignMinister(currentRole, targetRole) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const admin = player.administration;
        if (!admin.council)
            return { ok: false, message: "Conselho não inicializado." };
        if (currentRole === targetRole)
            return { ok: false, message: "O ministro já está neste cargo." };
        const sourceMinister = admin.council[currentRole];
        if (!sourceMinister)
            return { ok: false, message: "Nenhum ministro no cargo de origem." };
        const targetMinister = admin.council[targetRole]; // Pode ser undefined
        // Executa a troca (Swap)
        admin.council[targetRole] = sourceMinister;
        sourceMinister.role = targetRole;
        if (targetMinister) {
            admin.council[currentRole] = targetMinister;
            targetMinister.role = currentRole;
        }
        else {
            delete admin.council[currentRole];
        }
        this.appendActionLog("Reestruturação da Corte", `${sourceMinister.name} foi remanejado para o cargo de ${targetRole}.`, "info");
        this.recordPlayerCommand("council.reassign", { ministerId: sourceMinister.id, from: currentRole, to: targetRole });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: "Cargo remanejado com sucesso!" };
    }
    fireMinister(role) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const admin = player.administration;
        admin.candidatePool = admin.candidatePool || [];
        admin.council = admin.council || {};
        const minister = admin.council[role];
        if (!minister) {
            return { ok: false, message: "Nenhum ministro neste cargo." };
        }
        delete admin.council[role];
        minister.loyalty = Math.max(0, minister.loyalty - 25);
        admin.candidatePool.push(minister);
        this.appendActionLog("Conselheiro Demitido", `${minister.name} foi removido do cargo de ${role}.`, "warning");
        this.recordPlayerCommand("council.fire", { role });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: "Conselheiro demitido." };
    }
    resolveCouncilAdvice(adviceId, optionId) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const advice = player.administration.activeAdvice.find(a => a.id === adviceId);
        if (!advice || advice.resolved)
            return { ok: false, message: "Aviso inválido ou já resolvido." };
        const option = advice.options?.find(o => o.id === optionId);
        if (!option)
            return { ok: false, message: "Opção inválida." };
        // Aplica Lealdade do Ministro baseado se você concordou ou contrariou ele
        const minister = player.administration.council[advice.role];
        if (minister) {
            minister.loyalty = this.clamp(minister.loyalty + option.loyaltyImpact, 0, 100);
        }
        advice.resolved = true; // Marca a lei como julgada
        advice.isRead = true; // Também remove a marcação de 'NOVO'
        // O Orquestrador executa fisicamente a proposta do Ministro
        switch (option.actionType) {
            case "update_tax":
                this.updateTaxPolicy(option.payload);
                break;
            case "update_budget":
                this.updateBudgetPriority(option.payload);
                break;
            case "set_religious_policy":
                this.setReligiousPolicy(option.payload.policy);
                break;
            case "change_salary":
                if (minister) {
                    minister.salary = Math.max(0, minister.salary + option.payload.amount);
                    this.appendActionLog("Reajuste Salarial", `O salário de ${minister.name} foi alterado para ${minister.salary} Ouro.`, "info");
                }
                break;
            case "build_structure": {
                const targetRegion = option.payload.regionId || player.capitalRegionId;
                const res = this.executeBuildStructure(targetRegion, option.payload.buildingType);
                if (!res.ok) {
                    return { ok: false, message: `O decreto falhou: ${res.message}` };
                }
                break;
            }
            case "declare_war": {
                const res = this.executeDiplomaticAction(option.payload.targetId, "war");
                if (!res.ok) {
                    return { ok: false, message: `Falha ao declarar guerra: ${res.message}` };
                }
                break;
            }
            case "ignore":
                this.appendActionLog("Decisão do Conselho", `O governante rejeitou o conselho de ${minister?.name ?? 'um ministro'}.`, "warning");
                this.persistCurrent();
                this.emitState();
                break;
        }
        return { ok: true, message: `Decisão tomada: ${option.label}` };
    }
    markAdviceRead(adviceId) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const advice = player.administration.activeAdvice.find(a => a.id === adviceId);
        if (!advice)
            return { ok: false, message: "Relatório não encontrado." };
        advice.isRead = true;
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: "Relatório arquivado." };
    }
    interactMinister(role, interaction) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const minister = player.administration.council[role];
        if (!minister)
            return { ok: false, message: "Nenhum ministro neste cargo." };
        if (interaction === "praise") {
            const isGreedy = minister.personality === enums_1.MinisterPersonality.Greedy;
            const isZealous = minister.personality === enums_1.MinisterPersonality.Zealous;
            const boost = isGreedy ? 1 : isZealous ? 8 : 5;
            minister.loyalty = this.clamp(minister.loyalty + boost, 0, 100);
            const response = isGreedy ? "Palavras não enchem cofres, mas ele agradece." : "Ele se sente honrado pelo reconhecimento.";
            this.appendActionLog("Ministro Elogiado", `Você elogiou o trabalho de ${minister.name}. ${response}`, "info");
        }
        else if (interaction === "raise_salary") {
            minister.salary += 5;
            const boost = minister.personality === enums_1.MinisterPersonality.Greedy ? 18 : minister.personality === enums_1.MinisterPersonality.Zealous ? 4 : 10;
            minister.loyalty = this.clamp(minister.loyalty + boost, 0, 100);
            this.appendActionLog("Aumento Salarial", `O salário de ${minister.name} subiu para ${minister.salary} Ouro.`, "info");
        }
        else if (interaction === "cut_salary") {
            if (minister.salary < 5)
                return { ok: false, message: "O salário já está no mínimo." };
            minister.salary -= 5;
            const penalty = minister.personality === enums_1.MinisterPersonality.Greedy ? -30 : minister.personality === enums_1.MinisterPersonality.Zealous ? -8 : -15;
            minister.loyalty = this.clamp(minister.loyalty + penalty, 0, 100);
            this.appendActionLog("Corte Salarial", `O salário de ${minister.name} caiu para ${minister.salary} Ouro. Ele não gostou.`, "warning");
        }
        else if (interaction === "threaten") {
            minister.loyalty = this.clamp(minister.loyalty - 20, 0, 100);
            // O medo faz a corrupção administrativa cair temporariamente!
            player.administration.corruption = this.clamp(player.administration.corruption - 0.05, 0, 1);
            this.appendActionLog("Ministro Ameaçado", `Você ameaçou ${minister.name}. A corrupção caiu pelo medo, mas a lealdade dele despencou.`, "warning");
        }
        else if (interaction === "consult") {
            const advice = (0, council_system_1.generateRoutineAdvice)(minister, state, player.id);
            if (advice) {
                player.administration.activeAdvice.unshift(advice);
                if (player.administration.activeAdvice.length > 15)
                    player.administration.activeAdvice.pop();
            }
            else {
                return { ok: false, message: "Este conselheiro não tem sugestões no momento." };
            }
        }
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: interaction === "consult" ? "Conselho adicionado aos relatórios." : "Ação realizada." };
    }
    setReligiousPolicy(policy) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.religion.policy = policy;
        this.appendActionLog("Diretriz Religiosa", `O império alterou sua postura oficial sobre tolerância e conversão.`, "info");
        this.recordPlayerCommand("religion.policy", { policy: policy });
        this.persistCurrent();
        this.emitState();
    }
    updateTaxPolicy(patch) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const policy = player.economy.taxPolicy;
        if (typeof patch.baseRate === "number") {
            policy.baseRate = this.clamp(patch.baseRate, 0.05, 0.6);
        }
        if (typeof patch.nobleRelief === "number") {
            policy.nobleRelief = this.clamp(patch.nobleRelief, 0, 0.4);
        }
        if (typeof patch.clergyExemption === "number") {
            policy.clergyExemption = this.clamp(patch.clergyExemption, 0, 0.4);
        }
        if (typeof patch.tariffRate === "number") {
            policy.tariffRate = this.clamp(patch.tariffRate, 0, 0.5);
        }
        this.appendActionLog("Política fiscal ajustada", "As diretrizes tributárias foram atualizadas pelo conselho real.", "info");
        this.recordPlayerCommand("government.tax_policy", policy);
        this.persistCurrent();
        this.emitState();
    }
    updateBudgetPriority(patch) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const budget = player.economy.budgetPriority;
        if (typeof patch.economy === "number") {
            budget.economy = Math.max(0, patch.economy);
        }
        if (typeof patch.military === "number") {
            budget.military = Math.max(0, patch.military);
        }
        if (typeof patch.religion === "number") {
            budget.religion = Math.max(0, patch.religion);
        }
        if (typeof patch.administration === "number") {
            budget.administration = Math.max(0, patch.administration);
        }
        if (typeof patch.technology === "number") {
            budget.technology = Math.max(0, patch.technology);
        }
        const total = Math.max(1, budget.economy + budget.military + budget.religion + budget.administration + budget.technology);
        budget.economy = this.round((budget.economy / total) * 100);
        budget.military = this.round((budget.military / total) * 100);
        budget.religion = this.round((budget.religion / total) * 100);
        budget.administration = this.round((budget.administration / total) * 100);
        budget.technology = this.round((budget.technology / total) * 100);
        this.appendActionLog("Orçamento revisado", "As prioridades de investimento do reino foram redistribuídas.", "info");
        this.recordPlayerCommand("government.budget_priority", budget);
        this.persistCurrent();
        this.emitState();
    }
    applyGovernmentPolicy(params) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.economy.taxPolicy = {
            ...player.economy.taxPolicy,
            ...params.taxPolicy
        };
        player.economy.budgetPriority = {
            ...params.budgetPriority
        };
        this.appendActionLog("Políticas governamentais aplicadas", "As políticas fiscais e de orçamento do reino foram atualizadas.", "info");
        this.recordPlayerCommand("government.apply_policy", {
            taxPolicy: player.economy.taxPolicy,
            budgetPriority: player.economy.budgetPriority
        });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: "Políticas aplicadas com sucesso." };
    }
    /**
     * Liga/desliga uma diretriz estratégica no modo idle.
     * As diretrizes ficam armazenadas em administration.directives como Record<string, boolean>.
     */
    updateAutomationDirective(key, enabled) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        if (!player.administration)
            return;
        if (!player.administration.directives) {
            player.administration.directives = {};
        }
        player.administration.directives[key] = enabled;
        this.appendActionLog("Diretriz Estratégica", `Diretriz "${key}" foi ${enabled ? "ativada" : "desativada"} pelo soberano.`, "info");
        this.recordPlayerCommand("government.directive", { key, enabled });
        this.persistCurrent();
        this.emitState();
    }
    setResearchFocus(focus) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.technology.researchFocus = focus;
        const preferred = player.technology.researchGoalId
            ? (0, technology_tree_1.selectResearchNodeTowardsTarget)(player.technology, player.technology.researchGoalId) ??
                (0, technology_tree_1.selectDefaultResearchNode)(player.technology, focus)
            : (0, technology_tree_1.selectDefaultResearchNode)(player.technology, focus);
        player.technology.activeResearchId = preferred?.id ?? null;
        this.appendActionLog("Foco de pesquisa alterado", `A coroa direcionou os estudiosos para ${focus}.`, "info");
        this.recordPlayerCommand("technology.focus", { focus });
        this.persistCurrent();
        this.emitState();
    }
    setTechnologyAutomation(level) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.administration.automation.technology = level;
        this.appendActionLog("Automação tecnológica atualizada", `Nível definido para ${level}.`, "info");
        this.recordPlayerCommand("technology.automation", { level });
        this.persistCurrent();
        this.emitState();
    }
    setResearchTarget(technologyId) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const node = (0, technology_tree_1.getTechnologyNode)(technologyId);
        if (!node) {
            return { ok: false, message: "Tecnologia inválida." };
        }
        if (!(0, technology_tree_1.isTechnologyAvailable)(player.technology, technologyId)) {
            return { ok: false, message: "Tecnologia indisponível: faltam pré-requisitos ou já foi concluída." };
        }
        player.technology.researchFocus = node.domain;
        player.technology.activeResearchId = technologyId;
        this.appendActionLog("Pesquisa priorizada", `Os estudiosos agora pesquisam ${node.name}.`, "info");
        this.recordPlayerCommand("technology.target", { technologyId, domain: node.domain });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: `${node.name} definida como pesquisa ativa.` };
    }
    setResearchGoal(technologyId) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        if (!technologyId) {
            player.technology.researchGoalId = null;
            this.appendActionLog("Meta tecnológica removida", "O conselho real limpou a meta de longo prazo.", "info");
            this.recordPlayerCommand("technology.goal_clear", {});
            this.persistCurrent();
            this.emitState();
            return { ok: true, message: "Meta tecnológica removida." };
        }
        const node = (0, technology_tree_1.getTechnologyNode)(technologyId);
        if (!node) {
            return { ok: false, message: "Tecnologia inválida para meta." };
        }
        if (player.technology.unlocked.includes(technologyId)) {
            return { ok: false, message: "Essa tecnologia já foi concluída." };
        }
        player.technology.researchGoalId = technologyId;
        const nextStep = (0, technology_tree_1.selectResearchNodeTowardsTarget)(player.technology, technologyId);
        if (nextStep) {
            player.technology.activeResearchId = nextStep.id;
            player.technology.researchFocus = nextStep.domain;
        }
        const details = nextStep && nextStep.id !== technologyId
            ? `Meta definida: ${node.name}. Próxima pesquisa necessária: ${nextStep.name}.`
            : `Meta definida: ${node.name}.`;
        this.appendActionLog("Meta tecnológica definida", details, "info");
        this.recordPlayerCommand("technology.goal_set", {
            technologyId,
            nextStepId: nextStep?.id ?? null
        });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: details };
    }
    listTechnologyChoices() {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const availableIds = new Set((0, technology_tree_1.listAvailableTechnologyNodes)(player.technology).map((node) => node.id));
        const unlockedIds = new Set(player.technology.unlocked);
        const activeId = player.technology.activeResearchId;
        return (0, technology_tree_1.listTechnologyNodes)().map((node) => {
            let status = "locked";
            if (unlockedIds.has(node.id)) {
                status = "unlocked";
            }
            else if (availableIds.has(node.id)) {
                status = "available";
            }
            if (activeId === node.id) {
                status = "active";
            }
            return {
                id: node.id,
                name: node.name,
                domain: node.domain,
                cost: node.cost,
                required: node.required,
                status,
                isGoal: player.technology.researchGoalId === node.id
            };
        });
    }
    executeDiplomaticAction(targetKingdomId, actionType) {
        diagnostics_1.Diagnostic.trace("CMD-DIPLO", `Intenção de Ação Diplomática: ${actionType} contra ${targetKingdomId}`);
        let state = this.requireState();
        const now = this.deps.clock.now();
        const player = this.getPlayerKingdom(state);
        const target = state.kingdoms[targetKingdomId];
        if (!target || target.id === player.id) {
            return { ok: false, message: "Alvo diplomático inválido." };
        }
        const relation = player.diplomacy.relations[target.id];
        if (!relation) {
            return { ok: false, message: "Relação diplomática inexistente para o alvo." };
        }
        relation.actionCooldowns = relation.actionCooldowns ?? {};
        const cooldownKey = `diplomacy:${actionType}`;
        const cooldownUntil = relation.actionCooldowns[cooldownKey] ?? 0;
        if (cooldownUntil > now) {
            return { ok: false, message: "Ação em cooldown diplomático.", cooldownUntil };
        }
        const { cost, chance, cooldownMs, actionPt } = this.getDiplomaticConfig(state, player.id, target.id, actionType);
        // A verificação de custo agora usa o estado do ECS como fonte da verdade.
        if (!this.canAfford(cost)) {
            return { ok: false, message: "Recursos insuficientes para executar esta ação." };
        }
        // A aplicação do custo agora modifica o estado do ECS (atualização otimista).
        this.applyCost(cost);
        const roll = this.nextRandom(state);
        const success = roll <= chance;
        relation.actionCooldowns[cooldownKey] = now + cooldownMs;
        const reverse = target.diplomacy.relations[player.id];
        if (reverse) {
            reverse.actionCooldowns = reverse.actionCooldowns ?? {};
            reverse.actionCooldowns[cooldownKey] = now + cooldownMs;
        }
        if (success) {
            if (this.deps.diplomacyResolver) {
                state = this.deps.diplomacyResolver.applyDecision(state, {
                    actorKingdomId: player.id,
                    actionType: actionPt,
                    priority: chance,
                    targetKingdomId: target.id,
                    payload: { source: "player_ui" }
                });
            }
            if (actionType === "peace") {
                this.resolvePlayerPeace(state, player.id, target.id);
            }
            if (actionType === "war") {
                if (this.deps.warResolver) {
                    state = this.deps.warResolver.declareWar(state, player.id, target.id);
                }
            }
            if (actionType === "tribute") {
                // Lógica de tributo agora lê e escreve no estado do ECS.
                if (state.ecs) {
                    const targetStock = this.getKingdomTotalEcsStock(state, target.id);
                    const tribute = this.round(targetStock.gold * 0.08);
                    const playerCapitalIndex = this.getKingdomCapitalIndex(state, player.id);
                    const targetCapitalIndex = this.getKingdomCapitalIndex(state, target.id);
                    if (playerCapitalIndex !== -1 && targetCapitalIndex !== -1) {
                        state.ecs.gold[targetCapitalIndex] = Math.max(0, state.ecs.gold[targetCapitalIndex] - tribute);
                        state.ecs.gold[playerCapitalIndex] = this.round(state.ecs.gold[playerCapitalIndex] + tribute);
                    }
                }
                else {
                    // Fallback para a lógica antiga se o ECS não estiver presente
                    const tribute = this.round(target.economy.stock.gold * 0.08);
                    target.economy.stock.gold = Math.max(0, target.economy.stock.gold - tribute);
                    player.economy.stock.gold = this.round(player.economy.stock.gold + tribute);
                }
            }
            this.appendActionLog("Ação diplomática bem-sucedida", `${player.name} executou ${actionType} com ${target.name}.`, actionType === "war" ? "critical" : "info");
        }
        else {
            player.stability = this.round(this.clamp(player.stability - 0.4, 0, 100));
            this.appendActionLog("Ação diplomática recusada", `${target.name} rejeitou ${actionType}.`, "warning");
        }
        this.recordPlayerCommand("diplomacy.action", {
            targetKingdomId,
            actionType,
            chance: this.round(chance, 4),
            roll: this.round(roll, 4),
            success
        });
        this.persistCurrent();
        this.emitState();
        return {
            ok: success,
            message: success ? "Ação executada com sucesso." : "Ação falhou na negociação.",
            chance: this.round(chance, 4),
            cooldownUntil: now + cooldownMs
        };
    }
    async sendPlayerChatMessage(targetKingdomId, message) {
        let state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const target = state.kingdoms[targetKingdomId];
        if (!target) {
            throw new Error("Target kingdom not found.");
        }
        if (!target.rulerId) {
            throw new Error("Target kingdom has no sovereign ruler.");
        }
        const ruler = state.world.characters?.[target.rulerId];
        if (!ruler) {
            throw new Error("Sovereign ruler not found.");
        }
        let relation = player.diplomacy.relations[target.id];
        if (!relation) {
            relation = {
                withKingdomId: target.id,
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
            player.diplomacy.relations[target.id] = relation;
        }
        if (!relation.chatHistory) {
            relation.chatHistory = [];
        }
        // Append the player's message
        relation.chatHistory.push({
            sender: 'player',
            text: message,
            timestamp: Date.now()
        });
        try {
            // Request the response from Gemini
            const response = await gemini_service_1.geminiService.chatWithSovereign(ruler.name, ruler.title || "Soberano", ruler.cultureId || "unknown", ruler.traits || [], ruler.stats || {}, target.npc?.personality || {}, relation, message, relation.chatHistory);
            // Append NPC response
            relation.chatHistory.push({
                sender: 'npc',
                text: response.dialogue,
                timestamp: Date.now()
            });
            // Limit chatHistory size to 10
            if (relation.chatHistory.length > 10) {
                relation.chatHistory = relation.chatHistory.slice(-10);
            }
            // Parse and trigger diplomatic action
            if (response.action && response.action !== 'NO_ACTION') {
                if (response.action === 'DECLARE_WAR') {
                    if (target.id !== player.id) {
                        if (this.deps.diplomacyResolver) {
                            state = this.deps.diplomacyResolver.applyDecision(state, {
                                actorKingdomId: target.id,
                                actionType: "declarar_guerra",
                                priority: 1,
                                targetKingdomId: player.id,
                                payload: { source: "llm_chat" }
                            });
                        }
                        if (this.deps.warResolver) {
                            state = this.deps.warResolver.declareWar(state, target.id, player.id);
                        }
                        this.appendActionLog("Guerra declarada", `${ruler.name} declarou guerra a ${player.name} por meio de diplomacia LLM.`, "critical");
                    }
                }
                else if (response.action === 'MAKE_PEACE') {
                    if (this.deps.diplomacyResolver) {
                        state = this.deps.diplomacyResolver.applyDecision(state, {
                            actorKingdomId: target.id,
                            actionType: "proposta_paz",
                            priority: 1,
                            targetKingdomId: player.id,
                            payload: { source: "llm_chat" }
                        });
                    }
                    this.resolvePlayerPeace(state, player.id, target.id);
                    this.appendActionLog("Tratado de Paz assinado", `Paz estabelecida entre ${player.name} e ${ruler.name} via diplomacia LLM.`, "info");
                }
                else if (response.action === 'MAKE_COOPERATION_AGREEMENT') {
                    if (this.deps.diplomacyResolver) {
                        state = this.deps.diplomacyResolver.applyDecision(state, {
                            actorKingdomId: target.id,
                            actionType: "oferta_alianca",
                            priority: 1,
                            targetKingdomId: player.id,
                            payload: { source: "llm_chat" }
                        });
                    }
                    this.appendActionLog("Acordo de Cooperação assinado", `Acordo diplomático selado entre ${player.name} e ${ruler.name} via diplomacia LLM.`, "info");
                }
            }
            this.currentState = state;
            this.persistCurrent();
            this.emitState();
            return response.dialogue;
        }
        catch (error) {
            console.error('[GameSession] Error in sendPlayerChatMessage:', error);
            throw error;
        }
    }
    getBuildingConfig(building) {
        switch (building) {
            case enums_1.BuildingType.Market:
                return { label: "Mercado", effectStr: "+25% Ouro local", cost: { [enums_1.ResourceType.Gold]: 300, [enums_1.ResourceType.Wood]: 150 } };
            case enums_1.BuildingType.Barracks:
                return { label: "Quartel", effectStr: "+25% Recrutas (Manpower)", cost: { [enums_1.ResourceType.Gold]: 200, [enums_1.ResourceType.Iron]: 100, [enums_1.ResourceType.Wood]: 100 } };
            case enums_1.BuildingType.Monastery:
                return { label: "Mosteiro", effectStr: "+Fé passiva e Proteção contra Cismas", cost: { [enums_1.ResourceType.Gold]: 250, [enums_1.ResourceType.Wood]: 200, [enums_1.ResourceType.Faith]: 50 } };
            case enums_1.BuildingType.University:
                return { label: "Universidade", effectStr: "Acelera Pesquisa Nacional", cost: { [enums_1.ResourceType.Gold]: 400, [enums_1.ResourceType.Wood]: 200 } };
            case enums_1.BuildingType.Fortress:
                return { label: "Fortaleza", effectStr: "Mitiga Devastação e Instabilidade", cost: { [enums_1.ResourceType.Gold]: 500, [enums_1.ResourceType.Wood]: 300, [enums_1.ResourceType.Iron]: 200 } };
        }
    }
    executeBuildStructure(regionId, buildingType) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const region = state.world.regions[regionId];
        if (!region || region.ownerId !== player.id)
            return { ok: false, message: "Você só pode construir em seus próprios territórios." };
        if (region.construction)
            return { ok: false, message: "Já existe uma construção em andamento nesta região." };
        region.buildings = region.buildings || [];
        if (region.buildings.length >= 2)
            return { ok: false, message: "Esta região já atingiu o limite de infraestruturas (2)." };
        if (region.buildings.includes(buildingType))
            return { ok: false, message: "Esta estrutura já existe nesta região." };
        const config = this.getBuildingConfig(buildingType);
        if (!this.canAfford(config.cost))
            return { ok: false, message: "Recursos insuficientes para a construção." };
        this.applyCost(config.cost);
        let targetTicks = 10;
        switch (buildingType) {
            case enums_1.BuildingType.Market:
                targetTicks = 10;
                break;
            case enums_1.BuildingType.Barracks:
                targetTicks = 12;
                break;
            case enums_1.BuildingType.Monastery:
                targetTicks = 15;
                break;
            case enums_1.BuildingType.Fortress:
                targetTicks = 20;
                break;
            case enums_1.BuildingType.University:
                targetTicks = 25;
                break;
        }
        region.construction = {
            buildingType,
            progress: 0,
            targetTicks
        };
        this.appendActionLog("Nova Infraestrutura", `${config.label} iniciada com sucesso em uma de suas províncias.`, "info");
        this.recordPlayerCommand("region.build", { regionId, buildingType });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: `${config.label} iniciada com sucesso!` };
    }
    executeRegionAction(regionId, actionType) {
        diagnostics_1.Diagnostic.trace("CMD-REGION", `Intenção de Ação Regional: ${actionType} em ${regionId}`);
        const state = this.requireState();
        const now = this.deps.clock.now();
        const player = this.getPlayerKingdom(state);
        const region = state.world.regions[regionId];
        const regionDef = this.deps.staticWorldData.definitions[regionId];
        if (!region || !regionDef) {
            return { ok: false, message: "Região inválida." };
        }
        if (actionType !== "colonize" && region.ownerId !== player.id) {
            return { ok: false, message: "Você só pode administrar regiões próprias." };
        }
        if (actionType === "colonize" || actionType === "exodus") {
            if (region.ownerId !== "k_nature") {
                return { ok: false, message: `Você só pode ${actionType === "exodus" ? "migrar para" : "colonizar"} terras selvagens.` };
            }
            const isAdjacent = regionDef.neighbors.some(nid => state.world.regions[nid]?.ownerId === player.id);
            if (!isAdjacent) {
                return { ok: false, message: "A região precisa fazer fronteira com o seu império." };
            }
            if (actionType === "exodus") {
                let ownedCount = 0;
                for (const rId in state.world.regions) {
                    if (state.world.regions[rId].ownerId === player.id)
                        ownedCount++;
                }
                if (ownedCount > 1) {
                    return { ok: false, message: "O Êxodo Nômade só é permitido para tribos de um único território." };
                }
            }
        }
        if (actionType === "change_capital" && player.capitalRegionId === regionId) {
            return { ok: false, message: "Esta região já é a capital do reino." };
        }
        region.actionCooldowns = region.actionCooldowns ?? {};
        const cooldownUntil = region.actionCooldowns[actionType] ?? 0;
        if (cooldownUntil > now) {
            return { ok: false, message: "Ação em cooldown regional.", cooldownUntil };
        }
        const config = this.getRegionActionConfig(actionType);
        if (!this.canAfford(config.cost)) {
            return { ok: false, message: "Recursos insuficientes para esta ação regional." };
        }
        this.applyCost(config.cost);
        region.actionCooldowns[actionType] = now + config.cooldownMs;
        switch (actionType) {
            case "invest_agriculture":
                region.devastation = this.round(this.clamp(region.devastation - 0.08, 0, 1));
                region.unrest = this.round(this.clamp(region.unrest - 0.05, 0, 1));
                player.economy.stock.food = this.round(player.economy.stock.food + 40 + regionDef.economyValue * 2);
                break;
            case "invest_infrastructure":
                region.autonomy = this.round(this.clamp(region.autonomy - 0.05, 0, 1));
                region.assimilation = this.round(this.clamp(region.assimilation + 0.04, 0, 1));
                region.devastation = this.round(this.clamp(region.devastation - 0.04, 0, 1));
                break;
            case "garrison":
                region.unrest = this.round(this.clamp(region.unrest - 0.08, 0, 1));
                region.autonomy = this.round(this.clamp(region.autonomy - 0.03, 0, 1));
                player.military.reserveManpower = Math.max(0, player.military.reserveManpower - 300);
                if (player.military.armies.length > 0) {
                    player.military.armies[0].manpower += 300;
                }
                break;
            case "pacify":
                region.unrest = this.round(this.clamp(region.unrest - 0.14, 0, 1));
                region.assimilation = this.round(this.clamp(region.assimilation + 0.03, 0, 1));
                region.autonomy = this.round(this.clamp(region.autonomy + 0.02, 0, 1));
                player.stability = this.round(this.clamp(player.stability + 0.8, 0, 100));
                break;
            case "change_capital":
                player.capitalRegionId = regionId;
                region.unrest = 0; // Uma nova sede do governo sempre inicia pacificada
                break;
            case "exodus": {
                const oldCapitalId = player.capitalRegionId;
                const oldRegion = state.world.regions[oldCapitalId];
                oldRegion.ownerId = "k_nature";
                oldRegion.controllerId = "k_nature";
                oldRegion.actionCooldowns = {};
                region.ownerId = player.id;
                region.controllerId = player.id;
                region.dominantFaith = player.religion.stateFaith;
                region.dominantShare = 1.0;
                region.minorityFaith = undefined;
                region.minorityShare = undefined;
                region.unrest = 0;
                region.devastation = 0;
                player.capitalRegionId = regionId;
                this.deps.eventBus.publish({
                    type: "population.exodus",
                    payload: { sourceId: oldCapitalId, targetId: regionId, kingdomId: player.id }
                });
                break;
            }
            case "colonize":
                region.ownerId = player.id;
                region.controllerId = player.id;
                region.dominantFaith = player.religion.stateFaith;
                region.dominantShare = 1.0;
                region.minorityFaith = undefined;
                region.minorityShare = undefined;
                region.unrest = 0;
                region.devastation = 0;
                // Envia o transbordo populacional para o Worker via EventBus
                this.deps.eventBus.publish({
                    type: "population.migration",
                    payload: {
                        sourceId: player.capitalRegionId,
                        targetId: regionId,
                        amount: 50,
                        kingdomId: player.id
                    }
                });
                break;
        }
        for (const kid of Object.keys(state.kingdoms)) {
            state.kingdoms[kid].ownedRegionIds = undefined;
        }
        this.appendActionLog("Ação regional executada", `${config.label} aplicada em ${regionDef.name}.`, "info");
        this.recordPlayerCommand("region.action", { regionId, actionType });
        this.persistCurrent();
        this.emitState();
        return {
            ok: true,
            message: `${config.label} aplicada.`,
            cooldownUntil: now + config.cooldownMs
        };
    }
    async saveManual(slotId) {
        if (!this.currentState) {
            return;
        }
        return new Promise((resolve) => {
            // No Mobile (síncrono), podemos salvar instantaneamente sem risco de race conditions
            this.doCommitManualSave(resolve, slotId).catch(console.error);
        });
    }
    async listSaveSlots() {
        return this.deps.saveRepository.listSlots();
    }
    async peekSaveSlot(slotId) {
        // Espia os dados do save no banco sem alterar a sessão atual. Útil para a UI montar modais de confirmação pré-load.
        const snapshot = await this.deps.saveRepository.loadFromSlot(slotId);
        return snapshot ? snapshot.state : null;
    }
    async loadSlot(slotId) {
        this.isWorkerReady = false; // Trava a engine até RESTORE_ECS_STATE confirmar (ou auto-libera no mobile)
        const snapshot = await this.deps.saveRepository.loadFromSlot(slotId);
        if (!snapshot) {
            throw new Error(`Save slot ${slotId} não encontrado ou corrompido.`);
        }
        this.currentState = structuredClone(snapshot.state);
        this.migrateLegacyState(this.currentState);
        this.currentState.meta.lastUpdatedAt = this.deps.clock.now();
        // Inicia pausado ao carregar um save manual
        this.currentState.meta.paused = true;
        await this.deps.gameStateRepository.saveCurrent(this.currentState);
        this.recordPlayerCommand("save.load_slot", { slotId });
        this.captureSnapshot("bootstrap");
        // Notifica o sistema que um estado de jogo foi carregado
        this.deps.eventBus.publish({ type: "game.loaded", payload: this.currentState });
        this.emitState(true);
        // No Mobile, como roda síncrono, a simulação já está liberada
        this.markWorkerReady();
        return this.currentState;
    }
    async deleteSlot(slotId) {
        await this.deps.saveRepository.deleteSlot(slotId);
    }
    async clearCurrentState() {
        await this.deps.gameStateRepository.clearCurrent();
    }
    async resetToNewGame(initialState) {
        this.stop();
        await this.clearCurrentState();
        // Sobrescreve completamente o estado atual na memória
        this.currentState = structuredClone(initialState);
        this.currentState.meta.lastUpdatedAt = this.deps.clock.now();
        this.currentState.meta.paused = true;
        // Salva o novo jogo por cima do save automático atual para evitar carregar o antigo
        await this.deps.gameStateRepository.saveCurrent(this.currentState);
        // Notifica a interface para recarregar
        this.deps.eventBus.publish({ type: "game.loaded", payload: this.currentState });
        this.emitState(true);
        this.start();
    }
    async reloadFromDisk() {
        const persisted = await this.deps.gameStateRepository.loadCurrent();
        if (persisted) {
            this.stop();
            this.currentState = persisted;
            this.migrateLegacyState(this.currentState);
            this.currentState.meta.lastUpdatedAt = this.deps.clock.now();
            this.currentState.meta.paused = true;
            this.deps.eventBus.publish({ type: "game.loaded", payload: this.currentState });
            this.emitState();
            this.start();
            return true;
        }
        return false;
    }
    async forceSaveToDisk() {
        if (this.currentState) {
            await this.deps.gameStateRepository.saveCurrent(this.currentState);
        }
    }
    async triggerAutosave() {
        if (!this.currentState)
            return;
        this.doCommitAutosave();
        const safeState = structuredClone(this.currentState);
        if (safeState.ecs) {
            safeState.ecs = {
                gold: Array.from(this.currentState.ecs?.gold || []),
                food: Array.from(this.currentState.ecs?.food || []),
                wood: Array.from(this.currentState.ecs?.wood || []),
                iron: Array.from(this.currentState.ecs?.iron || []),
                faith: Array.from(this.currentState.ecs?.faith || []),
                legitimacy: Array.from(this.currentState.ecs?.legitimacy || []),
                populationTotal: Array.from(this.currentState.ecs?.populationTotal || []),
                populationGrowthRate: Array.from(this.currentState.ecs?.populationGrowthRate || []),
                manpower: Array.from(this.currentState.ecs?.manpower || []),
            };
        }
        this.enqueueIo(async () => {
            await this.deps.gameStateRepository.saveCurrent(safeState);
        });
        await this.ioQueue;
    }
    toggleFogOfWar() {
        this.fogOfWarDisabled = !this.fogOfWarDisabled;
        this.emitState(true);
    }
    addResourcesDev(resource) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        if (!player)
            return;
        const capitalRegionId = player.capitalRegionId;
        const regionIndex = REGION_INDEX_MAP.get(capitalRegionId);
        if (regionIndex !== undefined && state.ecs) {
            if (resource === "gold") {
                state.ecs.gold[regionIndex] = (state.ecs.gold[regionIndex] || 0) + 1000;
                player.economy.stock.gold = (player.economy.stock.gold || 0) + 1000;
            }
            else if (resource === "wood") {
                state.ecs.wood[regionIndex] = (state.ecs.wood[regionIndex] || 0) + 1000;
                player.economy.stock.wood = (player.economy.stock.wood || 0) + 1000;
            }
            else if (resource === "iron") {
                state.ecs.iron[regionIndex] = (state.ecs.iron[regionIndex] || 0) + 1000;
                player.economy.stock.iron = (player.economy.stock.iron || 0) + 1000;
            }
            else if (resource === "food") {
                state.ecs.food[regionIndex] = (state.ecs.food[regionIndex] || 0) + 1000;
                player.economy.stock.food = (player.economy.stock.food || 0) + 1000;
            }
            else if (resource === "faith") {
                state.ecs.faith[regionIndex] = (state.ecs.faith[regionIndex] || 0) + 1000;
                player.economy.stock.faith = (player.economy.stock.faith || 0) + 1000;
            }
            else if (resource === "legitimacy") {
                state.ecs.legitimacy[regionIndex] = (state.ecs.legitimacy[regionIndex] || 0) + 1000;
                player.economy.stock.legitimacy = (player.economy.stock.legitimacy || 0) + 1000;
            }
            else if (resource === "manpower") {
                state.ecs.manpower[regionIndex] = (state.ecs.manpower[regionIndex] || 0) + 1000;
                player.military.reserveManpower = (player.military.reserveManpower || 0) + 1000;
            }
            else if (resource === "wealth") {
                if (player.rulerId && state.world.characters && state.world.characters[player.rulerId]) {
                    state.world.characters[player.rulerId].personalWealth = (state.world.characters[player.rulerId].personalWealth || 0) + 1000;
                }
            }
        }
        this.emitState();
    }
    completeResearchDev() {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        if (!player)
            return;
        const activeId = player.technology.activeResearchId;
        if (activeId) {
            const activeNode = (0, technology_tree_1.getTechnologyNode)(activeId);
            if (activeNode) {
                if (!player.technology.unlocked.includes(activeId)) {
                    player.technology.unlocked.push(activeId);
                    for (const effectObj of activeNode.effects) {
                        const effect = effectObj.target;
                        const value = effectObj.value;
                        switch (effect) {
                            case "military.techLevel":
                                player.military.militaryTechLevel = Math.max(1, Math.min(10, player.military.militaryTechLevel + value));
                                break;
                            case "military.reserveManpower":
                                player.military.reserveManpower = Math.max(0, player.military.reserveManpower + Math.round(value));
                                break;
                            case "administration.capacity":
                                player.administration.adminCapacity = Math.max(20, player.administration.adminCapacity + value);
                                break;
                            case "administration.corruption":
                                player.administration.corruption = Math.max(0, Math.min(1, player.administration.corruption + value));
                                break;
                            case "religion.authority":
                                player.religion.authority = Math.max(0, Math.min(1, player.religion.authority + value));
                                break;
                            case "religion.cohesion":
                                player.religion.cohesion = Math.max(0, Math.min(1, player.religion.cohesion + value));
                                break;
                            case "religion.tolerance":
                                player.religion.tolerance = Math.max(0, Math.min(1, player.religion.tolerance + value));
                                break;
                            case "population.growthRate":
                                player.population.growthRatePerTick = Math.max(0.00005, Math.min(0.0005, player.population.growthRatePerTick + value));
                                break;
                            case "economy.goldStock":
                                player.economy.stock.gold = Math.max(0, player.economy.stock.gold + value);
                                break;
                            case "economy.foodStock":
                                player.economy.stock.food = Math.max(0, player.economy.stock.food + value);
                                break;
                            case "economy.woodStock":
                                player.economy.stock.wood = Math.max(0, player.economy.stock.wood + value);
                                break;
                            case "economy.ironStock":
                                player.economy.stock.iron = Math.max(0, player.economy.stock.iron + value);
                                break;
                            case "economy.faithStock":
                                player.economy.stock.faith = Math.max(0, player.economy.stock.faith + value);
                                break;
                            case "stability":
                                player.stability = Math.max(0, Math.min(100, player.stability + value));
                                break;
                            case "legitimacy":
                                player.legitimacy = Math.max(0, Math.min(100, player.legitimacy + value));
                                break;
                        }
                    }
                }
                player.technology.accumulatedResearch = 0;
                player.technology.activeResearchId = null;
                this.emitState();
            }
        }
    }
    unlockAllTechnologiesDev() {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        if (!player)
            return;
        const allNodes = (0, technology_tree_1.listTechnologyNodes)();
        for (const node of allNodes) {
            if (!player.technology.unlocked.includes(node.id)) {
                player.technology.unlocked.push(node.id);
                for (const effectObj of node.effects) {
                    const effect = effectObj.target;
                    const value = effectObj.value;
                    switch (effect) {
                        case "military.techLevel":
                            player.military.militaryTechLevel = Math.max(1, Math.min(10, player.military.militaryTechLevel + value));
                            break;
                        case "military.reserveManpower":
                            player.military.reserveManpower = Math.max(0, player.military.reserveManpower + Math.round(value));
                            break;
                        case "administration.capacity":
                            player.administration.adminCapacity = Math.max(20, player.administration.adminCapacity + value);
                            break;
                        case "administration.corruption":
                            player.administration.corruption = Math.max(0, Math.min(1, player.administration.corruption + value));
                            break;
                        case "religion.authority":
                            player.religion.authority = Math.max(0, Math.min(1, player.religion.authority + value));
                            break;
                        case "religion.cohesion":
                            player.religion.cohesion = Math.max(0, Math.min(1, player.religion.cohesion + value));
                            break;
                        case "religion.tolerance":
                            player.religion.tolerance = Math.max(0, Math.min(1, player.religion.tolerance + value));
                            break;
                        case "population.growthRate":
                            player.population.growthRatePerTick = Math.max(0.00005, Math.min(0.0005, player.population.growthRatePerTick + value));
                            break;
                        case "economy.goldStock":
                            player.economy.stock.gold = Math.max(0, player.economy.stock.gold + value);
                            break;
                        case "economy.foodStock":
                            player.economy.stock.food = Math.max(0, player.economy.stock.food + value);
                            break;
                        case "economy.woodStock":
                            player.economy.stock.wood = Math.max(0, player.economy.stock.wood + value);
                            break;
                        case "economy.ironStock":
                            player.economy.stock.iron = Math.max(0, player.economy.stock.iron + value);
                            break;
                        case "economy.faithStock":
                            player.economy.stock.faith = Math.max(0, player.economy.stock.faith + value);
                            break;
                        case "stability":
                            player.stability = Math.max(0, Math.min(100, player.stability + value));
                            break;
                        case "legitimacy":
                            player.legitimacy = Math.max(0, Math.min(100, player.legitimacy + value));
                            break;
                    }
                }
            }
        }
        player.technology.accumulatedResearch = 0;
        player.technology.activeResearchId = null;
        this.emitState();
    }
    getNpcAiDecisionsDev() {
        const state = this.requireState();
        const npcs = Object.values(state.kingdoms).filter(k => !k.isPlayer && k.id !== 'k_nature');
        return npcs.map(npc => {
            let focus = "Expandir";
            let targetName = "Nenhum";
            let reason = "Ambição e busca por recursos";
            const archetype = npc.npc?.personality.archetype;
            if (archetype === enums_1.NpcArchetype.Expansionist) {
                focus = "Expandir";
                reason = "Apetite territorial de " + npc.name;
            }
            else if (archetype === enums_1.NpcArchetype.Defensive) {
                focus = "Construir Exército";
                reason = "Garantir a soberania das fronteiras";
            }
            else if (archetype === enums_1.NpcArchetype.Mercantile) {
                focus = "Rotas Comerciais";
                reason = "Acumular ouro e expandir a influência comercial";
            }
            else if (archetype === enums_1.NpcArchetype.Diplomatic) {
                focus = "Fazer Alianças";
                reason = "Preservar a paz através de tratados de não-agressão";
            }
            const activeWars = Object.values(state.wars).filter(w => w.attackers.includes(npc.id) || w.defenders.includes(npc.id));
            if (activeWars.length > 0) {
                const war = activeWars[0];
                const enemies = war.attackers.includes(npc.id) ? war.defenders : war.attackers;
                if (enemies.length > 0) {
                    const targetKingdom = state.kingdoms[enemies[0]];
                    if (targetKingdom) {
                        targetName = targetKingdom.name;
                        focus = "Guerra Ativa";
                        reason = "Subjugar " + targetKingdom.name + " em conflito armado";
                    }
                }
            }
            else {
                let highestRivalry = -1;
                let rivalId = "";
                Object.entries(npc.diplomacy.relations).forEach(([otherId, rel]) => {
                    if (rel.score.rivalry > highestRivalry) {
                        highestRivalry = rel.score.rivalry;
                        rivalId = otherId;
                    }
                });
                if (rivalId && state.kingdoms[rivalId]) {
                    targetName = state.kingdoms[rivalId].name;
                    reason = `Rivalidade latente (Score: ${highestRivalry})`;
                }
            }
            return {
                kingdomId: npc.id,
                kingdomName: npc.name,
                focus,
                target: targetName,
                reason
            };
        });
    }
    assumeControlOfKingdom(targetKingdomId) {
        const state = this.requireState();
        const oldPlayerId = Object.keys(state.kingdoms).find(id => state.kingdoms[id].isPlayer);
        if (!oldPlayerId || oldPlayerId === targetKingdomId)
            return;
        const oldPlayer = state.kingdoms[oldPlayerId];
        const newPlayer = state.kingdoms[targetKingdomId];
        if (!newPlayer)
            return;
        oldPlayer.isPlayer = false;
        newPlayer.isPlayer = true;
        oldPlayer.npc = {
            personality: {
                archetype: enums_1.NpcArchetype.Defensive,
                ambition: 0.5,
                caution: 0.5,
                greed: 0.5,
                zeal: 0.5,
                honor: 0.5,
                betrayalTendency: 0.5
            },
            strategicGoal: "proteger_fronteiras",
            memories: [],
            lastDecisionTick: state.meta.tick
        };
        delete newPlayer.npc;
        this.recordPlayerCommand("dev.assume_control", { from: oldPlayerId, to: targetKingdomId });
        this.emitState();
    }
    autoplayEnabled = false;
    preAutoplayPlayerId = null;
    originalSpeedMultiplier = 0.5;
    toggleAutoplay() {
        const state = this.requireState();
        this.autoplayEnabled = !this.autoplayEnabled;
        if (this.autoplayEnabled) {
            const playerId = Object.keys(state.kingdoms).find(id => state.kingdoms[id].isPlayer);
            if (playerId) {
                this.preAutoplayPlayerId = playerId;
                const player = state.kingdoms[playerId];
                player.isPlayer = false;
                player.npc = {
                    personality: {
                        archetype: enums_1.NpcArchetype.Expansionist,
                        ambition: 0.8,
                        caution: 0.3,
                        greed: 0.6,
                        zeal: 0.5,
                        honor: 0.4,
                        betrayalTendency: 0.3
                    },
                    strategicGoal: "auto_play",
                    memories: [],
                    lastDecisionTick: state.meta.tick
                };
            }
            this.originalSpeedMultiplier = state.meta.speedMultiplier;
            this.setSpeed(100);
        }
        else {
            if (this.preAutoplayPlayerId && state.kingdoms[this.preAutoplayPlayerId]) {
                const player = state.kingdoms[this.preAutoplayPlayerId];
                player.isPlayer = true;
                delete player.npc;
            }
            this.setSpeed(this.originalSpeedMultiplier);
        }
        this.emitState();
    }
    getDiplomacyMatrix() {
        const state = this.requireState();
        const kingdoms = Object.values(state.kingdoms).filter(k => k.id !== 'k_nature');
        const matrix = [];
        for (const k1 of kingdoms) {
            for (const k2 of kingdoms) {
                if (k1.id === k2.id)
                    continue;
                const rel = k1.diplomacy.relations[k2.id];
                matrix.push({
                    fromId: k1.id,
                    fromName: k1.name,
                    toId: k2.id,
                    toName: k2.name,
                    trust: rel?.score.trust ?? 0,
                    fear: rel?.score.fear ?? 0,
                    rivalry: rel?.score.rivalry ?? 0,
                    status: rel?.status ?? enums_1.DiplomaticRelation.Neutral,
                });
            }
        }
        return matrix;
    }
    simulateCombatDev(kingdom1Id, kingdom2Id) {
        const state = this.requireState();
        const k1 = state.kingdoms[kingdom1Id];
        const k2 = state.kingdoms[kingdom2Id];
        if (!k1 || !k2)
            return null;
        const power1 = k1.military.armies.reduce((total, army) => {
            const q = 0.6 + army.quality * 0.4;
            const s = 0.55 + army.morale * 0.25 + army.supply * 0.2;
            return total + army.manpower * q * s;
        }, 0) * (1 + k1.military.militaryTechLevel * 0.1) + k1.military.reserveManpower * 0.1;
        const power2 = k2.military.armies.reduce((total, army) => {
            const q = 0.6 + army.quality * 0.4;
            const s = 0.55 + army.morale * 0.25 + army.supply * 0.2;
            return total + army.manpower * q * s;
        }, 0) * (1 + k2.military.militaryTechLevel * 0.1) + k2.military.reserveManpower * 0.1;
        const totManpower1 = k1.military.armies.reduce((tot, a) => tot + a.manpower, 0) + k1.military.reserveManpower;
        const totManpower2 = k2.military.armies.reduce((tot, a) => tot + a.manpower, 0) + k2.military.reserveManpower;
        const totalPower = power1 + power2;
        if (totalPower === 0) {
            return {
                winnerName: "Ninguém",
                loserName: "Ninguém",
                casualties1: 0,
                casualties2: 0,
                predictedOutcome: "Ambos os reinos estão totalmente desprovidos de forças militares."
            };
        }
        const ratio1 = power1 / totalPower;
        const ratio2 = power2 / totalPower;
        let winnerName = k1.name;
        let loserName = k2.name;
        let casualties1 = Math.round(totManpower1 * ratio2 * 0.4);
        let casualties2 = Math.round(totManpower2 * ratio1 * 0.4);
        let predictedOutcome = "";
        if (power1 > power2) {
            const diffRatio = power1 / Math.max(1, power2);
            if (diffRatio > 2.0) {
                predictedOutcome = `Vitória esmagadora de ${k1.name}. O exército adversário será completamente aniquilado com poucas perdas.`;
            }
            else {
                predictedOutcome = `Vitória tática de ${k1.name} após um confronto equilibrado e sangrento.`;
            }
        }
        else if (power2 > power1) {
            winnerName = k2.name;
            loserName = k1.name;
            const diffRatio = power2 / Math.max(1, power1);
            if (diffRatio > 2.0) {
                predictedOutcome = `Vitória esmagadora de ${k2.name}. As forças de ${k1.name} serão esmagadas sem dificuldade.`;
            }
            else {
                predictedOutcome = `Vitória tática de ${k2.name} após um combate disputado.`;
            }
        }
        else {
            winnerName = "Empate";
            loserName = "Empate";
            predictedOutcome = "Equilíbrio absoluto. O combate resultaria em um empate desgastante com pesadas baixas mútuas.";
        }
        return {
            winnerName,
            loserName,
            casualties1: Math.min(totManpower1, casualties1),
            casualties2: Math.min(totManpower2, casualties2),
            predictedOutcome
        };
    }
    async clearAllSaves() {
        const slots = await this.deps.saveRepository.listSlots();
        for (const slot of slots) {
            await this.deps.saveRepository.deleteSlot(slot.slotId);
        }
    }
    getState() {
        return this.requireState();
    }
    changeStateReligion(newFaithId) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const faithDef = state.world.religions[newFaithId]; // Lê do mundo vivo e não do arquivo estático
        if (!faithDef) {
            return { ok: false, message: "Fé desconhecida." };
        }
        if (player.religion.stateFaith === newFaithId) {
            return { ok: false, message: "O império já segue esta fé como religião oficial." };
        }
        const cost = { [enums_1.ResourceType.Legitimacy]: 40 };
        if (!this.canAfford(cost)) {
            return { ok: false, message: "Legitimidade insuficiente para forçar uma conversão estatal (-40 necessários)." };
        }
        this.applyCost(cost);
        player.religion.stateFaith = newFaithId;
        player.stability = this.clamp(player.stability - 30, 0, 100); // Choque cultural massivo
        this.appendActionLog("Reforma Religiosa Estatal", `O império adotou oficialmente a fé: ${faithDef.name}. Houve grande choque cultural (-30 Estabilidade).`, "warning");
        this.recordPlayerCommand("religion.change_state_faith", { newFaithId });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: `Religião estatal alterada para ${faithDef.name}.` };
    }
    foundCustomReligion(params) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const cost = { [enums_1.ResourceType.Faith]: 1000, [enums_1.ResourceType.Legitimacy]: 50 };
        if (!this.canAfford(cost)) {
            return { ok: false, message: "Recursos insuficientes (Requer 1.000 Fé, 50 Legitimidade)." };
        }
        if (params.name.length < 3 || params.deityName.length < 3) {
            return { ok: false, message: "Os nomes devem ter no mínimo 3 caracteres." };
        }
        if (params.deityDescription.length < 5) {
            return { ok: false, message: "A descrição teológica é obrigatória." };
        }
        if (params.tenets.length === 0) {
            return { ok: false, message: "Você deve escolher ao menos um dogma sagrado." };
        }
        let budgetUsed = 0;
        for (const tId of params.tenets) {
            const tenet = this.deps.staticWorldData.tenets[tId];
            if (!tenet)
                return { ok: false, message: `Dogma inválido: ${tId}` };
            budgetUsed += tenet.cost;
        }
        if (budgetUsed > 100)
            return { ok: false, message: "Orçamento de 100 Pontos de Doutrina excedido." };
        this.applyCost(cost);
        const newReligionId = `rel_custom_${Date.now()}`;
        const now = this.deps.clock.now();
        state.world.religions[newReligionId] = {
            id: newReligionId,
            name: params.name,
            deityName: params.deityName,
            deityDescription: params.deityDescription,
            color: params.color,
            tenets: [...params.tenets],
            holyCityRegionId: player.capitalRegionId,
            headOfFaithKingdomId: player.id,
            founderId: player.id,
            foundedAt: now,
            parentReligionId: player.religion.stateFaith
        };
        player.religion.stateFaith = newReligionId;
        player.religion.authority = 1.0;
        player.legitimacy = 100;
        player.stability = 100; // A fé recém-formada unifica perfeitamente a nação
        this.appendActionLog("Fé Inédita Forjada", `${player.name} iluminou o mundo ao fundar o(a) ${params.name}. O antigo panteão foi destruído e a Capital declarada Cidade Santa.`, "critical");
        this.recordPlayerCommand("religion.found_custom", { religionId: newReligionId });
        this.persistCurrent();
        this.emitState();
        return { ok: true, message: `O mundo se curva perante o(a) ${params.name}!` };
    }
    executeReligiousAction(targetKingdomId, actionType) {
        const state = this.requireState();
        const now = this.deps.clock.now();
        const player = this.getPlayerKingdom(state);
        const target = state.kingdoms[targetKingdomId];
        if (!target || target.id === player.id) {
            return { ok: false, message: "Alvo religioso inválido." };
        }
        const relation = player.diplomacy.relations[target.id];
        if (!relation) {
            return { ok: false, message: "Sem rota diplomática para esta ação religiosa." };
        }
        relation.actionCooldowns = relation.actionCooldowns ?? {};
        const config = this.getReligiousActionConfig(player.id, target.id, actionType);
        const cooldownUntil = relation.actionCooldowns[config.cooldownKey] ?? 0;
        if (cooldownUntil > now) {
            return { ok: false, message: "Ação religiosa em cooldown.", cooldownUntil };
        }
        if (!this.canAfford(config.cost)) {
            return { ok: false, message: "Recursos insuficientes para enviar missionários." };
        }
        this.applyCost(config.cost);
        const roll = this.nextRandom(state);
        const success = roll <= config.chance;
        relation.actionCooldowns[config.cooldownKey] = now + config.cooldownMs;
        const reverse = target.diplomacy.relations[player.id];
        if (reverse) {
            reverse.actionCooldowns = reverse.actionCooldowns ?? {};
            reverse.actionCooldowns[config.cooldownKey] = now + config.cooldownMs;
        }
        if (success) {
            const currentInfluence = target.religion.externalInfluenceIn[player.id] ?? 0;
            const boostedInfluence = this.clamp(currentInfluence + config.pressureGain, 0, 1);
            target.religion.externalInfluenceIn[player.id] = this.round(boostedInfluence, 4);
            this.appendActionLog("Missionários enviados", `${player.name} iniciou campanha missionária em ${target.name}.`, "info");
        }
        else {
            player.stability = this.round(this.clamp(player.stability - 0.25, 0, 100));
            this.appendActionLog("Campanha missionária bloqueada", `${target.name} reprimiu a tentativa de infiltração religiosa.`, "warning");
        }
        this.recordPlayerCommand("religion.action", {
            targetKingdomId,
            actionType,
            chance: this.round(config.chance, 4),
            roll: this.round(roll, 4),
            success,
            pressureGain: this.round(config.pressureGain, 4)
        });
        this.persistCurrent();
        this.emitState();
        return {
            ok: success,
            message: success ? "Campanha missionária iniciada." : "Campanha missionária falhou.",
            chance: this.round(config.chance, 4),
            cooldownUntil: now + config.cooldownMs
        };
    }
    getStaticWorldData() {
        return this.deps.staticWorldData;
    }
    getRuntimeMetrics() {
        return { ...this.runtimeMetrics };
    }
    async flushPersistence() {
        await this.ioQueue;
    }
    updateEcsState(ecsState) {
        const state = this.currentState;
        if (state) {
            state.ecs = ecsState;
            // AUTO-DESTRAVE: O Worker provou estar vivo. Libera a simulação do F5/Load congelado!
            if (!this.isWorkerReady) {
                this.markWorkerReady();
            }
            // COMMIT ATÔMICO: Transação segura no exato frame em que a matriz fresca chegou.
            if (this.pendingManualSave) {
                this.doCommitManualSave(this.pendingManualSave.resolve, this.pendingManualSave.slotId).catch(console.error);
                this.pendingManualSave = null;
            }
            if (this.pendingAutosave) {
                this.doCommitAutosave();
                this.pendingAutosave = false;
            }
        }
    }
    async doCommitManualSave(resolve, slotId) {
        const snapshot = this.buildSaveSlotSnapshot(slotId);
        await this.deps.saveRepository.saveToSlot(snapshot);
        this.recordPlayerCommand("save.manual", { slotId });
        this.captureSnapshot("manual");
        resolve();
    }
    doCommitAutosave() {
        // 1. Injeta o feedback visual na sessão ANTES de clonar, para que a mensagem já vá no arquivo do save.
        this.appendActionLog("Progresso Registrado", "Os escribas reais salvaram o estado do império nos arquivos permanentes.", "info");
        // 2. Notifica a UI via EventBus (Permite que a interface mostre um ícone de "Salvando..." animado no canto da tela, se desejar)
        this.deps.eventBus.publish({
            type: "game.autosaved",
            payload: { tick: this.currentState?.meta.tick ?? 0 }
        });
        const snapshot = this.buildSaveSlotSnapshot(save_slots_1.AUTOSAVE_SLOT_ID);
        this.enqueueIo(async () => {
            await this.deps.saveRepository.saveToSlot(snapshot);
        });
        this.recordSystemCommand("save.autosave", { slotId: save_slots_1.AUTOSAVE_SLOT_ID });
        this.captureSnapshot("autosave");
    }
    getPlayerKingdom(state) {
        const player = Object.keys(state.kingdoms)
            .sort()
            .map((kingdomId) => state.kingdoms[kingdomId])
            .find((kingdom) => kingdom.isPlayer);
        if (!player) {
            throw new Error("Reino do jogador não encontrado.");
        }
        return player;
    }
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    round(value, decimals = 2) {
        const factor = 10 ** decimals;
        return Math.round(value * factor) / factor;
    }
    monotonicNow() {
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
            return performance.now();
        }
        return Date.now();
    }
    getKingdomMetrics(kingdomId) {
        const state = this.requireState();
        let totalPopulation = 0;
        const kingdomRegionIndices = Object.values(state.world.regions)
            .filter((r) => r.ownerId === kingdomId)
            .map((r) => REGION_INDEX_MAP.get(r.regionId))
            .filter((index) => index !== undefined);
        // Usa o ECS se o ECS worker estiver atualizando o estado ativamente (manpower cresce, population cresce)
        // Como no Mobile estamos em V1 (Sem worker nativo de ECS ainda), usamos a lógica principal:
        const kingdom = state.kingdoms[kingdomId];
        if (kingdom) {
            totalPopulation = kingdom.population.total;
        }
        else if (state.ecs && state.ecs.populationTotal) {
            for (const index of kingdomRegionIndices) {
                totalPopulation += state.ecs.populationTotal[index] ?? 0;
            }
        }
        return { totalPopulation, controlledRegions: kingdomRegionIndices.length };
    }
    getKingdomControlledRegions(kingdomId) {
        const state = this.requireState();
        return Object.values(state.world.regions)
            .filter((r) => r.ownerId === kingdomId)
            .map(r => r.regionId);
    }
    setTaxRate(newRate) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        player.economy.taxPolicy.baseRate = newRate;
        this.recordPlayerCommand("economy.set_tax", { rate: newRate });
        this.persistCurrent();
        this.emitState();
    }
    registerTickTiming(elapsedMs) {
        this.tickSamples.push(elapsedMs);
        if (this.tickSamples.length > 60) {
            this.tickSamples.shift();
        }
        const total = this.tickSamples.reduce((sum, value) => sum + value, 0);
        const average = this.tickSamples.length === 0 ? 0 : total / this.tickSamples.length;
        this.runtimeMetrics.tickMsLast = this.round(elapsedMs, 3);
        this.runtimeMetrics.tickMsAverage = this.round(average, 3);
    }
    nextRandom(state) {
        state.randomSeed = (Math.imul(state.randomSeed, 1664525) + 1013904223) >>> 0;
        return state.randomSeed / 0x100000000;
    }
    getKingdomCapitalIndex(state, kingdomId) {
        const kingdom = state.kingdoms[kingdomId];
        if (!kingdom) {
            return -1;
        }
        return REGION_INDEX_MAP.get(kingdom.capitalRegionId) ?? -1;
    }
    getKingdomTotalEcsStock(state, kingdomId) {
        const emptyStock = (0, economy_1.createEmptyStock)();
        if (!state.ecs) {
            return emptyStock;
        }
        const kingdomRegionIndices = Object.values(state.world.regions)
            .filter((r) => r.ownerId === kingdomId)
            .map((r) => REGION_INDEX_MAP.get(r.regionId))
            .filter((index) => index !== undefined);
        const totals = emptyStock;
        const ecs = state.ecs;
        for (const index of kingdomRegionIndices) {
            totals.gold += ecs.gold[index] ?? 0;
            totals.food += ecs.food[index] ?? 0;
            totals.wood += ecs.wood[index] ?? 0;
            totals.iron += ecs.iron[index] ?? 0;
            totals.faith += ecs.faith[index] ?? 0;
            totals.legitimacy += ecs.legitimacy[index] ?? 0;
        }
        return totals;
    }
    canAfford(cost) {
        const state = this.requireState();
        const player = this.getPlayerKingdom(state);
        const playerEcsStock = this.getKingdomTotalEcsStock(state, player.id);
        return Object.entries(cost).every(([resource, value]) => {
            const key = resource;
            const required = value ?? 0;
            return playerEcsStock[key] >= required;
        });
    }
    applyCost(cost) {
        // Esta é uma atualização otimista que será reconciliada pelo worker no próximo tick.
        const state = this.requireState();
        if (!state.ecs) {
            return;
        }
        const player = this.getPlayerKingdom(state);
        const capitalIndex = this.getKingdomCapitalIndex(state, player.id);
        if (capitalIndex === -1) {
            console.error(`[applyCost] Não foi possível encontrar o índice da capital para o jogador ${player.id}`);
            return;
        }
        for (const [resource, value] of Object.entries(cost)) {
            const key = resource;
            const required = value ?? 0;
            const resourceArray = state.ecs[key];
            if (resourceArray && capitalIndex < resourceArray.length) {
                resourceArray[capitalIndex] = this.round(Math.max(0, resourceArray[capitalIndex] - required));
            }
        }
    }
    appendActionLog(title, details, severity) {
        const state = this.requireState();
        const entry = this.createSessionLog(title, details, severity, this.deps.clock.now());
        state.events = [entry, ...state.events].slice(0, 180);
    }
    getDiplomaticConfig(state, playerId, targetId, actionType) {
        const relation = state.kingdoms[playerId].diplomacy.relations[targetId];
        const trust = relation?.score.trust ?? 0.3;
        const rivalry = relation?.score.rivalry ?? 0.3;
        const fear = relation?.score.fear ?? 0.2;
        const grievance = relation?.grievance ?? 0.2;
        const base = {
            cost: {},
            chance: 0.55,
            cooldownMs: 45_000,
            actionPt: "oferta_alianca"
        };
        switch (actionType) {
            case "alliance":
                base.cost = {
                    [enums_1.ResourceType.Gold]: 18,
                    [enums_1.ResourceType.Legitimacy]: 4
                };
                base.chance = this.clamp(0.2 + trust * 0.55 + (1 - rivalry) * 0.25, 0.08, 0.9);
                base.cooldownMs = 90_000;
                base.actionPt = "oferta_alianca";
                break;
            case "non_aggression":
                base.cost = {
                    [enums_1.ResourceType.Gold]: 12,
                    [enums_1.ResourceType.Legitimacy]: 2
                };
                base.chance = this.clamp(0.25 + trust * 0.45 + (1 - grievance) * 0.2, 0.1, 0.92);
                base.cooldownMs = 75_000;
                base.actionPt = "pacto_nao_agressao";
                break;
            case "peace":
                base.cost = {
                    [enums_1.ResourceType.Gold]: 20
                };
                base.chance = this.clamp(0.3 + fear * 0.25 + trust * 0.2 + grievance * 0.15, 0.15, 0.92);
                base.cooldownMs = 55_000;
                base.actionPt = "proposta_paz";
                break;
            case "tribute":
                base.cost = {
                    [enums_1.ResourceType.Legitimacy]: 3,
                    [enums_1.ResourceType.Gold]: 10
                };
                base.chance = this.clamp(0.2 + fear * 0.55 + (1 - trust) * 0.2, 0.06, 0.85);
                base.cooldownMs = 80_000;
                base.actionPt = "exigir_tributo";
                break;
            case "embargo":
                base.cost = {
                    [enums_1.ResourceType.Gold]: 14
                };
                base.chance = this.clamp(0.28 + rivalry * 0.35 + (1 - trust) * 0.2, 0.12, 0.88);
                base.cooldownMs = 65_000;
                base.actionPt = "embargo_comercial";
                break;
            case "demand_vassalage":
                base.cost = {
                    [enums_1.ResourceType.Legitimacy]: 15,
                    [enums_1.ResourceType.Gold]: 50
                };
                base.chance = this.clamp(0.1 + fear * 0.65 + (1 - trust) * 0.1, 0.05, 0.85);
                base.cooldownMs = 120_000;
                base.actionPt = "exigir_vassalagem";
                break;
            case "war": {
                const attacker = state.kingdoms[playerId];
                const defender = state.kingdoms[targetId];
                const risk = this.deps.warResolver ? this.deps.warResolver.evaluateWarRisk(attacker, defender, state) : 0.45;
                base.cost = {
                    [enums_1.ResourceType.Gold]: 35,
                    [enums_1.ResourceType.Food]: 50,
                    [enums_1.ResourceType.Iron]: 18,
                    [enums_1.ResourceType.Legitimacy]: 5
                };
                base.chance = this.clamp(0.18 + risk * 0.7 + rivalry * 0.08, 0.08, 0.95);
                base.cooldownMs = 95_000;
                base.actionPt = "declarar_guerra";
                break;
            }
        }
        return base;
    }
    resolvePlayerPeace(state, leftId, rightId) {
        const warIds = Object.keys(state.wars)
            .sort()
            .filter((warId) => {
            const war = state.wars[warId];
            const leftInWar = war.attackers.includes(leftId) || war.defenders.includes(leftId);
            const rightInWar = war.attackers.includes(rightId) || war.defenders.includes(rightId);
            return leftInWar && rightInWar;
        });
        if (warIds.length === 0) {
            return;
        }
        for (const warId of warIds) {
            if (this.deps.warResolver) {
                this.deps.warResolver.enforcePeace(state, warId);
                continue;
            }
            delete state.wars[warId];
            const leftRelation = state.kingdoms[leftId].diplomacy.relations[rightId];
            const rightRelation = state.kingdoms[rightId].diplomacy.relations[leftId];
            if (leftRelation) {
                leftRelation.status = enums_1.DiplomaticRelation.Truce;
            }
            if (rightRelation) {
                rightRelation.status = enums_1.DiplomaticRelation.Truce;
            }
            const signedAt = state.meta.lastUpdatedAt;
            const parties = (0, identifiers_1.sortUniqueIds)([leftId, rightId]);
            const treaty = {
                id: (0, identifiers_1.buildTreatyId)(enums_1.TreatyType.Peace, parties, signedAt),
                type: enums_1.TreatyType.Peace,
                parties,
                signedAt,
                expiresAt: signedAt + 60_000,
                terms: { borderFreeze: true }
            };
            state.kingdoms[leftId].diplomacy.treaties.push(treaty);
            state.kingdoms[rightId].diplomacy.treaties.push(treaty);
        }
    }
    getRegionActionConfig(actionType) {
        switch (actionType) {
            case "invest_agriculture":
                return {
                    label: "Investimento em agricultura",
                    cooldownMs: 42_000,
                    cost: {
                        [enums_1.ResourceType.Gold]: 28,
                        [enums_1.ResourceType.Wood]: 22
                    }
                };
            case "invest_infrastructure":
                return {
                    label: "Investimento em infraestrutura",
                    cooldownMs: 50_000,
                    cost: {
                        [enums_1.ResourceType.Gold]: 40,
                        [enums_1.ResourceType.Wood]: 30,
                        [enums_1.ResourceType.Iron]: 10
                    }
                };
            case "garrison":
                return {
                    label: "Reforço de guarnição",
                    cooldownMs: 35_000,
                    cost: {
                        [enums_1.ResourceType.Gold]: 35,
                        [enums_1.ResourceType.Food]: 20,
                        [enums_1.ResourceType.Iron]: 18
                    }
                };
            case "pacify":
                return {
                    label: "Pacificação administrativa",
                    cooldownMs: 40_000,
                    cost: {
                        [enums_1.ResourceType.Gold]: 24,
                        [enums_1.ResourceType.Faith]: 16,
                        [enums_1.ResourceType.Legitimacy]: 3
                    }
                };
            case "change_capital":
                return {
                    label: "Transferência de sede governamental",
                    cooldownMs: 60_000,
                    cost: {
                        [enums_1.ResourceType.Gold]: 150,
                        [enums_1.ResourceType.Legitimacy]: 10
                    }
                };
            case "exodus":
                return {
                    label: "Êxodo Nômade",
                    cooldownMs: 15_000,
                    cost: {
                        [enums_1.ResourceType.Food]: 200
                    }
                };
            case "colonize":
                return {
                    label: "Fundar Colônia",
                    cooldownMs: 15_000,
                    cost: {
                        [enums_1.ResourceType.Gold]: 20,
                        [enums_1.ResourceType.Food]: 50
                    }
                };
        }
    }
    onClockTick(deltaMs, now) {
        this.processClockTick(deltaMs, now, false);
    }
    processClockTick(deltaMs, now, ignorePause, speedMultiplierOverride, applySafetyClamp = true) {
        const state = this.currentState;
        if (!state || (!ignorePause && state.meta.paused) || !this.isWorkerReady) {
            return;
        }
        void now;
        // PROTEÇÃO CONTRA ESPIRAL DA MORTE (Spiral of Death)
        const safeDeltaMs = applySafetyClamp ? Math.min(deltaMs, 1000) : Math.max(0, deltaMs);
        const appliedSpeedMultiplier = speedMultiplierOverride ?? state.meta.speedMultiplier;
        this.accumulatedMs += safeDeltaMs * appliedSpeedMultiplier;
        this.pumpSimulationQueue();
    }
    isPumping = false;
    pumpSimulationQueue() {
        if (this.isPumping || !this.currentState || this.currentState.meta.paused)
            return;
        this.isPumping = true;
        try {
            const current = this.currentState;
            const tickDurationMs = Math.max(1, current.meta.tickDurationMs);
            // Aumentamos o limite para 5 ticks por frame. Isso permite processar 30x em 6 quadros sem asfixiar a UI.
            let ticksProcessedThisCycle = 0;
            const MAX_TICKS_PER_FRAME = 5;
            let progressed = false;
            let simNow = current.meta.lastUpdatedAt;
            while (this.accumulatedMs >= tickDurationMs && ticksProcessedThisCycle < MAX_TICKS_PER_FRAME) {
                simNow = Math.max(simNow, this.currentState.meta.lastUpdatedAt) + tickDurationMs;
                const previousTick = this.currentState.meta.tick;
                const tickStartedAt = this.monotonicNow();
                const result = this.pipeline.runMutating(this.currentState, tickDurationMs, simNow);
                const tickElapsedMs = this.monotonicNow() - tickStartedAt;
                this.registerTickTiming(tickElapsedMs);
                this.currentState = result.state;
                progressed = true;
                this.ticksSinceAutosave += 1;
                this.ticksSinceSnapshot += 1;
                ticksProcessedThisCycle += 1;
                for (const event of result.events) {
                    this.deps.eventBus.publish(event);
                }
                this.recordTickCommands(previousTick, result.state.meta.tick, result.events, simNow);
                if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {
                    this.ticksSinceAutosave = 0;
                    this.runAutosave();
                }
                const snapshotEveryTicks = Math.max(1, this.deps.snapshotEveryTicks ?? 25);
                while (this.ticksSinceSnapshot >= snapshotEveryTicks) {
                    this.ticksSinceSnapshot -= snapshotEveryTicks;
                    this.captureSnapshot("periodic", simNow);
                }
                this.accumulatedMs -= tickDurationMs;
            }
            // Drop de frames pesados se a acumulação sair do controle (limite de 120 ticks na fila)
            const maxAccumulatedMs = 120000 * Math.max(1, this.currentState?.meta.speedMultiplier ?? 1);
            if (this.accumulatedMs > maxAccumulatedMs) {
                diagnostics_1.Diagnostic.warn("SYS-PERF", "Dívida de CPU massiva detectada. Descartando backlog de simulação.");
                this.accumulatedMs = 1000;
            }
            if (progressed) {
                const ecsBackup = this.currentState.ecs;
                this.currentState = (0, clone_game_state_1.cloneGameStateForSimulation)(this.currentState);
                if (ecsBackup) {
                    this.currentState.ecs = ecsBackup;
                }
                this.persistCurrent();
                this.emitState();
            }
            // Re-agenda assincronamente para esvaziar a fila de 30x sem travar o React Native
            if (this.accumulatedMs >= tickDurationMs && !this.currentState.meta.paused) {
                setTimeout(() => this.pumpSimulationQueue(), 0);
            }
        }
        finally {
            this.isPumping = false;
        }
    }
    runAutosave() {
        if (!this.currentState) {
            return;
        }
        this.doCommitAutosave();
    }
    buildSaveSlotSnapshot(slotId) {
        const state = this.requireState();
        const now = this.deps.clock.now();
        // Cópia Rasa O(1) do estado. Elimina o travamento de 1500ms na hora do Autosave!
        const stateCopy = {
            ...state,
            meta: { ...state.meta }
        };
        // Converte os Float64Arrays do ECS para Arrays normais para garantir a serialização
        if (state.ecs) {
            stateCopy.ecs = {
                gold: Array.from(state.ecs?.gold || []),
                food: Array.from(state.ecs?.food || []),
                wood: Array.from(state.ecs?.wood || []),
                iron: Array.from(state.ecs?.iron || []),
                faith: Array.from(state.ecs?.faith || []),
                legitimacy: Array.from(state.ecs?.legitimacy || []),
                populationTotal: Array.from(state.ecs?.populationTotal || []),
                populationGrowthRate: Array.from(state.ecs?.populationGrowthRate || []),
                manpower: Array.from(state.ecs?.manpower || []),
            };
        }
        return {
            summary: (0, build_save_summary_1.buildSaveSummary)(slotId, stateCopy, now),
            state: stateCopy
        };
    }
    buildStateSnapshot(reason, savedAt = this.deps.clock.now()) {
        const state = this.requireState();
        return {
            id: `snapshot:${state.meta.tick}:${savedAt}:${reason}`,
            tick: state.meta.tick,
            savedAt,
            reason,
            commandSequence: this.commandSequence,
            commandHash: this.commandHeadHash,
            stateHash: (0, state_fingerprint_1.buildStateHash)(state),
            state: structuredClone(state)
        };
    }
    getReligiousActionConfig(actorKingdomId, targetKingdomId, _actionType) {
        const state = this.requireState();
        const actor = state.kingdoms[actorKingdomId];
        const target = state.kingdoms[targetKingdomId];
        const actorMissionaryPower = this.clamp(actor.religion.authority * 0.5 + actor.religion.missionaryBudget * 0.5, 0, 1);
        const targetResistance = this.clamp(target.religion.authority * 0.45 + target.religion.tolerance * 0.35 + target.stability / 100 * 0.2, 0, 1);
        return {
            cooldownKey: "religion:send_missionaries",
            cooldownMs: 90_000,
            cost: {
                [enums_1.ResourceType.Gold]: 18,
                [enums_1.ResourceType.Faith]: 26,
                [enums_1.ResourceType.Legitimacy]: 2
            },
            chance: this.clamp(0.2 + actorMissionaryPower * 0.55 - targetResistance * 0.32, 0.08, 0.9),
            pressureGain: this.clamp(0.2 + actorMissionaryPower * 0.18, 0.16, 0.42)
        };
    }
    captureSnapshot(reason, savedAt = this.deps.clock.now()) {
        const repository = this.deps.snapshotRepository;
        if (!repository || !this.currentState) {
            return;
        }
        const snapshot = this.buildStateSnapshot(reason, savedAt);
        const maxSnapshots = Math.max(5, this.deps.maxSnapshots ?? 20);
        this.enqueueIo(async () => {
            await repository.save(snapshot);
            await this.pruneSnapshots(repository, maxSnapshots);
        });
    }
    async pruneSnapshots(repository, maxSnapshots) {
        const entries = await repository.list(maxSnapshots + 20);
        if (entries.length <= maxSnapshots) {
            return;
        }
        for (const stale of entries.slice(maxSnapshots)) {
            await repository.delete(stale.id);
        }
    }
    persistCurrent() {
        this.enqueueIo(async () => {
            if (this.currentState) {
                await this.deps.gameStateRepository.saveCurrent(this.currentState);
            }
        });
    }
    enqueueIo(action) {
        this.ioQueue = this.ioQueue
            .then(action)
            .catch((error) => {
            console.error("Falha em operação de persistência", error);
        });
    }
    async restoreFromSnapshotOrSave() {
        if (this.deps.snapshotRepository) {
            const latestSnapshot = await this.deps.snapshotRepository.latest();
            if (latestSnapshot) {
                return structuredClone(latestSnapshot.state);
            }
        }
        return this.restoreFromLatestSave();
    }
    async restoreFromLatestSave() {
        const slots = await this.deps.saveRepository.listSlots();
        for (const slot of slots) {
            const snapshot = await this.deps.saveRepository.loadFromSlot(slot.slotId);
            if (snapshot) {
                return structuredClone(snapshot.state);
            }
        }
        return null;
    }
    async bootstrapCommandHead() {
        const commandRepository = this.deps.commandLogRepository;
        if (!commandRepository) {
            this.commandSequence = 0;
            this.commandHeadHash = "genesis";
            return;
        }
        const latest = await commandRepository.latest();
        if (!latest) {
            this.commandSequence = 0;
            this.commandHeadHash = "genesis";
            return;
        }
        this.commandSequence = latest.sequence;
        this.commandHeadHash = latest.hash;
    }
    async runOfflineProgression(state, now) {
        const lastSnapshotAt = state.meta.lastClosedAt ?? state.meta.lastUpdatedAt;
        if (!lastSnapshotAt || lastSnapshotAt >= now) {
            return { state, ticks: 0, elapsedMs: 0 };
        }
        // O progresso offline é opcional e deve estar explicitamente ativado
        if (!state.meta.offlineProgression) {
            return { state, ticks: 0, elapsedMs: 0 };
        }
        const elapsedMs = now - lastSnapshotAt;
        const maxTicks = this.deps.maxOfflineTicks ?? 12_000;
        const desiredTicks = Math.floor(elapsedMs / Math.max(1, state.meta.tickDurationMs));
        const ticksToSimulate = Math.max(0, Math.min(desiredTicks, maxTicks));
        if (ticksToSimulate === 0) {
            return {
                state,
                ticks: 0,
                elapsedMs: 0
            };
        }
        const tickDurationMs = Math.max(1, state.meta.tickDurationMs);
        const coarseStepTicks = this.selectOfflineCoarseStep(ticksToSimulate);
        const startedAt = this.monotonicNow();
        const ecsBackup = state.ecs;
        let processedTicks = 0;
        let currentState = state;
        // Fatia a progressão em pacotes curtos. Evita que a Thread tranque.
        const CHUNK_SIZE = 50; // Reduzido drasticamente para não asfixiar a UI
        while (processedTicks < ticksToSimulate) {
            const ticksThisChunk = Math.min(CHUNK_SIZE, ticksToSimulate - processedTicks);
            const startNowForChunk = lastSnapshotAt + (processedTicks * tickDurationMs);
            const batchResult = this.pipeline.runBatch(currentState, ticksThisChunk, tickDurationMs, startNowForChunk, {
                collectEvents: false,
                coarseStepTicks
            });
            currentState = batchResult.state;
            processedTicks += ticksThisChunk;
            // Cede a CPU de volta ao Navegador por 10ms para repintar a barra de loading
            // e impedir o aviso de [Violation] setInterval took X ms.
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        if (ecsBackup) {
            currentState.ecs = ecsBackup;
        }
        return {
            state: currentState,
            ticks: ticksToSimulate,
            elapsedMs: this.monotonicNow() - startedAt
        };
    }
    selectOfflineCoarseStep(ticks) {
        if (ticks >= 10_000) {
            return 20; // Pulo grosseiro de tempo para simular ausências extremas
        }
        if (ticks >= 6_000) {
            return 10;
        }
        if (ticks >= 3_000) {
            return 5;
        }
        if (ticks >= 1_500) {
            return 2;
        }
        return 1;
    }
    lastEmitTime = 0;
    emitState(force = false) {
        if (!this.currentState) {
            return;
        }
        const now = Date.now();
        if (!force && (now - this.lastEmitTime < 100)) {
            return; // Skip UI update, let engine run freely
        }
        if (!force) {
            this.lastEmitTime = now;
        }
        for (const listener of this.listeners) {
            listener(this.currentState);
        }
    }
    requireState() {
        if (!this.currentState) {
            throw new Error("Sessão ainda não inicializada.");
        }
        return this.currentState;
    }
    createSessionLog(title, details, severity, now) {
        const tick = this.currentState?.meta.tick ?? 0;
        const seq = this.sessionLogSeq++;
        return {
            id: `evt_session_${tick}_${seq}`,
            title,
            details,
            severity,
            occurredAt: now
        };
    }
    createCommandEntry(input) {
        const sequence = this.commandSequence + 1;
        const previousHash = this.commandHeadHash;
        const id = `cmd:${input.tick}:${sequence}:${input.commandType}`;
        const base = {
            sequence,
            id,
            issuerType: input.issuerType,
            issuerId: input.issuerId,
            tick: input.tick,
            commandType: input.commandType,
            payload: input.payload,
            createdAt: input.createdAt,
            previousHash
        };
        const hash = (0, stable_hash_1.hashDeterministic)({
            sequence,
            id,
            issuerType: input.issuerType,
            issuerId: input.issuerId,
            tick: input.tick,
            commandType: input.commandType,
            payload: input.payload,
            previousHash
        });
        this.commandSequence = sequence;
        this.commandHeadHash = hash;
        return {
            ...base,
            hash
        };
    }
    enqueueCommandEntries(entries) {
        const repository = this.deps.commandLogRepository;
        if (!repository || entries.length === 0) {
            return;
        }
        this.enqueueIo(async () => {
            await repository.append(entries);
        });
    }
    recordPlayerCommand(commandType, payload) {
        const repository = this.deps.commandLogRepository;
        const state = this.currentState;
        if (!repository || !state) {
            return;
        }
        const player = Object.keys(state.kingdoms)
            .sort()
            .map((kingdomId) => state.kingdoms[kingdomId])
            .find((kingdom) => kingdom.isPlayer);
        const entry = this.createCommandEntry({
            issuerType: "player",
            issuerId: player?.id ?? "player",
            tick: state.meta.tick,
            commandType,
            payload,
            createdAt: this.deps.clock.now()
        });
        this.enqueueCommandEntries([entry]);
    }
    recordSystemCommand(commandType, payload, createdAt = this.deps.clock.now()) {
        const repository = this.deps.commandLogRepository;
        const state = this.currentState;
        if (!repository || !state) {
            return;
        }
        const entry = this.createCommandEntry({
            issuerType: "system",
            issuerId: "runtime",
            tick: state.meta.tick,
            commandType,
            payload,
            createdAt
        });
        this.enqueueCommandEntries([entry]);
    }
    recordTickCommands(previousTick, currentTick, events, createdAt) {
        const repository = this.deps.commandLogRepository;
        if (!repository) {
            return;
        }
        const state = this.currentState;
        const stateHash = state ? (0, state_fingerprint_1.buildStateHash)(state) : null;
        const entries = [];
        entries.push(this.createCommandEntry({
            issuerType: "system",
            issuerId: "tick_engine",
            tick: currentTick,
            commandType: "tick.processed",
            payload: {
                previousTick,
                currentTick,
                eventCount: events.length,
                stateHash
            },
            createdAt
        }));
        for (const event of events) {
            const issuerType = event.type.startsWith("npc.") ? "npc" : "system";
            const issuerId = event.actorKingdomId ?? (issuerType === "npc" ? "npc" : "system");
            entries.push(this.createCommandEntry({
                issuerType,
                issuerId,
                tick: currentTick,
                commandType: `event.${event.type}`,
                payload: {
                    eventId: event.id,
                    targetKingdomId: event.targetKingdomId,
                    payload: event.payload
                },
                createdAt
            }));
        }
        this.enqueueCommandEntries(entries);
    }
}
exports.GameSession = GameSession;

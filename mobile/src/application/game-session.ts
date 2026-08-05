import { buildSaveSummary } from "./save/build-save-summary";
import { Diagnostic } from "./diagnostics";
import type {
  CommandLogRepository,
  GameStateRepository,
  SaveRepository,
  SaveSlotId,
  SaveSnapshot,
  SaveSummary,
  SnapshotRepository
} from "../core/contracts/game-ports";
import { getTechnologyNode, isTechnologyAvailable, listAvailableTechnologyNodes, listTechnologyNodes, selectDefaultResearchNode, selectResearchNodeTowardsTarget } from "../core/data/technology-tree";
import { getGovernmentDefinition, getGovernmentLegitimacyCost, isGovernmentUnlocked } from "../core/data/government-types";
import { createEmptyStock } from "../core/models/economy";
import { AutomationLevel, DiplomaticRelation, ReligiousPolicy, ResourceType, TechnologyDomain, TreatyType, BuildingType, MinisterRole, MinisterPersonality, NpcArchetype } from "../core/models/enums";
import type { BudgetPriority, TaxPolicy } from "../core/models/economy";
import type { ClockService, DiplomacyResolver, EventBus, WarResolver } from "../core/contracts/services";
import type { CommandLogEntry, SnapshotReason, StateSnapshot } from "../core/models/commands";
import type { DomainEvent, EventLogEntry } from "../core/models/events";
import type { EcsState, GameState } from "../core/models/game-state";
import { buildTreatyId, sortUniqueIds } from "../core/models/identifiers";
import type { StaticWorldData } from "../core/models/static-world-data";
import { buildStateHash } from "../core/utils/state-fingerprint";
import { hashDeterministic } from "../core/utils/stable-hash";
import { cloneGameStateForSimulation } from "../core/utils/clone-game-state";
import { resolveProposal } from "../infrastructure/diplomacy/local-diplomacy-resolver";
import { TickPipeline, type SimulationSystem } from "../core/simulation/tick-pipeline";
import { parseDomainEventToLogEntry } from "../core/simulation/systems/event-log-system";
import { generateRoutineAdvice } from "../core/simulation/systems/council-system";
import { AUTOSAVE_SLOT_ID, MANUAL_SLOT_ID } from "../infrastructure/persistence/save-slots";
import { geminiService } from "./ai/gemini-service";

export interface GameSessionDeps {
  gameStateRepository: GameStateRepository;
  saveRepository: SaveRepository;
  staticWorldData: StaticWorldData;
  clock: ClockService;
  eventBus: EventBus;
  systems: SimulationSystem[];
  diplomacyResolver?: DiplomacyResolver;
  warResolver?: WarResolver;
  commandLogRepository?: CommandLogRepository;
  snapshotRepository?: SnapshotRepository;
  autosaveEveryTicks?: number;
  maxOfflineTicks?: number;
  snapshotEveryTicks?: number;
  maxSnapshots?: number;
}

type StateListener = (state: GameState) => void;

export type DiplomaticActionType = "alliance" | "non_aggression" | "peace" | "tribute" | "embargo" | "war" | "demand_vassalage";
export type ReligiousActionType = "send_missionaries";

export type RegionActionType = "invest_agriculture" | "invest_infrastructure" | "garrison" | "pacify" | "change_capital" | "colonize" | "exodus";

export interface PlayerActionResult {
  ok: boolean;
  message: string;
  chance?: number;
  cooldownUntil?: number;
}

export interface TechnologyChoice {
  id: string;
  name: string;
  domain: TechnologyDomain;
  cost: number;
  required: string[];
  status: "unlocked" | "available" | "locked" | "active";
  isGoal: boolean;
}

export interface RuntimeMetrics {
  tickMsLast: number;
  tickMsAverage: number;
  offlineCatchUpMs: number;
  offlineTicks: number;
}

// Cache de Indexação Global: Transforma buscas O(N) em O(1)
const REGION_INDEX_MAP = new Map<string, number>();

function serializeEcsState(ecs?: EcsState): any {
  if (!ecs) return undefined;
  const serialized: any = {};
  for (const key of Object.keys(ecs) as Array<keyof EcsState>) {
    const val = (ecs as any)[key];
    if (val === undefined || val === null) continue;
    if (val instanceof Float64Array || val instanceof Float32Array || val instanceof Int32Array || Array.isArray(val)) {
      serialized[key] = Array.from(val);
    } else {
      serialized[key] = val;
    }
  }
  return serialized;
}

export class GameSession {
  private readonly pipeline: TickPipeline;
  private readonly listeners = new Set<StateListener>();
  private currentState: GameState | null = null;
  private accumulatedMs = 0;
  private ticksSinceAutosave = 0;
  private ticksSinceSnapshot = 0;
  private ioQueue: Promise<void> = Promise.resolve();
  private sessionLogSeq = 0;
  private commandSequence = 0;
  private commandHeadHash = "genesis";
  private tickSamples: number[] = [];
  private isWorkerReady = false; // Bloqueio de segurança (Handshake)
  private pendingManualSaveResolver: (() => void) | null = null;
  private pendingAutosave = false;
  private runtimeMetrics: RuntimeMetrics = {
    tickMsLast: 0,
    tickMsAverage: 0,
    offlineCatchUpMs: 0,
    offlineTicks: 0
  };

  public devModeActive = false;
  public fogOfWarDisabled = false;

  constructor(private readonly deps: GameSessionDeps) {
    if (REGION_INDEX_MAP.size === 0) {
      const regionIds = Object.keys(this.deps.staticWorldData.definitions).sort();
      for (let i = 0; i < regionIds.length; i++) {
        REGION_INDEX_MAP.set(regionIds[i], i);
      }
    }
    this.pipeline = new TickPipeline(deps.systems, deps.staticWorldData);
  }

  public async resumeFromBackground(): Promise<void> {
    if (!this.currentState) return;
    
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

  private migrateLegacyState(state: GameState): void {
    if (state.meta.disastersEnabled === undefined) {
      state.meta.disastersEnabled = true;
    }
    if (state.meta.immortalityEnabled === undefined) {
      state.meta.immortalityEnabled = false;
    }
    if (!state.world.religions) {
      state.world.religions = {} as any;
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

  private hydrateECS(state: GameState) {
    if (!state || !state.ecs) return;
    const ecs = state.ecs;
    const MAX_FACTIONS = 256;
    // Deduzimos o total de regiões pela array base (ou um fallback seguro)
    const MAX_REGIONS = ecs.regionOwner ? ecs.regionOwner.length : 10000;

    // HIDRATAÇÃO DE MACROECONOMIA (Patch de Retrocompatibilidade)
    if (!ecs.factionManpowerCap) ecs.factionManpowerCap = new Float32Array(MAX_FACTIONS).fill(0);
    if (!ecs.factionManpowerReserve) ecs.factionManpowerReserve = new Float32Array(MAX_FACTIONS).fill(100);
    if (!ecs.factionGoldBalance) ecs.factionGoldBalance = new Float32Array(MAX_FACTIONS).fill(100);
    
    if (!ecs.regionManpowerYield) ecs.regionManpowerYield = new Float32Array(MAX_REGIONS).fill(0.1);
    if (!ecs.regionManpowerCap) ecs.regionManpowerCap = new Float32Array(MAX_REGIONS).fill(50);
    if (!ecs.regionGoldYield) ecs.regionGoldYield = new Float32Array(MAX_REGIONS).fill(0.5);

    // No futuro, qualquer nova array do ECS adicionada em atualizações 
    // deverá ser mapeada nesta "Alfândega" para não quebrar saves antigos.
  }

  async bootstrap(initialState: GameState): Promise<GameState> {
    await this.bootstrapCommandHead();

    this.isWorkerReady = false; // Trava a engine principal até confirmação do Worker

    const persisted = await this.deps.gameStateRepository.loadCurrent();
    const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());
    const baseState = recovered ?? initialState;
    
    this.migrateLegacyState(baseState);
    this.hydrateECS(baseState);

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
        player.administration.automation.expansion = AutomationLevel.Assisted;
      }
    }

    if (offlineResult.ticks > 0) {
      this.currentState.events = [
        this.createSessionLog(
          "Progresso offline aplicado",
          `Foram simulados ${offlineResult.ticks} ticks durante sua ausência.`,
          "info",
          now
        ),
        ...this.currentState.events
      ].slice(0, 180);

      this.recordSystemCommand("offline.progression", {
        ticksApplied: offlineResult.ticks,
        from: baseState.meta.lastClosedAt ?? baseState.meta.lastUpdatedAt,
        to: now
      });
    }

    // Notifica o sistema que um estado de jogo está pronto (seja novo ou recuperado)
    (this.deps.eventBus as any).publish({ type: "game.loaded", payload: this.currentState });

    // R1 FIX: Só persiste automaticamente se havia um save anterior.
    // Se é um jogo totalmente novo (recovered == null), aguardamos o wizard de criação
    // chamar resetToNewGame() com a região escolhida pelo jogador.
    // Isso evita que o estado padrão (spawn na Europa) seja salvo antes do jogador configurar.
    if (recovered !== null) {
      await this.deps.gameStateRepository.saveCurrent(this.currentState);
    }

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

  public markWorkerReady(): void {
    this.isWorkerReady = true;
    console.log("[GameSession] Handshake confirmado. Simulação liberada.");
  }

  start(): void {
    this.deps.clock.start((deltaMs, now) => {
      this.onClockTick(deltaMs, now);
    });
  }

  public advanceTimeForTesting(deltaMs: number, now = this.deps.clock.now()): void {
    this.processClockTick(deltaMs, now, true, 1, false);
  }

  stop(sync = false): void {
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
      safeState.ecs = serializeEcsState(this.currentState.ecs);
    }

    if (sync) {
      this.deps.gameStateRepository.saveCurrentSync(safeState);
    } else {
      this.enqueueIo(async () => {
        await this.deps.gameStateRepository.saveCurrent(safeState);
      });
    }
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);

    if (this.currentState) {
      listener(this.currentState);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  setPaused(paused: boolean): void {
    const state = this.requireState();
    state.meta.paused = paused;
    this.recordPlayerCommand("session.pause", { paused });
    this.persistCurrent();
    this.emitState(true);
  }

  setDisastersEnabled(enabled: boolean): void {
    const state = this.requireState();
    state.meta.disastersEnabled = enabled;
    this.recordPlayerCommand("session.disasters", { enabled });
    this.persistCurrent();
    this.emitState();
  }

  setOfflineProgression(enabled: boolean): void {
    const state = this.requireState();
    state.meta.offlineProgression = enabled;
    this.recordPlayerCommand("session.offline_progression", { enabled });
    this.persistCurrent();
    this.emitState();
  }

  setImmortalityEnabled(enabled: boolean): void {
    const state = this.requireState();
    state.meta.immortalityEnabled = enabled;
    this.recordPlayerCommand("session.immortality", { enabled });
    this.persistCurrent();
    this.emitState();
  }

  togglePause(): void {
    const state = this.requireState();
    this.setPaused(!state.meta.paused);
  }

  setSpeed(multiplier: number): void {
    const state = this.requireState();
    state.meta.speedMultiplier = Math.max(0.5, Math.min(100, multiplier));
    if (state.meta.speedMultiplier >= 100) {
      state.meta.tickDurationMs = 1000;
    } else {
      state.meta.tickDurationMs = 10000;
    }
    this.recordPlayerCommand("session.speed", { speedMultiplier: state.meta.speedMultiplier, tickDurationMs: state.meta.tickDurationMs });
    this.persistCurrent();
    this.emitState(true);
  }

  setExpansionAutomation(level: AutomationLevel): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.administration.automation.expansion = level;

    this.appendActionLog("Automação de expansão atualizada", `Nível definido para ${level}.`, "info");
    this.recordPlayerCommand("expansion.automation", { level });
    this.persistCurrent();
    this.emitState();
  }

  setConstructionAutomation(level: AutomationLevel): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.administration.automation.construction = level;

    this.appendActionLog("Automação de construções atualizada", `Nível definido para ${level}.`, "info");
    this.recordPlayerCommand("construction.automation", { level });
    this.persistCurrent();
    this.emitState();
  }

  setEconomyAutomation(level: AutomationLevel): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.administration.automation.economy = level;
    player.administration.automation.construction = level;

    this.appendActionLog("Automação de economia e construções atualizada", `Nível definido para ${level}.`, "info");
    this.recordPlayerCommand("economy.automation", { level });
    this.persistCurrent();
    this.emitState();
  }

  setDefenseAutomation(level: AutomationLevel): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.administration.automation.defense = level;
    player.administration.automation.expansion = level;

    this.appendActionLog("Automação de defesa e expansão atualizada", `Nível definido para ${level}.`, "info");
    this.recordPlayerCommand("defense.automation", { level });
    this.persistCurrent();
    this.emitState();
  }

  toggleGlobalAutomation(active: boolean): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const auto = player.administration.automation;

    auto.globalToggleActive = active;

    if (active) {
      auto.previousState = {
        economy: auto.economy,
        construction: auto.construction || AutomationLevel.Manual,
        defense: auto.defense,
        diplomacyReactive: auto.diplomacyReactive,
        expansion: auto.expansion,
        technology: auto.technology
      };

      auto.economy = AutomationLevel.NearlyAutomatic;
      auto.construction = AutomationLevel.NearlyAutomatic;
      auto.defense = AutomationLevel.NearlyAutomatic;
      auto.diplomacyReactive = AutomationLevel.NearlyAutomatic;
      auto.expansion = AutomationLevel.Assisted; // Migração só possui Manual ou Assistida
      auto.technology = AutomationLevel.NearlyAutomatic;
    } else if (auto.previousState) {
      Object.assign(auto, auto.previousState);
    }

    player.administration.directives = player.administration.directives ?? {};
    player.administration.directives.religious_mission = active;

    this.appendActionLog("Modo Automático Total", active ? "Ativado" : "Desativado", "info");
    this.persistCurrent();
    this.emitState();
  }

  public hireMinister(candidateId: string, targetRole?: MinisterRole): PlayerActionResult {
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
    
    if (candidate.role === MinisterRole.Wildcard) {
      if (!targetRole) return { ok: false, message: "Para lendas, selecione o cargo desejado." };
      candidate.role = targetRole; // Transmuta a Lenda para o cargo escolhido
    } else {
      targetRole = targetRole || candidate.role;
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

  public reassignMinister(currentRole: MinisterRole, targetRole: MinisterRole): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const admin = player.administration;

    if (!admin.council) return { ok: false, message: "Conselho não inicializado." };
    if (currentRole === targetRole) return { ok: false, message: "O ministro já está neste cargo." };

    const sourceMinister = admin.council[currentRole];
    if (!sourceMinister) return { ok: false, message: "Nenhum ministro no cargo de origem." };

    const targetMinister = admin.council[targetRole]; // Pode ser undefined

    // Executa a troca (Swap)
    admin.council[targetRole] = sourceMinister;
    sourceMinister.role = targetRole;
    
    if (targetMinister) {
      admin.council[currentRole] = targetMinister;
      targetMinister.role = currentRole;
    } else {
      delete admin.council[currentRole];
    }

    this.appendActionLog("Reestruturação da Corte", `${sourceMinister.name} foi remanejado para o cargo de ${targetRole}.`, "info");
    this.recordPlayerCommand("council.reassign", { ministerId: sourceMinister.id, from: currentRole, to: targetRole });
    this.persistCurrent();
    this.emitState();
    return { ok: true, message: "Cargo remanejado com sucesso!" };
  }

  public fireMinister(role: MinisterRole): PlayerActionResult {
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

  public resolveCouncilAdvice(adviceId: string, optionId: string): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const advice = player.administration.activeAdvice.find(a => a.id === adviceId);
    
    if (!advice || advice.resolved) return { ok: false, message: "Aviso inválido ou já resolvido." };
    
    const option = advice.options?.find(o => o.id === optionId);
    if (!option) return { ok: false, message: "Opção inválida." };

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

  public markAdviceRead(adviceId: string): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const advice = player.administration.activeAdvice.find(a => a.id === adviceId);
    
    if (!advice) return { ok: false, message: "Relatório não encontrado." };
    
    advice.isRead = true;
    this.persistCurrent();
    this.emitState();
    return { ok: true, message: "Relatório arquivado." };
  }

  public acceptProposal(proposalId: string): PlayerActionResult {
    this.executeSyncAction((state) => {
      const player = this.getPlayerKingdom(state);
      resolveProposal(state, proposalId, player.id, true, state.meta.lastUpdatedAt);
      return state;
    });
    return { ok: true, message: "Proposta aceita." };
  }

  public rejectProposal(proposalId: string): PlayerActionResult {
    this.executeSyncAction((state) => {
      const player = this.getPlayerKingdom(state);
      resolveProposal(state, proposalId, player.id, false, state.meta.lastUpdatedAt);
      return state;
    });
    return { ok: true, message: "Proposta recusada." };
  }

  public interactMinister(role: MinisterRole, interaction: "praise" | "threaten" | "consult" | "raise_salary" | "cut_salary"): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const minister = player.administration.council[role];

    if (!minister) return { ok: false, message: "Nenhum ministro neste cargo." };

    if (interaction === "praise") {
      const isGreedy = minister.personality === MinisterPersonality.Greedy;
      const isZealous = minister.personality === MinisterPersonality.Zealous;
      const boost = isGreedy ? 1 : isZealous ? 8 : 5;
      
      minister.loyalty = this.clamp(minister.loyalty + boost, 0, 100);
      const response = isGreedy ? "Palavras não enchem cofres, mas ele agradece." : "Ele se sente honrado pelo reconhecimento.";
      this.appendActionLog("Ministro Elogiado", `Você elogiou o trabalho de ${minister.name}. ${response}`, "info");
      
    } else if (interaction === "raise_salary") {
      minister.salary += 5;
      const boost = minister.personality === MinisterPersonality.Greedy ? 18 : minister.personality === MinisterPersonality.Zealous ? 4 : 10;
      minister.loyalty = this.clamp(minister.loyalty + boost, 0, 100);
      this.appendActionLog("Aumento Salarial", `O salário de ${minister.name} subiu para ${minister.salary} Ouro.`, "info");

    } else if (interaction === "cut_salary") {
      if (minister.salary < 5) return { ok: false, message: "O salário já está no mínimo." };
      minister.salary -= 5;
      const penalty = minister.personality === MinisterPersonality.Greedy ? -30 : minister.personality === MinisterPersonality.Zealous ? -8 : -15;
      minister.loyalty = this.clamp(minister.loyalty + penalty, 0, 100);
      this.appendActionLog("Corte Salarial", `O salário de ${minister.name} caiu para ${minister.salary} Ouro. Ele não gostou.`, "warning");
      
    } else if (interaction === "threaten") {
      minister.loyalty = this.clamp(minister.loyalty - 20, 0, 100);
      // O medo faz a corrupção administrativa cair temporariamente!
      player.administration.corruption = this.clamp(player.administration.corruption - 0.05, 0, 1); 
      this.appendActionLog("Ministro Ameaçado", `Você ameaçou ${minister.name}. A corrupção caiu pelo medo, mas a lealdade dele despencou.`, "warning");
      
    } else if (interaction === "consult") {
      const advice = generateRoutineAdvice(minister, state, player.id);
      if (advice) {
        player.administration.activeAdvice.unshift(advice);
        if (player.administration.activeAdvice.length > 15) player.administration.activeAdvice.pop();
      } else {
        return { ok: false, message: "Este conselheiro não tem sugestões no momento." };
      }
    }

    this.persistCurrent();
    this.emitState();
    return { ok: true, message: interaction === "consult" ? "Conselho adicionado aos relatórios." : "Ação realizada." };
  }

  setReligiousPolicy(policy: ReligiousPolicy): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.religion.policy = policy;

    this.appendActionLog("Diretriz Religiosa", `O império alterou sua postura oficial sobre tolerância e conversão.`, "info");
    this.recordPlayerCommand("religion.policy", { policy: policy as any });
    this.persistCurrent();
    this.emitState();
  }

  updateTaxPolicy(patch: Partial<TaxPolicy>): void {
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
    this.recordPlayerCommand("government.tax_policy", policy as unknown as Record<string, unknown>);
    this.persistCurrent();
    this.emitState();
  }

  updateBudgetPriority(patch: Partial<BudgetPriority>): void {
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
    this.recordPlayerCommand("government.budget_priority", budget as unknown as Record<string, unknown>);
    this.persistCurrent();
    this.emitState();
  }

  applyGovernmentPolicy(params: { taxPolicy: TaxPolicy; budgetPriority: BudgetPriority }): PlayerActionResult {
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
    return { ok: true, message: "Políticas aplicadas com sucesso." };
  }

  public ascendPlayerKingdom(): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.hasAscended = true;
    player.ascensionPostponed = false;
    const prevGovId = player.governmentSystemId || 'band';
    if (!player.unlockedGovernmentIds) {
      player.unlockedGovernmentIds = ['band'];
    }
    if (prevGovId && !player.unlockedGovernmentIds.includes(prevGovId)) {
      player.unlockedGovernmentIds.push(prevGovId);
    }
    if (!player.unlockedGovernmentIds.includes('monarchy')) {
      player.unlockedGovernmentIds.push('monarchy');
    }
    // Transiciona automaticamente para a Era Estatal (Monarquia Imperial).
    // Sem esta linha, a UI permanecia exibindo "ERA TRIBAL" mesmo após a Cerimônia de Ascensão.
    if (!player.governmentSystemId || player.governmentSystemId === 'band' || player.governmentSystemId === 'tribal_council' || player.governmentSystemId === 'chiefdom') {
      player.governmentSystemId = 'monarchy';
    }
    this.appendActionLog("Fundação do Estado", "Nosso povo formalizou um governo estatal centralizado. A Era Estatal começou.", "info");
    this.persistCurrent();
    this.emitState();
  }

  public postponePlayerAscension(): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.ascensionPostponed = true;

    // Registra monarchy em availableGovernmentIds:
    // O jogador escolheu ficar tribal, mas os pré-requisitos da Monarquia já foram
    // atendidos (por isso o popup disparou). Guardamos como "disponível, nunca adotado"
    // para que apareça na Mesa de Políticas com custo de PRIMEIRA adoção.
    if (!player.availableGovernmentIds) {
      player.availableGovernmentIds = [];
    }
    if (!player.availableGovernmentIds.includes('monarchy')) {
      player.availableGovernmentIds.push('monarchy');
    }

    this.appendActionLog('Tradicao Tribal Preservada', 'O soberano optou por preservar os costumes livres de nossa tribo por enquanto.', 'info');
    this.persistCurrent();
    this.emitState();
  }

  public setGovernmentSystem(id: string): { ok: boolean; message: string } {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const def = getGovernmentDefinition(id);
    if (!def) {
      return { ok: false, message: "Sistema de governo inválido." };
    }
    if (player.governmentSystemId === id) {
      return { ok: false, message: "Este já é o regime de governo ativo." };
    }

    // Inicializa listas de histórico se ainda não existem (saves antigos)
    if (!player.unlockedGovernmentIds) {
      player.unlockedGovernmentIds = [player.governmentSystemId ?? 'band'].filter(Boolean);
    }
    if (!player.availableGovernmentIds) {
      player.availableGovernmentIds = [];
    }

    // Classifica a adoção em três categorias:
    // 1. RE-ADOÇÃO: já foi o governo ativo alguma vez → só legitimidade
    // 2. DISPONÍVEL (nunca adotado, mas desbloqueado): pula pré-requisitos técnicos → ouro + legitimidade
    // 3. NOVO: pré-requisitos técnicos verificados → ouro + estabilidade + legitimidade
    const isReadoption = player.unlockedGovernmentIds.includes(id);
    const isAvailable  = !isReadoption && player.availableGovernmentIds.includes(id);
    const legitimacyCost = getGovernmentLegitimacyCost(id);
    const ecsStock = this.getPlayerEcsStock();
    const currentGold = ecsStock[ResourceType.Gold] ?? (player.economy?.stock?.[ResourceType.Gold] ?? 0);
    const currentLegitimacy = ecsStock[ResourceType.Legitimacy] ?? (player.economy?.stock?.[ResourceType.Legitimacy] ?? 0);

    if (isReadoption) {
      // ── RE-ADOÇÃO: apenas legitimidade, sem pré-requisitos técnicos ──
      if (currentLegitimacy < legitimacyCost) {
        return { ok: false, message: `Legitimidade insuficiente para restaurar este regime. Necessário: ${legitimacyCost}. Atual: ${Math.floor(currentLegitimacy)}.` };
      }
    } else {
      // ── PRIMEIRA ADOÇÃO (disponível ou novo): verifica ouro + legitimidade ──
      // Para governos em availableGovernmentIds, pré-requisitos técnicos já foram
      // validados no momento do desbloqueio — não verificamos de novo.
      if (!isAvailable) {
        const currentYear = Math.floor((state.meta?.tick ?? 0) / 12) + 1;
        if (!isGovernmentUnlocked(player, def, currentYear)) {
          return { ok: false, message: 'Os pré-requisitos para este sistema de governo não foram atendidos.' };
        }
      }
      if (currentGold < def.transitionCost.gold) {
        return { ok: false, message: `Ouro insuficiente para a reforma cívica. Necessário: ${def.transitionCost.gold} ouro. Atual: ${Math.floor(currentGold)}.` };
      }
      if (currentLegitimacy < legitimacyCost) {
        return { ok: false, message: `Legitimidade insuficiente. Necessário: ${legitimacyCost}. Atual: ${Math.floor(currentLegitimacy)}.` };
      }

      if (def.transitionCost.gold > 0) {
        this.applyCost({ [ResourceType.Gold]: def.transitionCost.gold });
        if (player.economy?.stock) {
          player.economy.stock.gold = Math.max(0, (player.economy.stock.gold ?? 0) - def.transitionCost.gold);
        }
      }
      if (def.transitionCost.stabilityPenalty > 0) {
        player.stability = Math.max(0, player.stability - def.transitionCost.stabilityPenalty);
      }
    }

    // Desconta legitimidade (em ambos os casos, exceto band que custa 0)
    if (legitimacyCost > 0) {
      this.applyCost({ [ResourceType.Legitimacy]: legitimacyCost });
      if (player.economy?.stock) {
        player.economy.stock[ResourceType.Legitimacy] = Math.max(0, currentLegitimacy - legitimacyCost);
      }
    }

    // Move o governo anterior (antecessor) e o novo para o "histórico permanente"
    const oldGovId = player.governmentSystemId;
    if (oldGovId && !player.unlockedGovernmentIds.includes(oldGovId)) {
      player.unlockedGovernmentIds.push(oldGovId);
    }
    if (!player.unlockedGovernmentIds.includes(id)) {
      player.unlockedGovernmentIds.push(id);
    }
    // Remove de availableGovernmentIds (já foi adotado — agora é histórico)
    player.availableGovernmentIds = player.availableGovernmentIds.filter(avId => avId !== id);

    // Aplica o novo governo
    player.governmentSystemId = id;

    // hasAscended é ONE-WAY STREET — nunca volta a false, mesmo ao adotar tribal
    if (def.era === 'state' && !player.hasAscended) {
      player.hasAscended = true;
      player.ascensionPostponed = false;
    }

    const actionLabel = isReadoption ? 'Restauração de Regime' : 'Reforma Cívica';
    const logMsg = isReadoption
      ? `O reino restaurou o antigo regime: ${def.name}.`
      : `Nosso reino adotou a política governamental: ${def.name}.`;
    this.appendActionLog(actionLabel, logMsg, "info");
    this.persistCurrent();
    this.emitState();
    return { ok: true, message: `Regime governamental alterado para ${def.name}.` };
  }

  /**
   * Liga/desliga uma diretriz estratégica no modo idle.
   * As diretrizes ficam armazenadas em administration.directives como Record<string, boolean>.
   */
  public updateAutomationDirective(key: string, enabled: boolean): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    if (!player.administration) return;

    if (!player.administration.directives) {
      player.administration.directives = {};
    }
    player.administration.directives[key] = enabled;

    this.appendActionLog(
      "Diretriz Estratégica",
      `Diretriz "${key}" foi ${enabled ? "ativada" : "desativada"} pelo soberano.`,
      "info",
    );
    this.recordPlayerCommand("government.directive", { key, enabled });
    this.persistCurrent();
    this.emitState();
  }

  setResearchFocus(focus: TechnologyDomain): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.technology.researchFocus = focus;
    const preferred = player.technology.researchGoalId
      ? selectResearchNodeTowardsTarget(player.technology, player.technology.researchGoalId) ??
        selectDefaultResearchNode(player.technology, focus)
      : selectDefaultResearchNode(player.technology, focus);
    player.technology.activeResearchId = preferred?.id ?? null;

    this.appendActionLog("Foco de pesquisa alterado", `A coroa direcionou os estudiosos para ${focus}.`, "info");
    this.recordPlayerCommand("technology.focus", { focus });
    this.persistCurrent();
    this.emitState();
  }

  setTechnologyAutomation(level: AutomationLevel): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.administration.automation.technology = level;

    this.appendActionLog("Automação tecnológica atualizada", `Nível definido para ${level}.`, "info");
    this.recordPlayerCommand("technology.automation", { level });
    this.persistCurrent();
    this.emitState();
  }

  setResearchTarget(technologyId: string): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const node = getTechnologyNode(technologyId);

    if (!node) {
      return { ok: false, message: "Tecnologia inválida." };
    }

    if (!isTechnologyAvailable(player.technology, technologyId)) {
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

  setResearchGoal(technologyId: string | null): PlayerActionResult {
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

    const node = getTechnologyNode(technologyId);
    if (!node) {
      return { ok: false, message: "Tecnologia inválida para meta." };
    }

    if (player.technology.unlocked.includes(technologyId)) {
      return { ok: false, message: "Essa tecnologia já foi concluída." };
    }

    player.technology.researchGoalId = technologyId;
    const nextStep = selectResearchNodeTowardsTarget(player.technology, technologyId);

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

  listTechnologyChoices(): TechnologyChoice[] {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const availableIds = new Set(listAvailableTechnologyNodes(player.technology).map((node) => node.id));
    const unlockedIds = new Set(player.technology.unlocked);
    const activeId = player.technology.activeResearchId;

    return listTechnologyNodes().map((node) => {
      let status: TechnologyChoice["status"] = "locked";

      if (unlockedIds.has(node.id)) {
        status = "unlocked";
      } else if (availableIds.has(node.id)) {
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

  executeDiplomaticAction(targetKingdomId: string, actionType: DiplomaticActionType): PlayerActionResult {
    Diagnostic.trace("CMD-DIPLO", `Intenção de Ação Diplomática: ${actionType} contra ${targetKingdomId}`);
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

    const isUnilateral = actionType === "war" || actionType === "embargo";
    const roll = this.nextRandom(state);
    const success = isUnilateral ? true : roll <= chance;

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
        // Garante reflexo visual imediato e indiscutível de hostilidade na UI e no ECS
        const relPlayer = state.kingdoms[player.id]?.diplomacy?.relations?.[target.id];
        const relTarget = state.kingdoms[target.id]?.diplomacy?.relations?.[player.id];
        if (relPlayer) relPlayer.status = DiplomaticRelation.Hostile;
        if (relTarget) relTarget.status = DiplomaticRelation.Hostile;
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
        } else {
          // Fallback para a lógica antiga se o ECS não estiver presente
          const tribute = this.round(target.economy.stock.gold * 0.08);
          target.economy.stock.gold = Math.max(0, target.economy.stock.gold - tribute);
          player.economy.stock.gold = this.round(player.economy.stock.gold + tribute);
        }
      }

      this.appendActionLog(
        "Ação diplomática bem-sucedida",
        `${player.name} executou ${actionType} com ${target.name}.`,
        actionType === "war" ? "critical" : "info"
      );
    } else {
      player.stability = this.round(this.clamp(player.stability - 0.4, 0, 100));
      this.appendActionLog(
        "Ação diplomática recusada",
        `${target.name} rejeitou ${actionType}.`,
        "warning"
      );
    }

    this.recordPlayerCommand("diplomacy.action", {
      targetKingdomId,
      actionType,
      chance: this.round(chance, 4),
      roll: this.round(roll, 4),
      success
    });
    this.executeSyncAction((_) => state);

    return {
      ok: success,
      message: success ? "Ação executada com sucesso." : "Ação falhou na negociação.",
      chance: this.round(chance, 4),
      cooldownUntil: now + cooldownMs
    };
  }

  async sendPlayerChatMessage(targetKingdomId: string, message: string): Promise<string> {
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
        status: DiplomaticRelation.Neutral,
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
      const response = await geminiService.chatWithSovereign(
        ruler.name,
        ruler.title || "Soberano",
        ruler.cultureId || "unknown",
        ruler.traits || [],
        ruler.stats || {},
        target.npc?.personality || {},
        relation,
        message,
        relation.chatHistory
      );

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
            this.appendActionLog(
              "Guerra declarada",
              `${ruler.name} declarou guerra a ${player.name} por meio de diplomacia LLM.`,
              "critical"
            );
          }
        } else if (response.action === 'MAKE_PEACE') {
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
          this.appendActionLog(
            "Tratado de Paz assinado",
            `Paz estabelecida entre ${player.name} e ${ruler.name} via diplomacia LLM.`,
            "info"
          );
        } else if (response.action === 'MAKE_COOPERATION_AGREEMENT') {
          if (this.deps.diplomacyResolver) {
            state = this.deps.diplomacyResolver.applyDecision(state, {
              actorKingdomId: target.id,
              actionType: "oferta_alianca",
              priority: 1,
              targetKingdomId: player.id,
              payload: { source: "llm_chat" }
            });
          }
          this.appendActionLog(
            "Acordo de Cooperação assinado",
            `Acordo diplomático selado entre ${player.name} e ${ruler.name} via diplomacia LLM.`,
            "info"
          );
        }
      }

      this.currentState = state;
      this.persistCurrent();
      this.emitState();

      return response.dialogue;
    } catch (error) {
      console.error('[GameSession] Error in sendPlayerChatMessage:', error);
      throw error;
    }
  }

  public getBuildingConfig(building: BuildingType): { label: string; effectStr: string; cost: Partial<Record<ResourceType, number>> } {
    switch (building) {
      case BuildingType.Market:
        return { label: "Mercado", effectStr: "+25% Ouro local", cost: { [ResourceType.Gold]: 300, [ResourceType.Wood]: 150 } };
      case BuildingType.Barracks:
        return { label: "Quartel", effectStr: "+25% Recrutas (Manpower)", cost: { [ResourceType.Gold]: 200, [ResourceType.Iron]: 100, [ResourceType.Wood]: 100 } };
      case BuildingType.Monastery:
        return { label: "Mosteiro", effectStr: "+Fé passiva e Proteção contra Cismas", cost: { [ResourceType.Gold]: 250, [ResourceType.Wood]: 200, [ResourceType.Faith]: 50 } };
      case BuildingType.University:
        return { label: "Universidade", effectStr: "Acelera Pesquisa Nacional", cost: { [ResourceType.Gold]: 400, [ResourceType.Wood]: 200 } };
      case BuildingType.Fortress:
        return { label: "Fortaleza", effectStr: "Mitiga Devastação e Instabilidade", cost: { [ResourceType.Gold]: 500, [ResourceType.Wood]: 300, [ResourceType.Iron]: 200 } };
    }
  }

  public executeBuildStructure(regionId: string, buildingType: BuildingType): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const region = state.world.regions[regionId];

    if (!region || region.ownerId !== player.id) return { ok: false, message: "Você só pode construir em seus próprios territórios." };
    if (region.construction) return { ok: false, message: "Já existe uma construção em andamento nesta região." };
    
    region.buildings = region.buildings || [];
    if (region.buildings.length >= 2) return { ok: false, message: "Esta região já atingiu o limite de infraestruturas (2)." };
    if (region.buildings.includes(buildingType)) return { ok: false, message: "Esta estrutura já existe nesta região." };

    const config = this.getBuildingConfig(buildingType);
    if (!this.canAfford(config.cost)) return { ok: false, message: "Recursos insuficientes para a construção." };

    this.applyCost(config.cost);

    let targetTicks = 10;
    switch (buildingType) {
      case BuildingType.Market:
        targetTicks = 10;
        break;
      case BuildingType.Barracks:
        targetTicks = 12;
        break;
      case BuildingType.Monastery:
        targetTicks = 15;
        break;
      case BuildingType.Fortress:
        targetTicks = 20;
        break;
      case BuildingType.University:
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

  executeRegionAction(regionId: string, actionType: RegionActionType): PlayerActionResult {
    Diagnostic.trace("CMD-REGION", `Intenção de Ação Regional: ${actionType} em ${regionId}`);
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
          if (state.world.regions[rId].ownerId === player.id) ownedCount++;
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
        } as any);
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
        } as any);
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

  async saveManual(slotId: SaveSlotId): Promise<void> {
    if (!this.currentState) {
      return;
    }
    
    return new Promise<void>((resolve) => {
      // No Mobile (síncrono), podemos salvar instantaneamente sem risco de race conditions
      this.doCommitManualSave(resolve, slotId).catch(console.error);
    });
  }

  async listSaveSlots(): Promise<SaveSummary[]> {
    return this.deps.saveRepository.listSlots();
  }

  async peekSaveSlot(slotId: SaveSlotId): Promise<GameState | null> {
    // Espia os dados do save no banco sem alterar a sessão atual. Útil para a UI montar modais de confirmação pré-load.
    const snapshot = await this.deps.saveRepository.loadFromSlot(slotId);
    return snapshot ? snapshot.state : null;
  }

  async loadSlot(slotId: SaveSlotId): Promise<GameState> {
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
    (this.deps.eventBus as any).publish({ type: "game.loaded", payload: this.currentState });

    this.emitState(true);
    
    // No Mobile, como roda síncrono, a simulação já está liberada
    this.markWorkerReady();
    
    return this.currentState;
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    await this.deps.saveRepository.deleteSlot(slotId);
  }

  async clearCurrentState(): Promise<void> {
    await this.deps.gameStateRepository.clearCurrent();
  }

  async resetToNewGame(initialState: GameState): Promise<void> {
    this.stop();
    await this.clearCurrentState();
    
    // Sobrescreve completamente o estado atual na memória
    this.currentState = structuredClone(initialState);
    this.currentState.meta.lastUpdatedAt = this.deps.clock.now();
    this.currentState.meta.paused = true;
    
    // Salva o novo jogo por cima do save automático atual para evitar carregar o antigo
    await this.deps.gameStateRepository.saveCurrent(this.currentState);
    
    // Notifica a interface para recarregar
    (this.deps.eventBus as any).publish({ type: "game.loaded", payload: this.currentState });
    this.emitState(true);
    
    this.start();
  }

  async reloadFromDisk(): Promise<boolean> {
    const persisted = await this.deps.gameStateRepository.loadCurrent();
    if (persisted) {
      this.stop();
      this.currentState = persisted;
      this.migrateLegacyState(this.currentState);
      this.currentState.meta.lastUpdatedAt = this.deps.clock.now();
      this.currentState.meta.paused = true;
      (this.deps.eventBus as any).publish({ type: "game.loaded", payload: this.currentState });
      this.emitState();
      this.start();
      return true;
    }
    return false;
  }

  async forceSaveToDisk(): Promise<void> {
    if (this.currentState) {
      await this.deps.gameStateRepository.saveCurrent(this.currentState);
    }
  }

  public async triggerAutosave(): Promise<void> {
    if (!this.currentState) return;
    this.doCommitAutosave();
    const safeState = structuredClone(this.currentState);
    if (safeState.ecs) {
      safeState.ecs = serializeEcsState(this.currentState.ecs);
    }
    this.enqueueIo(async () => {
      await this.deps.gameStateRepository.saveCurrent(safeState);
    });
    await this.ioQueue;
  }

  public toggleFogOfWar(): void {
    this.fogOfWarDisabled = !this.fogOfWarDisabled;
    this.emitState(true);
  }

  public addResourcesDev(resource: string): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    if (!player) return;

    const capitalRegionId = player.capitalRegionId;
    const regionIndex = REGION_INDEX_MAP.get(capitalRegionId);

    if (regionIndex !== undefined && state.ecs) {
      if (resource === "gold") {
        state.ecs.gold[regionIndex] = (state.ecs.gold[regionIndex] || 0) + 1000;
        player.economy.stock.gold = (player.economy.stock.gold || 0) + 1000;
      } else if (resource === "wood") {
        state.ecs.wood[regionIndex] = (state.ecs.wood[regionIndex] || 0) + 1000;
        player.economy.stock.wood = (player.economy.stock.wood || 0) + 1000;
      } else if (resource === "iron") {
        state.ecs.iron[regionIndex] = (state.ecs.iron[regionIndex] || 0) + 1000;
        player.economy.stock.iron = (player.economy.stock.iron || 0) + 1000;
      } else if (resource === "food") {
        state.ecs.food[regionIndex] = (state.ecs.food[regionIndex] || 0) + 1000;
        player.economy.stock.food = (player.economy.stock.food || 0) + 1000;
      } else if (resource === "faith") {
        state.ecs.faith[regionIndex] = (state.ecs.faith[regionIndex] || 0) + 1000;
        player.economy.stock.faith = (player.economy.stock.faith || 0) + 1000;
      } else if (resource === "legitimacy") {
        state.ecs.legitimacy[regionIndex] = (state.ecs.legitimacy[regionIndex] || 0) + 1000;
        player.economy.stock.legitimacy = (player.economy.stock.legitimacy || 0) + 1000;
      } else if (resource === "manpower") {
        state.ecs.manpower[regionIndex] = (state.ecs.manpower[regionIndex] || 0) + 1000;
        player.military.reserveManpower = (player.military.reserveManpower || 0) + 1000;
      } else if (resource === "wealth") {
        if (player.rulerId && state.world.characters && state.world.characters[player.rulerId]) {
          state.world.characters[player.rulerId].personalWealth = (state.world.characters[player.rulerId].personalWealth || 0) + 1000;
        }
      }
    }
    this.emitState();
  }

  public completeResearchDev(): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    if (!player) return;

    const activeId = player.technology.activeResearchId;
    if (activeId) {
      const activeNode = getTechnologyNode(activeId);
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

  public unlockAllTechnologiesDev(): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    if (!player) return;

    const allNodes = listTechnologyNodes();
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

  public getNpcAiDecisionsDev(): any[] {
    const state = this.requireState();
    const npcs = Object.values(state.kingdoms).filter(k => !k.isPlayer && k.id !== 'k_nature');
    
    return npcs.map(npc => {
      let focus = "Expandir";
      let targetName = "Nenhum";
      let reason = "Ambição e busca por recursos";
      
      const archetype = npc.npc?.personality.archetype;
      if (archetype === NpcArchetype.Expansionist) {
        focus = "Expandir";
        reason = "Apetite territorial de " + npc.name;
      } else if (archetype === NpcArchetype.Defensive) {
        focus = "Construir Exército";
        reason = "Garantir a soberania das fronteiras";
      } else if (archetype === NpcArchetype.Mercantile) {
        focus = "Rotas Comerciais";
        reason = "Acumular ouro e expandir a influência comercial";
      } else if (archetype === NpcArchetype.Diplomatic) {
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
      } else {
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

  public assumeControlOfKingdom(targetKingdomId: string): void {
    const state = this.requireState();
    const oldPlayerId = Object.keys(state.kingdoms).find(id => state.kingdoms[id].isPlayer);
    if (!oldPlayerId || oldPlayerId === targetKingdomId) return;

    const oldPlayer = state.kingdoms[oldPlayerId];
    const newPlayer = state.kingdoms[targetKingdomId];
    if (!newPlayer) return;

    oldPlayer.isPlayer = false;
    newPlayer.isPlayer = true;

    oldPlayer.npc = {
      personality: {
        archetype: NpcArchetype.Defensive,
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

  public autoplayEnabled = false;
  private preAutoplayPlayerId: string | null = null;
  private originalSpeedMultiplier = 0.5;

  public toggleAutoplay(): void {
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
            archetype: NpcArchetype.Expansionist,
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
    } else {
      if (this.preAutoplayPlayerId && state.kingdoms[this.preAutoplayPlayerId]) {
        const player = state.kingdoms[this.preAutoplayPlayerId];
        player.isPlayer = true;
        delete player.npc;
      }
      this.setSpeed(this.originalSpeedMultiplier);
    }
    this.emitState();
  }

  public getDiplomacyMatrix(): any[] {
    const state = this.requireState();
    const kingdoms = Object.values(state.kingdoms).filter(k => k.id !== 'k_nature');
    const matrix: any[] = [];
    
    for (const k1 of kingdoms) {
      for (const k2 of kingdoms) {
        if (k1.id === k2.id) continue;
        const rel = k1.diplomacy.relations[k2.id];
        matrix.push({
          fromId: k1.id,
          fromName: k1.name,
          toId: k2.id,
          toName: k2.name,
          trust: rel?.score.trust ?? 0,
          fear: rel?.score.fear ?? 0,
          rivalry: rel?.score.rivalry ?? 0,
          status: rel?.status ?? DiplomaticRelation.Neutral,
        });
      }
    }
    return matrix;
  }

  public simulateCombatDev(kingdom1Id: string, kingdom2Id: string): {
    winnerName: string;
    loserName: string;
    casualties1: number;
    casualties2: number;
    predictedOutcome: string;
  } | null {
    const state = this.requireState();
    const k1 = state.kingdoms[kingdom1Id];
    const k2 = state.kingdoms[kingdom2Id];
    if (!k1 || !k2) return null;

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
      } else {
        predictedOutcome = `Vitória tática de ${k1.name} após um confronto equilibrado e sangrento.`;
      }
    } else if (power2 > power1) {
      winnerName = k2.name;
      loserName = k1.name;
      const diffRatio = power2 / Math.max(1, power1);
      if (diffRatio > 2.0) {
        predictedOutcome = `Vitória esmagadora de ${k2.name}. As forças de ${k1.name} serão esmagadas sem dificuldade.`;
      } else {
        predictedOutcome = `Vitória tática de ${k2.name} após um combate disputado.`;
      }
    } else {
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

  async clearAllSaves(): Promise<void> {
    const slots = await this.deps.saveRepository.listSlots();
    for (const slot of slots) {
      await this.deps.saveRepository.deleteSlot(slot.slotId);
    }
  }

  getState(): GameState {
    return this.requireState();
  }

  changeStateReligion(newFaithId: string): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const faithDef = state.world.religions[newFaithId]; // Lê do mundo vivo e não do arquivo estático

    if (!faithDef) {
      return { ok: false, message: "Fé desconhecida." };
    }

    if (player.religion.stateFaith === newFaithId) {
      return { ok: false, message: "O império já segue esta fé como religião oficial." };
    }

    const cost = { [ResourceType.Legitimacy]: 40 };
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

  public foundCustomReligion(params: {
    name: string;
    deityName: string;
    deityDescription: string;
    color: string;
    tenets: string[];
  }): PlayerActionResult {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);

    const cost = { [ResourceType.Faith]: 1000, [ResourceType.Legitimacy]: 50 };
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
      if (!tenet) return { ok: false, message: `Dogma inválido: ${tId}` };
      budgetUsed += tenet.cost;
    }
    if (budgetUsed > 100) return { ok: false, message: "Orçamento de 100 Pontos de Doutrina excedido." };

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

  executeReligiousAction(targetKingdomId: string, actionType: ReligiousActionType): PlayerActionResult {
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

      this.appendActionLog(
        "Missionários enviados",
        `${player.name} iniciou campanha missionária em ${target.name}.`,
        "info"
      );
    } else {
      player.stability = this.round(this.clamp(player.stability - 0.25, 0, 100));
      this.appendActionLog(
        "Campanha missionária bloqueada",
        `${target.name} reprimiu a tentativa de infiltração religiosa.`,
        "warning"
      );
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

  getStaticWorldData(): StaticWorldData {
    return this.deps.staticWorldData;
  }

  getRuntimeMetrics(): RuntimeMetrics {
    return { ...this.runtimeMetrics };
  }

  async flushPersistence(): Promise<void> {
    await this.ioQueue;
  }

  public updateEcsState(ecsState: EcsState): void {
    const state = this.currentState;
    if (state) {
      state.ecs = ecsState;

      // AUTO-DESTRAVE: O Worker provou estar vivo. Libera a simulação do F5/Load congelado!
      if (!this.isWorkerReady) {
        this.markWorkerReady();
      }

      // COMMIT ATÔMICO: Transação segura no exato frame em que a matriz fresca chegou.
      if ((this as any).pendingManualSave) {
        this.doCommitManualSave((this as any).pendingManualSave.resolve, (this as any).pendingManualSave.slotId).catch(console.error);
        (this as any).pendingManualSave = null;
      }
      if (this.pendingAutosave) {
        this.doCommitAutosave();
        this.pendingAutosave = false;
      }
    }
  }

  private async doCommitManualSave(resolve: () => void, slotId: SaveSlotId): Promise<void> {
    const snapshot = this.buildSaveSlotSnapshot(slotId);
    await this.deps.saveRepository.saveToSlot(snapshot);
    this.recordPlayerCommand("save.manual", { slotId });
    this.captureSnapshot("manual");
    resolve();
  }

  private doCommitAutosave(): void {
    // 1. Injeta o feedback visual na sessão ANTES de clonar, para que a mensagem já vá no arquivo do save.
    this.appendActionLog("Progresso Registrado", "Os escribas reais salvaram o estado do império nos arquivos permanentes.", "info");
    
    // 2. Notifica a UI via EventBus (Permite que a interface mostre um ícone de "Salvando..." animado no canto da tela, se desejar)
    this.deps.eventBus.publish({
      type: "game.autosaved",
      payload: { tick: this.currentState?.meta.tick ?? 0 }
    } as any);

    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.enqueueIo(async () => {
      await this.deps.saveRepository.saveToSlot(snapshot);
    });
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });
    this.captureSnapshot("autosave");
  }

  private getPlayerKingdom(state: GameState): GameState["kingdoms"][string] {
    const player = Object.keys(state.kingdoms)
      .sort()
      .map((kingdomId) => state.kingdoms[kingdomId])
      .find((kingdom) => kingdom.isPlayer);

    if (!player) {
      throw new Error("Reino do jogador não encontrado.");
    }

    return player;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private monotonicNow(): number {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }

    return Date.now();
  }

  public getKingdomMetrics(kingdomId: string): { totalPopulation: number, controlledRegions: number } {
    const state = this.requireState();
    let totalPopulation = 0;
    
    const kingdomRegionIndices = Object.values(state.world.regions)
      .filter((r) => r.ownerId === kingdomId)
      .map((r) => REGION_INDEX_MAP.get(r.regionId))
      .filter((index): index is number => index !== undefined);

    // Usa o ECS se o ECS worker estiver atualizando o estado ativamente (manpower cresce, population cresce)
    // Como no Mobile estamos em V1 (Sem worker nativo de ECS ainda), usamos a lógica principal:
    const kingdom = state.kingdoms[kingdomId];
    if (kingdom) {
       totalPopulation = kingdom.population.total;
    } else if (state.ecs && state.ecs.populationTotal) {
      for (const index of kingdomRegionIndices) {
        totalPopulation += state.ecs.populationTotal[index] ?? 0;
      }
    }

    return { totalPopulation, controlledRegions: kingdomRegionIndices.length };
  }

  public getKingdomControlledRegions(kingdomId: string): string[] {
    const state = this.requireState();
    return Object.values(state.world.regions)
      .filter((r) => r.ownerId === kingdomId)
      .map(r => r.regionId);
  }

  public setTaxRate(newRate: number): void {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    player.economy.taxPolicy.baseRate = newRate;
    this.recordPlayerCommand("economy.set_tax", { rate: newRate });
    this.persistCurrent();
    this.emitState();
  }


  private registerTickTiming(elapsedMs: number): void {
    this.tickSamples.push(elapsedMs);

    if (this.tickSamples.length > 60) {
      this.tickSamples.shift();
    }

    const total = this.tickSamples.reduce((sum, value) => sum + value, 0);
    const average = this.tickSamples.length === 0 ? 0 : total / this.tickSamples.length;

    this.runtimeMetrics.tickMsLast = this.round(elapsedMs, 3);
    this.runtimeMetrics.tickMsAverage = this.round(average, 3);
  }

  private nextRandom(state: GameState): number {
    state.randomSeed = (Math.imul(state.randomSeed, 1664525) + 1013904223) >>> 0;
    return state.randomSeed / 0x100000000;
  }

  private getKingdomCapitalIndex(state: GameState, kingdomId: string): number {
    const kingdom = state.kingdoms[kingdomId];
    if (!kingdom) {
      return -1;
    }
    return REGION_INDEX_MAP.get(kingdom.capitalRegionId) ?? -1;
  }

  private getKingdomTotalEcsStock(state: GameState, kingdomId: string): Record<ResourceType, number> {
    const emptyStock = createEmptyStock();
    if (!state.ecs) {
      return emptyStock;
    }

    const getFactionId = (kId: string) => {
      if (kId === "k_nature") return -1;
      if (kId === "k_player") return 1;
      if (kId.startsWith("k_npc_")) return parseInt(kId.replace("k_npc_", ""), 10) + 1;
      return -1;
    };
    
    const factionId = getFactionId(kingdomId);
    const totals = emptyStock;
    
    // ACTION 2: Leitura Híbrida (Ponte ECS Híbrida)
    
    // Ouro: Extraído exclusivamente da fonte da verdade do motor ECS (MacroeconomySystem)
    if (factionId !== -1) {
      totals.gold = state.ecs.factionGoldBalance[factionId] ?? 0;
    }

    // Outros Recursos: Extraídos do motor OO (EconomySystem) mantido ativo
    const kingdom = state.kingdoms[kingdomId];
    if (kingdom) {
      totals.food = kingdom.economy.stock[ResourceType.Food] ?? 0;
      totals.wood = kingdom.economy.stock[ResourceType.Wood] ?? 0;
      totals.iron = kingdom.economy.stock[ResourceType.Iron] ?? 0;
      totals.faith = kingdom.economy.stock[ResourceType.Faith] ?? 0;
      totals.legitimacy = kingdom.economy.stock[ResourceType.Legitimacy] ?? 0;
    }

    return totals;
  }

  /**
   * Ponte ECS→UI: Agrega os estoques reais do ECS para o reino do jogador.
   * Mantém a UI desacoplada da alocação de memória do motor.
   * Chamado pelo syncInterval do GameProvider a 4 FPS.
   */
  public getPlayerEcsStock(): Record<ResourceType, number> {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    return this.getKingdomTotalEcsStock(state, player.id);
  }

  public canAfford(cost: Partial<Record<ResourceType, number>>): boolean {
    const state = this.requireState();
    const player = this.getPlayerKingdom(state);
    const playerEcsStock = this.getKingdomTotalEcsStock(state, player.id);

    return Object.entries(cost).every(([resource, value]) => {
      const key = resource as ResourceType;
      const required = value ?? 0;
      return playerEcsStock[key] >= required;
    });
  }

  private applyCost(cost: Partial<Record<ResourceType, number>>): void {
    // Esta é uma atualização otimista que será reconciliada pelo worker no próximo tick.
    const state = this.requireState();
    if (!state.ecs) {
      return;
    }

    const player = this.getPlayerKingdom(state);
    const capitalIndex = this.getKingdomCapitalIndex(state, player.id);

    const getFactionId = (kId: string) => {
      if (kId === "k_nature") return -1;
      if (kId === "k_player") return 1;
      if (kId.startsWith("k_npc_")) return parseInt(kId.replace("k_npc_", ""), 10) + 1;
      return -1;
    };
    const factionId = getFactionId(player.id);

    if (capitalIndex === -1) {
      console.error(`[applyCost] Não foi possível encontrar o índice da capital para o jogador ${player.id}`);
      return;
    }

    for (const [resource, value] of Object.entries(cost)) {
      const key = resource as ResourceType;
      const required = value ?? 0;
      if (key === ResourceType.Gold && factionId !== -1 && state.ecs.factionGoldBalance) {
        state.ecs.factionGoldBalance[factionId] = this.round(
          Math.max(0, (state.ecs.factionGoldBalance[factionId] ?? 0) - required)
        );
      }
      const resourceArray = state.ecs[key];
      if (resourceArray && capitalIndex < resourceArray.length) {
        resourceArray[capitalIndex] = this.round(Math.max(0, resourceArray[capitalIndex] - required));
      }
    }
  }

  private appendActionLog(title: string, details: string, severity: EventLogEntry["severity"]): void {
    const state = this.requireState();
    const entry = this.createSessionLog(title, details, severity, this.deps.clock.now());
    state.events = [entry, ...state.events].slice(0, 180);
  }

  public getDiplomaticConfig(
    state: GameState,
    playerId: string,
    targetId: string,
    actionType: DiplomaticActionType
  ): {
    cost: Partial<Record<ResourceType, number>>;
    chance: number;
    cooldownMs: number;
    actionPt: string;
  } {
    const relation = state.kingdoms[playerId].diplomacy.relations[targetId];
    const trust = relation?.score.trust ?? 0.3;
    const rivalry = relation?.score.rivalry ?? 0.3;
    const fear = relation?.score.fear ?? 0.2;
    const grievance = relation?.grievance ?? 0.2;

    const base = {
      cost: {} as Partial<Record<ResourceType, number>>,
      chance: 0.55,
      cooldownMs: 45_000,
      actionPt: "oferta_alianca"
    };

    switch (actionType) {
      case "alliance":
        base.cost = {
          [ResourceType.Gold]: 18,
          [ResourceType.Legitimacy]: 4
        };
        base.chance = this.clamp(0.2 + trust * 0.55 + (1 - rivalry) * 0.25, 0.08, 0.9);
        base.cooldownMs = 90_000;
        base.actionPt = "oferta_alianca";
        break;
      case "non_aggression":
        base.cost = {
          [ResourceType.Gold]: 12,
          [ResourceType.Legitimacy]: 2
        };
        base.chance = this.clamp(0.25 + trust * 0.45 + (1 - grievance) * 0.2, 0.1, 0.92);
        base.cooldownMs = 75_000;
        base.actionPt = "pacto_nao_agressao";
        break;
      case "peace":
        base.cost = {
          [ResourceType.Gold]: 20
        };
        base.chance = this.clamp(0.3 + fear * 0.25 + trust * 0.2 + grievance * 0.15, 0.15, 0.92);
        base.cooldownMs = 55_000;
        base.actionPt = "proposta_paz";
        break;
      case "tribute":
        base.cost = {
          [ResourceType.Legitimacy]: 3,
          [ResourceType.Gold]: 10
        };
        base.chance = this.clamp(0.2 + fear * 0.55 + (1 - trust) * 0.2, 0.06, 0.85);
        base.cooldownMs = 80_000;
        base.actionPt = "exigir_tributo";
        break;
      case "embargo":
        base.cost = {
          [ResourceType.Gold]: 14
        };
        base.chance = this.clamp(0.28 + rivalry * 0.35 + (1 - trust) * 0.2, 0.12, 0.88);
        base.cooldownMs = 65_000;
        base.actionPt = "embargo_comercial";
        break;
      case "demand_vassalage":
        base.cost = {
          [ResourceType.Legitimacy]: 15,
          [ResourceType.Gold]: 50
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
          [ResourceType.Gold]: 35,
          [ResourceType.Food]: 50,
          [ResourceType.Iron]: 18,
          [ResourceType.Legitimacy]: 5
        };
        base.chance = this.clamp(0.18 + risk * 0.7 + rivalry * 0.08, 0.08, 0.95);
        base.cooldownMs = 95_000;
        base.actionPt = "declarar_guerra";
        break;
      }
    }

    return base;
  }

  private resolvePlayerPeace(state: GameState, leftId: string, rightId: string): void {
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
        leftRelation.status = DiplomaticRelation.Truce;
      }
      if (rightRelation) {
        rightRelation.status = DiplomaticRelation.Truce;
      }

      const signedAt = state.meta.lastUpdatedAt;
      const parties = sortUniqueIds([leftId, rightId]);
      const treaty = {
        id: buildTreatyId(TreatyType.Peace, parties, signedAt),
        type: TreatyType.Peace,
        parties,
        signedAt,
        expiresAt: signedAt + 60_000,
        terms: { borderFreeze: true }
      };

      state.kingdoms[leftId].diplomacy.treaties.push(treaty);
      state.kingdoms[rightId].diplomacy.treaties.push(treaty);
    }
  }

  public getRegionActionConfig(actionType: RegionActionType): {
    label: string;
    cooldownMs: number;
    cost: Partial<Record<ResourceType, number>>;
  } {
    switch (actionType) {
      case "invest_agriculture":
        return {
          label: "Investimento em agricultura",
          cooldownMs: 42_000,
          cost: {
            [ResourceType.Gold]: 28,
            [ResourceType.Wood]: 22
          }
        };
      case "invest_infrastructure":
        return {
          label: "Investimento em infraestrutura",
          cooldownMs: 50_000,
          cost: {
            [ResourceType.Gold]: 40,
            [ResourceType.Wood]: 30,
            [ResourceType.Iron]: 10
          }
        };
      case "garrison":
        return {
          label: "Reforço de guarnição",
          cooldownMs: 35_000,
          cost: {
            [ResourceType.Gold]: 35,
            [ResourceType.Food]: 20,
            [ResourceType.Iron]: 18
          }
        };
      case "pacify":
        return {
          label: "Pacificação administrativa",
          cooldownMs: 40_000,
          cost: {
            [ResourceType.Gold]: 24,
            [ResourceType.Faith]: 16,
            [ResourceType.Legitimacy]: 3
          }
        };
      case "change_capital":
        return {
          label: "Transferência de sede governamental",
          cooldownMs: 60_000,
          cost: {
            [ResourceType.Gold]: 150,
            [ResourceType.Legitimacy]: 10
          }
        };
      case "exodus":
        return {
          label: "Êxodo Nômade",
          cooldownMs: 15_000,
          cost: {
            [ResourceType.Food]: 200
          }
        };
      case "colonize":
        return {
          label: "Fundar Colônia",
          cooldownMs: 15_000,
          cost: {
            [ResourceType.Gold]: 20,
            [ResourceType.Food]: 50
          }
        };
    }
  }

  private checkCivicUnlocks(state: GameState): void {
    const player = this.getPlayerKingdom(state);
    if (!player) return;
    const pop = player.population?.total ?? 0;
    if (!player.unlockedGovernmentIds) {
      player.unlockedGovernmentIds = [player.governmentSystemId ?? 'band'].filter(Boolean);
    }
    if (!player.availableGovernmentIds) {
      player.availableGovernmentIds = [];
    }

    if (
      pop >= 200 &&
      !player.unlockedGovernmentIds.includes('tribal_council') &&
      !player.availableGovernmentIds.includes('tribal_council')
    ) {
      player.availableGovernmentIds.push('tribal_council');
      this.appendActionLog(
        "Reforma Cívica Disponível",
        "Nossa tribo atingiu 200 almas: o 'Conselho Tribal' agora pode ser adotado na Mesa de Políticas da aba Governo.",
        "info"
      );
    }

    if (
      pop >= 500 &&
      !player.unlockedGovernmentIds.includes('chiefdom') &&
      !player.availableGovernmentIds.includes('chiefdom')
    ) {
      player.availableGovernmentIds.push('chiefdom');
      this.appendActionLog(
        "Reforma Cívica Disponível",
        "Com 500 almas, nossa demografia agora comporta a liderança centralizada de um 'Cacicado' na Mesa de Políticas.",
        "info"
      );
    }
  }

  private onClockTick(deltaMs: number, now: number): void {
    this.processClockTick(deltaMs, now, false);
  }

  private processClockTick(
    deltaMs: number,
    now: number,
    ignorePause: boolean,
    speedMultiplierOverride?: number,
    applySafetyClamp = true
  ): void {
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

  private isPumping = false;
  private pumpSimulationQueue(): void {
    if (this.isPumping || !this.currentState || this.currentState.meta.paused) return;
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
        this.checkCivicUnlocks(result.state);

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
        Diagnostic.warn("SYS-PERF", "Dívida de CPU massiva detectada. Descartando backlog de simulação.");
        this.accumulatedMs = 1000;
      }

      if (progressed) {
        const ecsBackup = this.currentState.ecs;
        this.currentState = cloneGameStateForSimulation(this.currentState);
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
    } finally {
      this.isPumping = false;
    }
  }

  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    this.doCommitAutosave();
  }

  private buildSaveSlotSnapshot(slotId: SaveSlotId): SaveSnapshot {
    const state = this.requireState();
    const now = this.deps.clock.now();

    // Cópia Rasa O(1) do estado. Elimina o travamento de 1500ms na hora do Autosave!
    const stateCopy: GameState = {
      ...state,
      meta: { ...state.meta }
    };

    // Converte os TypedArrays do ECS para Arrays normais sem truncar nenhuma propriedade do ECS
    if (state.ecs) {
      stateCopy.ecs = serializeEcsState(state.ecs);
    }

    return {
      summary: buildSaveSummary(slotId, stateCopy, now),
      state: stateCopy
    };
  }

  private buildStateSnapshot(reason: SnapshotReason, savedAt = this.deps.clock.now()): StateSnapshot {
    const state = this.requireState();

    return {
      id: `snapshot:${state.meta.tick}:${savedAt}:${reason}`,
      tick: state.meta.tick,
      savedAt,
      reason,
      commandSequence: this.commandSequence,
      commandHash: this.commandHeadHash,
      stateHash: buildStateHash(state),
      state: structuredClone(state)
    };
  }

  public getReligiousActionConfig(
    actorKingdomId: string,
    targetKingdomId: string,
    _actionType: ReligiousActionType
  ): {
    cooldownKey: string;
    cooldownMs: number;
    cost: Partial<Record<ResourceType, number>>;
    chance: number;
    pressureGain: number;
  } {
    const state = this.requireState();
    const actor = state.kingdoms[actorKingdomId];
    const target = state.kingdoms[targetKingdomId];

    const actorMissionaryPower = this.clamp(actor.religion.authority * 0.5 + actor.religion.missionaryBudget * 0.5, 0, 1);
    const targetResistance = this.clamp(target.religion.authority * 0.45 + target.religion.tolerance * 0.35 + target.stability / 100 * 0.2, 0, 1);

    return {
      cooldownKey: "religion:send_missionaries",
      cooldownMs: 90_000,
      cost: {
        [ResourceType.Gold]: 18,
        [ResourceType.Faith]: 26,
        [ResourceType.Legitimacy]: 2
      },
      chance: this.clamp(0.2 + actorMissionaryPower * 0.55 - targetResistance * 0.32, 0.08, 0.9),
      pressureGain: this.clamp(0.2 + actorMissionaryPower * 0.18, 0.16, 0.42)
    };
  }

  private captureSnapshot(reason: SnapshotReason, savedAt = this.deps.clock.now()): void {
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

  private async pruneSnapshots(repository: SnapshotRepository, maxSnapshots: number): Promise<void> {
    const entries = await repository.list(maxSnapshots + 20);

    if (entries.length <= maxSnapshots) {
      return;
    }

    for (const stale of entries.slice(maxSnapshots)) {
      await repository.delete(stale.id);
    }
  }

  private executeSyncAction(actionFn: (state: GameState) => GameState): void {
    let state = this.requireState();
    
    // 1. Executa a mutação de domínio
    state = actionFn(state);
    
    // 2. Micro-Tick de Eventos (Flush Síncrono)
    if (state.domainEventQueue && state.domainEventQueue.length > 0) {
      const newLogEntries = state.domainEventQueue
        .map((evt) => parseDomainEventToLogEntry(evt, state, this.deps.staticWorldData))
        .filter(Boolean); // Remove nulos
          
      // Insere no Feed da UI imediatamente
      state.events = [...newLogEntries, ...state.events].slice(0, 180);
      
      // Esvazia a fila para não ser duplicada no próximo TickPipeline
      state.domainEventQueue = [];
    }

    this.currentState = state;
    this.persistCurrent();
    this.emitState();
  }

  private persistCurrent(): void {
    this.enqueueIo(async () => {
      if (this.currentState) {
        await this.deps.gameStateRepository.saveCurrent(this.currentState);
      }
    });
  }

  private enqueueIo(action: () => Promise<void>): void {
    this.ioQueue = this.ioQueue
      .then(action)
      .catch((error: unknown) => {
        console.error("Falha em operação de persistência", error);
      });
  }

  private async restoreFromSnapshotOrSave(): Promise<GameState | null> {
    if (this.deps.snapshotRepository) {
      const latestSnapshot = await this.deps.snapshotRepository.latest();
      if (latestSnapshot) {
        return structuredClone(latestSnapshot.state);
      }
    }

    return this.restoreFromLatestSave();
  }

  private async restoreFromLatestSave(): Promise<GameState | null> {
    const slots = await this.deps.saveRepository.listSlots();

    for (const slot of slots) {
      const snapshot = await this.deps.saveRepository.loadFromSlot(slot.slotId);
      if (snapshot) {
        return structuredClone(snapshot.state);
      }
    }

    return null;
  }

  private async bootstrapCommandHead(): Promise<void> {
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

  private async runOfflineProgression(state: GameState, now: number): Promise<{ state: GameState; ticks: number; elapsedMs: number }> {
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

  private selectOfflineCoarseStep(ticks: number): number {
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

  private lastEmitTime = 0;
  
  public emitState(force = false): void {
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

  private requireState(): GameState {
    if (!this.currentState) {
      throw new Error("Sessão ainda não inicializada.");
    }

    return this.currentState;
  }

  private createSessionLog(title: string, details: string, severity: EventLogEntry["severity"], now: number): EventLogEntry {
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

  private createCommandEntry(input: Omit<CommandLogEntry, "sequence" | "id" | "previousHash" | "hash">): CommandLogEntry {
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
    const hash = hashDeterministic({
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

  private enqueueCommandEntries(entries: CommandLogEntry[]): void {
    const repository = this.deps.commandLogRepository;

    if (!repository || entries.length === 0) {
      return;
    }

    this.enqueueIo(async () => {
      await repository.append(entries);
    });
  }

  private recordPlayerCommand(commandType: string, payload: Record<string, unknown>): void {
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

  private recordSystemCommand(commandType: string, payload: Record<string, unknown>, createdAt = this.deps.clock.now()): void {
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

  private recordTickCommands(previousTick: number, currentTick: number, events: DomainEvent[], createdAt: number): void {
    const repository = this.deps.commandLogRepository;

    if (!repository) {
      return;
    }

    const state = this.currentState;
    const stateHash = state ? buildStateHash(state) : null;
    const entries: CommandLogEntry[] = [];

    entries.push(
      this.createCommandEntry({
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
      })
    );

    for (const event of events) {
      const issuerType: CommandLogEntry["issuerType"] = event.type.startsWith("npc.") ? "npc" : "system";
      const issuerId = event.actorKingdomId ?? (issuerType === "npc" ? "npc" : "system");

      entries.push(
        this.createCommandEntry({
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
        })
      );
    }

    this.enqueueCommandEntries(entries);
  }
}

import "./styles/global.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { Diagnostic } from "./application/diagnostics";
import { generateHeir } from "./core/simulation/systems/character-system";
import {
  GameSession,
  type DiplomaticActionType,
  type RegionActionType,
  type ReligiousActionType,
  type RuntimeMetrics,
  type TechnologyChoice
} from "./application/game-session";
import { GodModeConsole } from "./application/god-mode";
import { AutomationLevel, ReligiousPolicy, ResourceType, TechnologyDomain, BuildingType, MinisterRole, MinisterPersonality } from "./core/models/enums";
import { createDefaultSimulationSystems } from "./core/simulation/create-default-systems";
import type { SaveSummary } from "./core/contracts/game-ports";
import type { GameState, KingdomState } from "./core/models/game-state";
import type { MapLayerMode, MapRenderContext, MapSelection } from "./infrastructure/rendering/map-renderer";
import { HybridMapRenderer } from "./infrastructure/rendering/hybrid-map-renderer";
import { LocalDiplomacyResolver } from "./infrastructure/diplomacy/local-diplomacy-resolver";
import { UtilityNpcDecisionService } from "./infrastructure/npc/utility-npc-decision-service";
import { createRuntimePersistenceBundle } from "./infrastructure/persistence/runtime-persistence";
import { BrowserClockService } from "./infrastructure/runtime/browser-clock-service";
import { LocalEventBus } from "./infrastructure/runtime/local-event-bus";
import { LocalWarResolver } from "./infrastructure/war/local-war-resolver";
import { calculateTechnologyBonuses } from "./core/models/technology-effects-service";
import { FAMILY_TRIBUTE_LEGENDARIES } from "./core/data/legendaries";
import { loadDirectoryHandle, saveDirectoryHandle, clearDirectoryHandle, WebFsGameStateRepository, WebFsSaveRepository } from "./infrastructure/persistence/web-fs-repositories";
import { TabControllerManager } from "./ui/controllers/tab-controller-manager";
import { buildRenderGameTextState } from "./ui/view-models/render-game-to-text";

interface UiRefs {
  playerValue: HTMLElement;
  tickValue: HTMLElement;
  updatedValue: HTMLElement;
  statusValue: HTMLElement;
  victoryValue: HTMLElement;
  postVictoryValue: HTMLElement;
  pauseButton: HTMLButtonElement;
  speedSelect: HTMLSelectElement;
  openSettingsButton: HTMLButtonElement;
  manualSaveButton: HTMLButtonElement;
  refreshSavesButton: HTMLButtonElement;
  exitToMenuBtn: HTMLButtonElement;
  toastArea: HTMLElement;
  devTickLastValue: HTMLElement | null;
  devTickAvgValue: HTMLElement | null;
  devOfflineValue: HTMLElement | null;
  mapCanvas: HTMLElement;
  mapLayerSelect: HTMLSelectElement;
  mapLegend: HTMLElement;
  resourceList: HTMLElement;
  riskList: HTMLElement;
  explainList: HTMLElement;
  regionInfo: HTMLElement;
  regionActions: HTMLElement;
  governmentApplyButton: HTMLButtonElement;
  budgetInputs: Record<string, HTMLInputElement>;
  taxInputs: Record<string, HTMLInputElement>;
  councilPanel: HTMLElement;
  councilCandidates: HTMLElement;
  councilAdvice: HTMLElement;
  expansionAutomationSelect: HTMLSelectElement;
    constructionAutomationSelect: HTMLSelectElement;
    globalAutomationToggle: HTMLInputElement;
  techFocusSelect: HTMLSelectElement;
  techAutomationSelect: HTMLSelectElement;
  techHideCompletedToggle: HTMLInputElement;
  techClearGoalButton: HTMLButtonElement;
  techApplyButton: HTMLButtonElement;
  techSummary: HTMLElement;
  techTreeList: HTMLElement;
  religionSummary: HTMLElement;
  religionDemographics: HTMLElement;
  religionChangeSelect: HTMLSelectElement;
  religionChangeBtn: HTMLButtonElement;
  religionPolicySelect: HTMLSelectElement;
  religionActiveTenets: HTMLElement;
  diplomacyList: HTMLElement;
  militarySummary: HTMLElement;
  saveList: HTMLElement;
  eventList: HTMLElement;
  profileNameInput: HTMLInputElement;
  profileEmailInput: HTMLInputElement;
  profileColorInput: HTMLInputElement;
  profileIdValue: HTMLElement;
  profileSaveButton: HTMLButtonElement;
  appVersion: HTMLElement;
  tabButtons: HTMLButtonElement[];
  tabPanels: HTMLElement[];
  offlineProgressionToggle: HTMLInputElement;
  immortalityToggle: HTMLInputElement;
  splashScreen: HTMLElement;
  splashContinueBtn: HTMLButtonElement;
  splashNewBtn: HTMLButtonElement;
  splashForm: HTMLElement;
  splashMonarchInput: HTMLInputElement;
  splashCountrySelect: HTMLSelectElement;
  splashColorInput: HTMLInputElement;
  splashStartBtn: HTMLButtonElement;
}

type TabId = "mapa" | "governo" | "diplomacia" | "religiao" | "tecnologia" | "militar" | "eventos" | "saves" | "configuracoes";

interface LocalPlayerProfile {
  id: string;
  name: string;
  email: string;
  color?: string;
}

const PROFILE_STORAGE_KEY = "midk.profile.v1";

type DebugWindow = Window & {
  __DEBUG_SESSION?: GameSession;
  __WORLD_DEFS?: typeof WORLD_DEFINITIONS_V1;
  render_game_to_text?: () => string;
  advanceTime?: (ms: number) => Promise<void>;
};

const TECH_DOMAIN_ORDER: TechnologyDomain[] = [
  TechnologyDomain.Economy,
  TechnologyDomain.Military,
  TechnologyDomain.Administration,
  TechnologyDomain.Religion,
  TechnologyDomain.Logistics,
  TechnologyDomain.Engineering
];

// Gerenciador de controladores de abas (MVC/MVP Pattern)
const tabControllerManager = new TabControllerManager();

function queryElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Elemento não encontrado: ${selector}`);
  }

  return element as T;
}

function queryOptionalElement<T extends Element>(root: ParentNode, selector: string): T | null {
  const element = root.querySelector(selector);
  return element ? (element as T) : null;
}

function formatNumber(value: number, decimals = 0): string {
  const safeValue = decimals === 0 ? Math.floor(value) : value;
  const absValue = Math.abs(safeValue);

  // Compactação de numeração estilo RPG (K, M, B, T) para Late-Game
  if (absValue >= 1_000_000_000_000) {
    return (safeValue / 1_000_000_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + "T";
  }
  if (absValue >= 1_000_000_000) {
    return (safeValue / 1_000_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + "B";
  }
  if (absValue >= 1_000_000) {
    return (safeValue / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + "M";
  }
  if (absValue >= 1_000) {
    return (safeValue / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + "K";
  }

  return new Intl.NumberFormat("pt-BR", { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  }).format(safeValue);
}

function formatCalendarTime(tick: number): string {
  // Diluição do tempo: 12 ciclos do Worker = 1 Ano de Simulação
  const year = Math.floor(tick / 12) + 1;
  
  // Futuramente, esta string mudará baseada nas Tecnologias descobertas (Ex: Era do Bronze)
  const eraName = "Era da Aurora"; 
  return `Ano ${formatNumber(year)} (${eraName})`;
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(value);
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getPlayerKingdom(state: GameState): KingdomState {
  const player = Object.keys(state.kingdoms)
    .sort()
    .map((id) => state.kingdoms[id])
    .find((kingdom) => kingdom.isPlayer);

  if (!player) {
    throw new Error("Reino do jogador não encontrado.");
  }

  return player;
}

function riskClass(value: number): string {
  if (value >= 0.7) {
    return "risk-high";
  }

  if (value >= 0.45) {
    return "risk-medium";
  }

  return "risk-low";
}

function normalizePercentage(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return round(Math.max(0, parsed));
}

function techDomainLabel(domain: TechnologyDomain): string {
  switch (domain) {
    case TechnologyDomain.Economy:
      return "Economia";
    case TechnologyDomain.Military:
      return "Militar";
    case TechnologyDomain.Administration:
      return "Administração";
    case TechnologyDomain.Religion:
      return "Religião";
    case TechnologyDomain.Logistics:
      return "Logística";
    case TechnologyDomain.Engineering:
      return "Engenharia";
  }
}

function techStatusLabel(status: TechnologyChoice["status"]): string {
  switch (status) {
    case "active":
      return "Ativa";
    case "available":
      return "Disponível";
    case "unlocked":
      return "Concluída";
    case "locked":
      return "Bloqueada";
  }
}

function automationLevelLabel(level: AutomationLevel): string {
  switch (level) {
    case AutomationLevel.Manual:
      return "Manual";
    case AutomationLevel.Assisted:
      return "Assistido";
    case AutomationLevel.NearlyAutomatic:
      return "Quase automático";
  }
}

function generateProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now().toString(36)}`;
}

function createDefaultProfile(): LocalPlayerProfile {
  return {
    id: generateProfileId(),
    name: "Monarca Local",
    email: "",
    color: "#d4af37" // Ouro como cor padrão do jogador
  };
}

function loadLocalProfile(): LocalPlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      const fallback = createDefaultProfile();
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<LocalPlayerProfile>;
        
        // Mesclagem segura: Mantém o que existe, aplica padrão apenas no que faltar
        const profile: LocalPlayerProfile = {
          id: typeof parsed.id === "string" ? parsed.id : generateProfileId(),
          name: typeof parsed.name === "string" ? parsed.name : "Monarca Local",
          email: typeof parsed.email === "string" ? parsed.email : "",
          color: typeof parsed.color === "string" ? parsed.color : "#d4af37"
    };
        
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        return profile;
  } catch {
    const fallback = createDefaultProfile();
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function saveLocalProfile(profile: LocalPlayerProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

// Cache de Índice O(1) para abolir o findIndex em arrays de 62k posições
let REGION_INDEX_MAP: Map<string, number>;
let STATIC_IS_WATER: Uint8Array;
let STATIC_BIOME: Uint8Array;
let WORLD_DEFINITIONS_V1: any[];
let WORLD_DEFINITIONS_MAP_ID: string;

async function bootstrapApp(): Promise<void> {
  Diagnostic.system("SYS-BOOT", "Iniciando sequência de ignição da Engine (Main Thread)...");

  Diagnostic.system("SYS-BOOT", "Carregando matriz geográfica (Code Split via Dynamic Import)...");
  const [
    { createInitialState },
    { createStaticWorldData },
    mapData
  ] = await Promise.all([
    import("./application/boot/create-initial-state"),
    import("./application/boot/static-world-data"),
    import("./application/boot/generated/world-definitions-v1")
  ]);

  WORLD_DEFINITIONS_V1 = mapData.WORLD_DEFINITIONS_V1;
  WORLD_DEFINITIONS_MAP_ID = mapData.WORLD_DEFINITIONS_MAP_ID;

  REGION_INDEX_MAP = new Map<string, number>();
  STATIC_IS_WATER = new Uint8Array(WORLD_DEFINITIONS_V1.length);
  STATIC_BIOME = new Uint8Array(WORLD_DEFINITIONS_V1.length);

  for (let i = 0; i < WORLD_DEFINITIONS_V1.length; i++) {
    const def = WORLD_DEFINITIONS_V1[i];
    REGION_INDEX_MAP.set(def.id, i);
    
    STATIC_IS_WATER[i] = def.isWater ? 1 : 0;
    switch (def.biome) {
      case "ocean": STATIC_BIOME[i] = 0; break;
      case "desert": STATIC_BIOME[i] = 1; break;
      case "tundra": STATIC_BIOME[i] = 2; break;
      case "temperate": STATIC_BIOME[i] = 3; break;
      case "tropical": STATIC_BIOME[i] = 4; break;
      default: STATIC_BIOME[i] = 0;
    }
  }
  
  let fsDirHandle: any = null;
  if ('showDirectoryPicker' in window) {
    fsDirHandle = await loadDirectoryHandle();
    if (fsDirHandle) {
      const permission = await fsDirHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'prompt') {
        await new Promise<void>((resolve) => {
          const overlay = document.createElement("div");
          overlay.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 20000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;";
          overlay.innerHTML = `
            <h2 style="color: #d4af37;">Sincronização de Saves Ativa</h2>
            <p style="margin-bottom: 30px;">O jogo está configurado para salvar diretamente na sua pasta do Windows.</p>
            <button id="grant-btn" style="padding: 15px 30px; font-size: 18px; margin-top: 20px; background: #3e6b57; color: white; border: none; border-radius: 8px; cursor: pointer;">Autorizar Acesso à Pasta</button>
            <button id="cancel-btn" style="padding: 10px 20px; margin-top: 15px; background: transparent; border: 1px solid #ff5555; color: #ff5555; border-radius: 4px; cursor: pointer;">Desvincular e usar armazenamento do navegador</button>
          `;
          document.body.appendChild(overlay);

          overlay.querySelector("#grant-btn")!.addEventListener("click", async () => {
            const res = await fsDirHandle.requestPermission({ mode: 'readwrite' });
            if (res === 'granted') { overlay.remove(); resolve(); } 
            else { alert("Permissão negada. O jogo será carregado sem acesso à pasta."); fsDirHandle = null; overlay.remove(); resolve(); }
          });
          overlay.querySelector("#cancel-btn")!.addEventListener("click", async () => {
            await clearDirectoryHandle(); fsDirHandle = null; overlay.remove(); resolve();
          });
        });
      } else if (permission !== 'granted') {
        fsDirHandle = null;
      }
    }
  }

  const appRoot = document.getElementById("app");

  if (!appRoot) {
    throw new Error("Elemento #app não encontrado.");
  }

  document.documentElement.lang = "pt-BR";
  document.title = "Epochs Idle PC";
  document.body.classList.add("is-modal-open"); // Garante que o scroll do fundo fique travado no Boot

  const showDevMetrics = import.meta.env.DEV;

  appRoot.innerHTML = `
    <style>
      .splash-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(10, 10, 15, 0.95); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; backdrop-filter: blur(8px); overflow-y: auto; padding: 2rem 1rem; box-sizing: border-box; }
      .splash-overlay.is-hidden { display: none !important; }
      .splash-card { background: var(--surface-color, #1e1e24); border: 1px solid var(--border-color, #333); padding: 2.5rem; border-radius: 12px; width: 100%; max-width: 520px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.8); margin: auto; flex-shrink: 0; }
      .splash-card h1 { color: var(--primary-color, #d4af37); margin-bottom: 0.5rem; font-size: 2.2rem; font-family: serif; }
      .splash-actions { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; }
      .splash-actions button { flex: 1; padding: 0.8rem; font-size: 1.05rem; }
      .splash-form { margin-top: 1.5rem; text-align: left; animation: fadeIn 0.3s ease; }
      .splash-form hr { border-color: var(--border-color, #333); margin-bottom: 1.5rem; }
      .splash-form label { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.2rem; font-weight: bold; color: #ccc; }
      .splash-form input, .splash-form select { width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color, #444); color: white; border-radius: 4px; }
      .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .stat-row:last-child { border-bottom: none; }
      .stat-row label { margin: 0; font-size: 0.95rem; color: #e5e7eb; flex: 1; font-weight: 500; }
      .stat-controls { display: flex; align-items: center; gap: 12px; }
      .stat-controls button { width: 32px; height: 32px; padding: 0; font-weight: bold; border-radius: 6px; background: #333; color: #fff; border: 1px solid #555; cursor: pointer; transition: background 0.2s; }
      .stat-controls button:hover:not(:disabled) { background: #555; }
      .stat-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
      .stat-controls span { width: 40px; text-align: center; font-weight: 900; color: #ffffff; font-size: 1.2rem; background: #000000; padding: 6px 0; border-radius: 6px; border: 1px solid #d4af37; box-shadow: 0 0 8px rgba(212, 175, 55, 0.3); }
      .archetype-btn { background: rgba(0,0,0,0.4); border: 1px solid #555; color: #ccc; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
      .archetype-btn:hover { border-color: var(--primary-color, #d4af37); color: white; background: rgba(212, 175, 55, 0.1); }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      
      /* Melhorias de UX Globais */
      button:active:not(:disabled) { transform: scale(0.95); transition: transform 0.05s ease; }
      button:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(100%); }
      .toast { display: none; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; background: rgba(30, 0, 0, 0.95); color: #ffeb3b; padding: 12px 24px; border-radius: 8px; font-weight: bold; pointer-events: none; border: 1px solid #d4af37; box-shadow: 0 10px 25px rgba(0,0,0,0.8); font-size: 1.1rem; text-align: center; }
      
      /* Map Legend Styles */
      .map-legend { position: absolute; bottom: 20px; left: 20px; background: rgba(20, 20, 25, 0.9); border: 1px solid var(--border-color, #444); border-radius: 8px; padding: 12px; font-size: 0.85rem; color: #ddd; z-index: 10; pointer-events: none; backdrop-filter: blur(4px); box-shadow: 0 4px 15px rgba(0,0,0,0.6); }
      .map-legend-title { font-weight: bold; margin-bottom: 8px; color: #fff; font-size: 0.95rem; border-bottom: 1px solid #333; padding-bottom: 4px; }
      .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
      .legend-color { width: 16px; height: 16px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.15); box-sizing: border-box; }

      /* Trava de scroll para modais */
      body.is-modal-open { overflow: hidden !important; }
      
      /* Religion Customizer Styles */
      .tenet-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; max-height: 280px; overflow-y: auto; padding: 5px; margin-top: 10px; border: 1px solid #333; background: rgba(0,0,0,0.2); border-radius: 6px; }
      .tenet-card { background: rgba(0,0,0,0.4); border: 1px solid #444; padding: 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; user-select: none; }
      .tenet-card:hover { border-color: #d4af37; }
      .tenet-card.selected { background: rgba(212, 175, 55, 0.15); border-color: #d4af37; box-shadow: inset 0 0 15px rgba(212, 175, 55, 0.2); }
      .tenet-card h4 { margin: 0 0 6px 0; color: #e5e7eb; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; }
      .tenet-card p { margin: 0; font-size: 0.8rem; color: #9ca3af; line-height: 1.3; }
      .tenet-cost { font-weight: bold; color: #4ade80; font-size: 0.9rem; }
      .tenet-cost.negative { color: #f87171; }

      /* Council Styles */
      .council-grid, .candidate-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
      .rpg-card { background: linear-gradient(145deg, rgba(30,30,35,0.9), rgba(15,15,20,0.95)); border: 1px solid #555; border-radius: 8px; padding: 16px; position: relative; overflow: hidden; box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.5); }
      .rpg-card::before { content: ""; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--primary-color, #d4af37); }
      .rpg-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
      .rpg-header h4 { margin: 0; color: #e5e7eb; font-size: 1.15rem; font-family: serif; text-shadow: 1px 1px 2px #000; }
      .role-badge { font-size: 0.70rem; text-transform: uppercase; letter-spacing: 1px; background: rgba(212, 175, 55, 0.2); color: #d4af37; padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.5); font-weight: bold; }
      .rpg-desc { font-size: 0.8rem; color: #9ca3af; font-style: italic; margin-bottom: 12px; line-height: 1.4; }
      .rpg-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px inset #222; }
      .rpg-stats span { color: #ccc; }
      .rpg-stats strong { color: #fff; float: right; }
      .skill-stars { color: #d4af37; letter-spacing: 2px; }
      .empty-slot { background: rgba(240, 240, 245, 0.95) !important; border: 2px dashed #888 !important; box-shadow: none; }
      .empty-slot:hover { background: #ffffff !important; border-color: #555 !important; }
    </style>
    <div id="splash-screen" class="splash-overlay">
      <div class="splash-card card">
        <h1>Epochs Idle PC</h1>
        <p style="color: #aaa;">A forja de um novo império aguarda o seu comando.</p>
        <div id="splash-loading-indicator" style="margin-top: 2rem; color: #888; font-weight: bold; padding: 0.8rem;">Lendo pergaminhos locais...</div>
        <div id="splash-actions" class="splash-actions" style="display: none;">
          <button id="splash-continue-btn" class="primary" style="display: none;">Carregar Jogo Salvo</button>
          <button id="splash-new-btn">Nova Campanha</button>
        </div>
        <div id="splash-form" class="splash-form is-hidden">
          <hr />
          <h2 style="margin-bottom: 1rem; text-align: center; color: var(--primary-color, #d4af37);">A Sala de Guerra</h2>
          
          <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid #333; margin-bottom: 15px;">
            <label>Nome do Monarca (Você)
              <input id="splash-monarch" type="text" value="${loadLocalProfile().name || 'Soberano'}" maxlength="30">
            </label>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
              <label style="margin-bottom: 0;">Nação Inicial
                <select id="splash-country"></select>
              </label>
              <label style="margin-bottom: 0;">Cor da Dinastia
                <input id="splash-color" type="color" value="${loadLocalProfile().color || '#d4af37'}" style="padding: 0; height: 40px; cursor: pointer; width: 100%;">
              </label>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid #333;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0; color: #e5e7eb;">Sua Ficha (RPG)</h3>
              <span id="splash-points-left" style="color: #4ade80; font-weight: bold; font-size: 1.05rem;">Pontos: 0</span>
            </div>
            
            <div style="display: flex; gap: 5px; margin-bottom: 15px;">
              <button type="button" class="archetype-btn" data-arch="balanced" style="flex: 1; font-size: 0.8rem; padding: 6px;">Equilibrado</button>
              <button type="button" class="archetype-btn" data-arch="warrior" style="flex: 1; font-size: 0.8rem; padding: 6px;">Guerreiro</button>
              <button type="button" class="archetype-btn" data-arch="scholar" style="flex: 1; font-size: 0.8rem; padding: 6px;">Sábio</button>
              <button type="button" class="archetype-btn" data-arch="diplomat" style="flex: 1; font-size: 0.8rem; padding: 6px;">Diplomata</button>
            </div>

            <div class="stat-distributor">
              ${[
                { id: 'administration', name: 'Administração (Eficiência e Impostos)' },
                { id: 'martial', name: 'Marcial (Exército e Táticas)' },
                { id: 'diplomacy', name: 'Diplomacia (Pactos e Carisma)' },
                { id: 'intrigue', name: 'Intriga (Tramas e Sombras)' },
                { id: 'learning', name: 'Erudição (Ciência e Religião)' }
              ].map(stat => `
                <div class="stat-row">
                  <label title="${stat.name}">${stat.name}</label>
                  <div class="stat-controls">
                    <button type="button" class="btn-stat-minus" data-stat="${stat.id}">-</button>
                    <span id="stat-val-${stat.id}">5</span>
                    <button type="button" class="btn-stat-plus" data-stat="${stat.id}">+</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <button id="splash-start-btn" class="primary" style="width: 100%; margin-top: 1.5rem; font-size: 1.1rem; padding: 1rem;">Forjar Destino</button>
        </div>
      </div>
    </div>

    <!-- Modal de Fundação de Religião -->
    <div id="religion-founder-modal" class="splash-overlay is-hidden" style="z-index: 10001;">
      <div class="splash-card card" style="max-width: 700px; text-align: left;">
        <h2 style="color: var(--primary-color, #d4af37); margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">Forjar Nova Fé (O Profeta)</h2>
        <div style="background: rgba(255, 235, 59, 0.1); border: 1px solid #ffeb3b; color: #ffeb3b; padding: 8px 12px; border-radius: 4px; margin-bottom: 15px; font-size: 0.85rem;">
          ⚠️ <strong>Atenção:</strong> O preenchimento de todos os campos (Nome, Deus e Descrição) é obrigatório.
        </div>
        <div class="form-grid" style="margin-bottom: 15px;">
          <label style="color: #e5e7eb; font-weight: bold;">Nome da Religião <input id="rf-name" type="text" placeholder="Ex: Ordem do Fogo Branco"></label>
          <label style="color: #e5e7eb; font-weight: bold;">Cor no Mapa <input id="rf-color" type="color" value="#d4af37" style="padding: 0; height: 40px; cursor: pointer; background: transparent; border: none;"></label>
          <label style="grid-column: 1 / -1; color: #e5e7eb; font-weight: bold;">O Deus ou Panteão adorado <input id="rf-deity-name" type="text" placeholder="Ex: O Único Criador"></label>
          <label style="grid-column: 1 / -1; color: #e5e7eb; font-weight: bold;">Descrição Teológica Base <input id="rf-deity-desc" type="text" placeholder="Ex: A adoração purificadora que busca limpar o mundo através das chamas."></label>
        </div>
        <h3 style="margin-top: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 1.1rem;">
          <span>Dogmas (Combine livremente)</span>
          <span id="rf-budget-text" style="color: #4ade80;">Orçamento: 100 Pontos</span>
        </h3>
        <div id="rf-tenets-grid" class="tenet-grid"></div>
        <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #444; padding-top: 15px;">
          <div style="font-size: 0.9rem; color: #bbb;">
            Custo de Fundação:<br>
            <strong style="color: #ffeb3b;">1.000 Fé</strong> | <strong style="color: #d4af37;">50 Legitimidade</strong>
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="rf-cancel-btn" style="background: transparent; border: 1px solid #ff5555; color: #ff5555;">Abandonar Visão</button>
            <button id="rf-submit-btn" class="primary">Decretar Nova Religião</button>
          </div>
        </div>
      </div>
    </div>

    <main class="app-shell">
      <header class="app-header card">
        <div class="header-title">
          <h1>Epochs Idle PC <span id="app-version" style="font-size: 14px; color: #666; font-weight: normal; user-select: none;">v0.1.0</span></h1>
          <p>Grand strategy idle local-first com foco em decisões de alto nível.</p>
        </div>
        <div class="status-grid">
          <div><span>Jogador</span><strong id="player-value">-</strong></div>
          <div><span>Época</span><strong id="tick-value">Ano 1</strong></div>
          <div><span>Atualizado</span><strong id="updated-value">-</strong></div>
          <div><span>Estado</span><strong id="status-value">Pausado</strong></div>
          <div><span>Vitória</span><strong id="victory-value">Ainda não alcançada</strong></div>
          <div><span>Pós-vitória</span><strong id="post-victory-value">-</strong></div>
        </div>
      </header>

      <section class="control-row card">
        <button id="toggle-pause-btn">Pausar</button>
        <label>
          Velocidade
          <select id="speed-select">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
          </select>
        </label>
        <button id="open-settings-btn">Configurações</button>
        <span id="toast-area" class="toast"></span>
      </section>
      <div class="scrollable-content-area">
      <section class="map-workspace">
        <article class="card map-card" style="display: flex; flex-direction: column;">
          <div class="map-toolbar">
            <h2>Mapa estratégico</h2>
            <label>
              Camada
              <select id="map-layer-select">
                <option value="owner" selected>Domínio</option>
                <option value="unrest">Instabilidade</option>
                <option value="war">Contestado/Guerra</option>
                <option value="religion">Religião</option>
                <option value="diplomacy">Diplomacia (Jogador)</option>
                <option value="economy">Economia (Ouro)</option>
              </select>
            </label>
          </div>
          <p class="map-hint">Use scroll/pinch para zoom e arraste para mover o mapa.</p>
          <div style="position: relative; flex: 1; min-height: 450px; display: flex; flex-direction: column; border-radius: 6px; overflow: hidden;">
            <div id="map-canvas" class="map-canvas" style="flex: 1; width: 100%;"></div>
            <div id="map-legend" class="map-legend"></div>
          </div>
        </article>

        <aside class="side-column">
          <article class="card">
            <h2>Riscos estratégicos</h2>
            <ul id="risk-list" class="risk-list"></ul>
            <h3>Explicabilidade</h3>
            <ul id="explain-list" class="list compact explain-list"></ul>
          </article>
          <article class="card">
            <h2>Região selecionada</h2>
            <div id="region-info">Selecione uma região no mapa.</div>
            <div id="region-actions" class="action-grid"></div>
          </article>
          <article class="card">
            <h2>Recursos</h2>
            <ul id="resource-list" class="list compact"></ul>
          </article>
        </aside>
      </section>

      <section class="panel-grid">
        <article class="card tab-panel" data-tab-panel="mapa">
          <h2>Painel de campanha</h2>
          <p>Defina foco de expansão por diplomacia e ações regionais para dominar o mapa.</p>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="governo">
          <h2>Governo e economia</h2>
          <div class="form-grid">
            <label>Taxa base (%) <input id="tax-base" type="number" min="5" max="60" step="1"></label>
            <label>Alívio nobre (%) <input id="tax-noble" type="number" min="0" max="40" step="1"></label>
            <label>Isenção clero (%) <input id="tax-clergy" type="number" min="0" max="40" step="1"></label>
            <label>Tarifa comercial (%) <input id="tax-tariff" type="number" min="0" max="50" step="1"></label>
          </div>
          <p class="hint-text" style="grid-column: 1 / -1; margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Valores em porcentagem (%). Taxas altas aumentam a arrecadação de ouro significativamente, mas elevam o risco de revoltas populares.
          </p>
          <h3>Prioridade de orçamento (%)</h3>
          <div class="form-grid">
            <label>Economia <input id="budget-economy" type="number" min="0" max="100" step="1"></label>
            <label>Militar <input id="budget-military" type="number" min="0" max="100" step="1"></label>
            <label>Religião <input id="budget-religion" type="number" min="0" max="100" step="1"></label>
            <label>Administração <input id="budget-administration" type="number" min="0" max="100" step="1"></label>
            <label>Tecnologia <input id="budget-technology" type="number" min="0" max="100" step="1"></label>
          </div>
          <h3>Automação do Império</h3>
          <div class="form-grid">
            <label style="grid-column: 1 / -1;" class="inline-check">
              <input id="global-automation-toggle" type="checkbox">
              <strong style="color: #4ade80;">Ativar Todas as Automações (Modo Automático Total)</strong>
            </label>
            <label>Construções (Edifícios)
              <select id="construction-automation-select">
                <option value="manual">Manual (Requer controle)</option>
                <option value="assisted">Semi-Auto (Proporcional)</option>
                <option value="nearly_automatic">Automático (IA Contextual)</option>
              </select>
            </label>
            <label>Expansão e Migração
              <select id="expansion-automation-select">
                <option value="manual">Manual (Requer controle)</option>
                <option value="assisted">Automática (Transbordo Livre)</option>
              </select>
            </label>
          </div>
          <h3 style="margin-top: 2rem; border-top: 1px solid #444; padding-top: 1.5rem;">Conselho Real</h3>
          <div id="council-panel" class="council-grid"></div>
          <h3 style="margin-top: 1.5rem;">Candidatos Disponíveis</h3>
          <div id="council-candidates" class="candidate-grid"></div>
          <h3 style="margin-top: 1.5rem;">Relatórios do Conselho</h3>
          <ul id="council-advice" class="list compact"></ul>

          <button id="government-apply-btn">Aplicar políticas</button>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="religiao">
          <h2>Religião de Estado e Demografia</h2>
          <div id="religion-summary" class="summary-grid"></div>
          
          <div class="inline-form" style="margin-top: 15px; border-top: 1px solid #333; padding-top: 15px;">
            <label>Postura do Clero (Automação)
              <select id="religion-policy-select"></select>
            </label>
          </div>

          <div id="religion-deity-info" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 6px; border-left: 4px solid var(--primary-color, #d4af37);">
            <h3 style="margin-top:0; margin-bottom:8px; font-size:1.1rem;" id="rd-name">Deus Supremo</h3>
            <p style="margin:0; font-size:0.95rem; color:#e5e7eb; line-height:1.4;" id="rd-desc">Descrição Teológica</p>
          </div>

          <h3 style="margin-top: 20px;">Dogmas Consagrados</h3>
          <div id="religion-active-tenets" class="tenet-grid" style="margin-bottom: 20px;"></div>

          <h3>Fé Dominante por Território (Geopolítica)</h3>
          <ul id="religion-demographics" class="list compact" style="margin-bottom: 20px;"></ul>

          <div class="inline-form" style="margin-top: 15px; border-top: 1px solid #333; padding-top: 15px;">
            <label>Mudar Religião Oficial
              <select id="religion-change-select"></select>
            </label>
            <button id="religion-change-btn" class="danger">Decretar Nova Fé</button>
          </div>
          <p class="hint-text">Mudar a religião oficial causa um severo choque cultural (-40 Legitimidade, -30 Estabilidade), mas permite alinhar o estado com a fé da maioria para evitar revoltas.</p>

          <div style="margin-top: 20px; padding: 20px; border: 1px solid #333; border-left: 4px solid #d4af37; border-radius: 6px; background: rgba(15, 15, 20, 0.9); text-align: left;">
            <h3 style="margin-top: 0; color: #d4af37;">O Profeta</h3>
            <p style="font-size: 0.95rem; color: #e5e7eb; margin-bottom: 15px; line-height: 1.5;">Acumule vasta influência espiritual e governamental para romper definitivamente com os dogmas arcaicos e revelar as verdades supremas do seu próprio panteão à humanidade.</p>
            <button id="btn-open-founder" class="primary" style="font-size: 1.1rem; padding: 10px 20px; width: 100%;">Forjar Nova Fé</button>
          </div>

          <h3 style="margin-top: 20px;">Poderes Divinos</h3>
          <p>O acúmulo de Fé permite canalizar milagres que afetam diretamente o mundo material.</p>
          <div class="summary-grid">
            <span>Fé Disponível</span><strong id="faith-pool-value">0</strong>
          </div>
          <div class="action-grid" style="margin-top: 15px;">
            <button id="btn-bless-crops" style="background: #002200; border-color: #00ff00; color: #00ff00;">Bênção da Colheita (-500 Fé)</button>
            <button id="btn-smite-rebels" style="background: rgba(34, 0, 0, 0.8); border-color: #ff5555; color: #ff5555;" disabled>Fúria Divina (Em Desenvolvimento)</button>
          </div>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="diplomacia">
          <h2>Diplomacia e conflito</h2>
          <div id="diplomacy-list" class="diplomacy-list"></div>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="tecnologia">
          <h2>Direção tecnológica</h2>
          <div class="inline-form">
            <label>
              Foco de pesquisa
              <select id="tech-focus-select">
                <option value="economy">Economia</option>
                <option value="military">Militar</option>
                <option value="administration">Administração</option>
                <option value="religion">Religião</option>
                <option value="logistics">Logística</option>
                <option value="engineering">Engenharia</option>
              </select>
            </label>
            <label>
              Automação de pesquisa
              <select id="tech-automation-select">
                <option value="manual">Manual</option>
                <option value="assisted">Assistido</option>
                <option value="nearly_automatic">Quase automático</option>
              </select>
            </label>
            <label class="inline-check">
              <input id="tech-hide-completed-toggle" type="checkbox" checked>
              Ocultar concluídas
            </label>
            <button id="tech-clear-goal-btn">Limpar meta</button>
            <button id="tech-apply-btn">Aplicar foco</button>
          </div>
          <div id="tech-summary" class="summary-grid"></div>
          <h3>Árvore tecnológica</h3>
          <div id="tech-tree-list" class="tech-tree-list"></div>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="militar">
          <h2>Painel militar</h2>
          <div id="military-summary"></div>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="eventos">
          <h2>Registro de eventos</h2>
          <ul id="event-list" class="list"></ul>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="saves">
          <h2>Gestão de saves</h2>
          <div class="inline-form saves-toolbar">
            <button id="manual-save-btn">Salvar Jogo</button>
            <button id="refresh-saves-btn">Atualizar Lista</button>
            <button id="exit-to-menu-btn" class="danger" style="margin-left: auto;">Sair para o Menu</button>
          </div>
          <div id="save-list" class="save-list"></div>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="configuracoes">
          <h2>Configurações e perfil local</h2>
          <div class="form-grid">
            <label>Nome do jogador <input id="profile-name-input" type="text" maxlength="40"></label>
            <label>Email (multiplayer futuro) <input id="profile-email-input" type="email" maxlength="100"></label>
            <label>Cor do Império <input id="profile-color-input" type="color" style="padding: 0; height: 40px; width: 80px; cursor: pointer; background: none; border: none;"></label>
          </div>
          <div class="form-grid" style="margin-top: 1rem;">
            <label class="inline-check">
              <input id="settings-offline-progression" type="checkbox">
              Simular progresso offline (cálculo de tempo fechado)
            </label>
            <label class="inline-check" style="margin-top: 10px;">
              <input id="settings-immortality" type="checkbox">
              <strong style="color: #4ade80;">Modo Jogo Eterno (Desativar Mortalidade)</strong>
            </label>
            <small style="color: #bbb; display: block; margin-left: 28px; font-style: italic;">Aviso: Ao ativar, você, seus ministros e governantes estrangeiros não envelhecerão nem morrerão de velhice. A sucessão dinástica e a perda de talentos serão inibidas, alterando profundamente o desafio narrativo do jogo.</small>
          </div>
          <div style="margin-top: 1.5rem; padding: 1rem; border: 1px solid #444; border-radius: 6px; background: rgba(0,0,0,0.2);">
            <h3 style="margin-top: 0;">💾 Armazenamento Multi-Navegador</h3>
            <p style="font-size: 0.9rem; color: #bbb; margin-bottom: 1rem;">Selecione uma pasta no seu computador para guardar os saves. Isso permite continuar o jogo no Chrome, Edge ou Opera localmente usando o mesmo arquivo físico.</p>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button id="btn-link-folder" class="primary">Vincular Pasta Local</button>
              <button id="btn-unlink-folder" class="danger" style="display: none;">Desvincular Pasta</button>
              <span id="fs-status" style="color: #bbb; margin-left: 10px;">Nenhuma pasta vinculada.</span>
            </div>
          </div>
          <div class="summary-grid">
            <span>ID local</span><strong id="profile-id-value">-</strong>
            <span>Tempo da simulação</span><strong>12 ciclos = 1 Ano Histórico</strong>
            <span>Observação multiplayer</span><strong>Conta ainda local-first (sem login online)</strong>
          </div>
          ${
            showDevMetrics
              ? `
          <div class="summary-grid">
            <span>Tick (ms) último</span><strong id="dev-tick-last">0</strong>
            <span>Tick (ms) média</span><strong id="dev-tick-avg">0</strong>
            <span>Offline catch-up</span><strong id="dev-offline">0 ms / 0 ticks</strong>
          </div>
          `
              : ""
          }
          <button id="profile-save-btn">Salvar perfil local</button>
          <p class="hint-text">Este perfil local prepara o caminho para autenticação e sincronização entre dispositivos no multiplayer futuro.</p>
        </article>

        <article class="card tab-panel is-hidden" data-tab-panel="progressao">
          <h2>🏆 Progressão das Eras</h2>
          <div class="era-progression">
            <div class="current-era-banner">
              <h3>🌅 Era Atual: Aurora</h3>
              <p class="era-description">A era da fundação e consolidação dos primeiros impérios. Você controla as bases da civilização: economia, governo e tecnologia básica.</p>
            </div>

            <div class="era-features">
              <h4>✨ Funcionalidades Disponíveis na Era Aurora</h4>
              <div class="feature-grid">
                <div class="feature-item available">
                  <span class="feature-icon">🗺️</span>
                  <div class="feature-content">
                    <strong>Mapa Mundial</strong>
                    <p>Explore e expanda seu território através do mapa interativo</p>
                  </div>
                </div>
                <div class="feature-item available">
                  <span class="feature-icon">🏛️</span>
                  <div class="feature-content">
                    <strong>Governo e Administração</strong>
                    <p>Gerencie seu império, orçamento e políticas governamentais</p>
                  </div>
                </div>
                <div class="feature-item available">
                  <span class="feature-icon">⚙️</span>
                  <div class="feature-content">
                    <strong>Tecnologia Básica</strong>
                    <p>Pesquise e desenvolva tecnologias fundamentais da civilização</p>
                  </div>
                </div>
                <div class="feature-item available">
                  <span class="feature-icon">💾</span>
                  <div class="feature-content">
                    <strong>Sistema de Saves</strong>
                    <p>Salve e carregue seu progresso de jogo</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="upcoming-eras">
              <h4>🔮 Eras Futuras e Desbloqueios</h4>
              <div class="era-roadmap">
                <div class="era-stage locked" id="solar-era">
                  <div class="era-header">
                    <span class="era-icon">🌞</span>
                    <h5>Era Solar</h5>
                    <span class="era-status">🔒 Bloqueado</span>
                  </div>
                  <p class="era-condition" id="solar-era-condition">Alcance 50.000 habitantes totais no império</p>
                  <div class="era-features-preview">
                    <div class="feature-item locked">
                      <span class="feature-icon">🤝</span>
                      <strong>Diplomacia Internacional</strong>
                    </div>
                    <div class="feature-item locked">
                      <span class="feature-icon">⚔️</span>
                      <strong>Sistema Militar</strong>
                    </div>
                    <div class="feature-item locked">
                      <span class="feature-icon">⛪</span>
                      <strong>Religião e Cultura</strong>
                    </div>
                  </div>
                </div>

                <div class="era-stage locked" id="stellar-era">
                  <div class="era-header">
                    <span class="era-icon">⭐</span>
                    <h5>Era Estelar</h5>
                    <span class="era-status">🔒 Bloqueado</span>
                  </div>
                  <p class="era-condition" id="stellar-era-condition">Alcance 500.000 habitantes e domine 10 regiões</p>
                  <div class="era-features-preview">
                    <div class="feature-item locked">
                      <span class="feature-icon">🎭</span>
                      <strong>Eventos Históricos</strong>
                    </div>
                    <div class="feature-item locked">
                      <span class="feature-icon">👥</span>
                      <strong>Conselho Imperial</strong>
                    </div>
                    <div class="feature-item locked">
                      <span class="feature-icon">🏺</span>
                      <strong>Civilizações Antigas</strong>
                    </div>
                  </div>
                </div>

                <div class="era-stage locked" id="cosmic-era">
                  <div class="era-header">
                    <span class="era-icon">🌌</span>
                    <h5>Era Cósmica</h5>
                    <span class="era-status">🔒 Bloqueado</span>
                  </div>
                  <p class="era-condition" id="cosmic-era-condition">Alcance 5 milhões de habitantes e conquiste o mundo</p>
                  <div class="era-features-preview">
                    <div class="feature-item locked">
                      <span class="feature-icon">🚀</span>
                      <strong>Exploração Espacial</strong>
                    </div>
                    <div class="feature-item locked">
                      <span class="feature-icon">🤖</span>
                      <strong>IA e Automação</strong>
                    </div>
                    <div class="feature-item locked">
                      <span class="feature-icon">⚛️</span>
                      <strong>Tecnologias Avançadas</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="progression-tips">
              <h4>💡 Dicas para Progressão</h4>
              <ul class="tips-list">
                <li><strong>Expansão:</strong> Foque em expandir seu território para aumentar a população e recursos</li>
                <li><strong>Tecnologia:</strong> Pesquise tecnologias que aumentem sua eficiência econômica</li>
                <li><strong>Governo:</strong> Mantenha um governo estável para evitar revoltas e maximizar produtividade</li>
                <li><strong>Objetivo:</strong> Trabalhe para alcançar 50.000 habitantes totais para desbloquear a Era Solar</li>
              </ul>
            </div>
          </div>
        </article>
      </section>
      </div>

      <section class="tabs card">
        <button class="tab-btn is-active" data-tab="mapa">Mapa</button>
        <button class="tab-btn" data-tab="governo">Governo</button>
        <button class="tab-btn" data-tab="religiao">Religião</button>
        <button class="tab-btn" data-tab="diplomacia">Diplomacia</button>
        <button class="tab-btn" data-tab="tecnologia">Tecnologia</button>
        <button class="tab-btn" data-tab="militar">Militar</button>
        <button class="tab-btn" data-tab="eventos">Eventos</button>
        <button class="tab-btn" data-tab="saves">Saves</button>
        <button class="tab-btn" data-tab="configuracoes">Configurações</button>
        <button class="tab-btn" data-tab="progressao">Progressão</button>
      </section>
    </main>
  `;

  const ui: UiRefs = {
    playerValue: queryElement(appRoot, "#player-value"),
    tickValue: queryElement(appRoot, "#tick-value"),
    updatedValue: queryElement(appRoot, "#updated-value"),
    statusValue: queryElement(appRoot, "#status-value"),
    victoryValue: queryElement(appRoot, "#victory-value"),
    postVictoryValue: queryElement(appRoot, "#post-victory-value"),
    pauseButton: queryElement(appRoot, "#toggle-pause-btn"),
    speedSelect: queryElement(appRoot, "#speed-select"),
    openSettingsButton: queryElement(appRoot, "#open-settings-btn"),
    manualSaveButton: queryElement(appRoot, "#manual-save-btn"),
    refreshSavesButton: queryElement(appRoot, "#refresh-saves-btn"),
    exitToMenuBtn: queryElement(appRoot, "#exit-to-menu-btn"),
    toastArea: queryElement(appRoot, "#toast-area"),
    devTickLastValue: queryOptionalElement(appRoot, "#dev-tick-last"),
    devTickAvgValue: queryOptionalElement(appRoot, "#dev-tick-avg"),
    devOfflineValue: queryOptionalElement(appRoot, "#dev-offline"),
    mapCanvas: queryElement(appRoot, "#map-canvas"),
    mapLayerSelect: queryElement(appRoot, "#map-layer-select"),
    mapLegend: queryElement(appRoot, "#map-legend"),
    resourceList: queryElement(appRoot, "#resource-list"),
    riskList: queryElement(appRoot, "#risk-list"),
    explainList: queryElement(appRoot, "#explain-list"),
    regionInfo: queryElement(appRoot, "#region-info"),
    regionActions: queryElement(appRoot, "#region-actions"),
    governmentApplyButton: queryElement(appRoot, "#government-apply-btn"),
    councilPanel: queryElement(appRoot, "#council-panel"),
    councilCandidates: queryElement(appRoot, "#council-candidates"),
    councilAdvice: queryElement(appRoot, "#council-advice"),
    budgetInputs: {
      economy: queryElement(appRoot, "#budget-economy"),
      military: queryElement(appRoot, "#budget-military"),
      religion: queryElement(appRoot, "#budget-religion"),
      administration: queryElement(appRoot, "#budget-administration"),
      technology: queryElement(appRoot, "#budget-technology")
    },
    taxInputs: {
      baseRate: queryElement(appRoot, "#tax-base"),
      nobleRelief: queryElement(appRoot, "#tax-noble"),
      clergyExemption: queryElement(appRoot, "#tax-clergy"),
      tariffRate: queryElement(appRoot, "#tax-tariff")
    },
    expansionAutomationSelect: queryElement(appRoot, "#expansion-automation-select"),
    constructionAutomationSelect: queryElement(appRoot, "#construction-automation-select"),
    globalAutomationToggle: queryElement(appRoot, "#global-automation-toggle"),
    techFocusSelect: queryElement(appRoot, "#tech-focus-select"),
    techAutomationSelect: queryElement(appRoot, "#tech-automation-select"),
    techHideCompletedToggle: queryElement(appRoot, "#tech-hide-completed-toggle"),
    techClearGoalButton: queryElement(appRoot, "#tech-clear-goal-btn"),
    techApplyButton: queryElement(appRoot, "#tech-apply-btn"),
    techSummary: queryElement(appRoot, "#tech-summary"),
    techTreeList: queryElement(appRoot, "#tech-tree-list"),
    religionSummary: queryElement(appRoot, "#religion-summary"),
    religionDemographics: queryElement(appRoot, "#religion-demographics"),
    religionChangeSelect: queryElement(appRoot, "#religion-change-select"),
    religionChangeBtn: queryElement(appRoot, "#religion-change-btn"),
    religionPolicySelect: queryElement(appRoot, "#religion-policy-select"),
    religionActiveTenets: queryElement(appRoot, "#religion-active-tenets"),
    diplomacyList: queryElement(appRoot, "#diplomacy-list"),
    militarySummary: queryElement(appRoot, "#military-summary"),
    saveList: queryElement(appRoot, "#save-list"),
    eventList: queryElement(appRoot, "#event-list"),
    profileNameInput: queryElement(appRoot, "#profile-name-input"),
    profileEmailInput: queryElement(appRoot, "#profile-email-input"),
    profileColorInput: queryElement(appRoot, "#profile-color-input"),
    profileIdValue: queryElement(appRoot, "#profile-id-value"),
    profileSaveButton: queryElement(appRoot, "#profile-save-btn"),
    appVersion: queryElement(appRoot, "#app-version"),
    tabButtons: Array.from(appRoot.querySelectorAll<HTMLButtonElement>(".tab-btn")),
    tabPanels: Array.from(appRoot.querySelectorAll<HTMLElement>(".tab-panel")),
    offlineProgressionToggle: queryElement(appRoot, "#settings-offline-progression"),
    immortalityToggle: queryElement(appRoot, "#settings-immortality"),
    splashScreen: queryElement(appRoot, "#splash-screen"),
    splashContinueBtn: queryElement(appRoot, "#splash-continue-btn"),
    splashNewBtn: queryElement(appRoot, "#splash-new-btn"),
    splashForm: queryElement(appRoot, "#splash-form"),
    splashMonarchInput: queryElement(appRoot, "#splash-monarch"),
    splashCountrySelect: queryElement(appRoot, "#splash-country"),
    splashColorInput: queryElement(appRoot, "#splash-color"),
    splashStartBtn: queryElement(appRoot, "#splash-start-btn")
  };

  // --- Lógica de Criação de Personagem (Sala de Guerra) ---
  let playerStats = { administration: 5, martial: 5, diplomacy: 5, intrigue: 5, learning: 5 };
  
  function getUsedPoints() {
    return Object.values(playerStats).reduce((a, b) => a + b, 0);
  }
  
  function updateStatUI() {
    const used = getUsedPoints();
    const left = 25 - used;
    const pointsEl = document.getElementById("splash-points-left");
    if (pointsEl) {
      pointsEl.textContent = `Pontos Restantes: ${left}`;
      pointsEl.style.color = left === 0 ? "#ffffff" : left < 0 ? "#ff5555" : "#4ade80";
    }
  
    for (const stat in playerStats) {
      const valEl = document.getElementById(`stat-val-${stat}`);
      if (valEl) valEl.textContent = String(playerStats[stat as keyof typeof playerStats]);
      
      const btnMinus = document.querySelector(`.btn-stat-minus[data-stat="${stat}"]`) as HTMLButtonElement;
      const btnPlus = document.querySelector(`.btn-stat-plus[data-stat="${stat}"]`) as HTMLButtonElement;
      
      if (btnMinus) btnMinus.disabled = playerStats[stat as keyof typeof playerStats] <= 1;
      if (btnPlus) btnPlus.disabled = playerStats[stat as keyof typeof playerStats] >= 10 || left <= 0;
    }
    
    const startBtn = document.getElementById("splash-start-btn") as HTMLButtonElement;
    if (startBtn) startBtn.disabled = left < 0;
  }
  
  appRoot.querySelectorAll('.btn-stat-minus').forEach(btn => btn.addEventListener('click', (e) => {
    const stat = (e.currentTarget as HTMLElement).dataset.stat as keyof typeof playerStats;
    if (playerStats[stat] > 1) { playerStats[stat]--; updateStatUI(); }
  }));
  appRoot.querySelectorAll('.btn-stat-plus').forEach(btn => btn.addEventListener('click', (e) => {
    const stat = (e.currentTarget as HTMLElement).dataset.stat as keyof typeof playerStats;
    if (playerStats[stat] < 10 && getUsedPoints() < 25) { playerStats[stat]++; updateStatUI(); }
  }));
  appRoot.querySelectorAll('.archetype-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const arch = (e.currentTarget as HTMLElement).dataset.arch;
    if (arch === 'balanced') playerStats = { administration: 5, martial: 5, diplomacy: 5, intrigue: 5, learning: 5 };
    if (arch === 'warrior') playerStats = { administration: 3, martial: 9, diplomacy: 4, intrigue: 6, learning: 3 };
    if (arch === 'scholar') playerStats = { administration: 6, martial: 2, diplomacy: 5, intrigue: 3, learning: 9 };
    if (arch === 'diplomat') playerStats = { administration: 5, martial: 2, diplomacy: 9, intrigue: 6, learning: 3 };
    updateStatUI();
  }));
  updateStatUI();

  // Lógica do Modal de Forjar Religião (Interface Dinâmica)
  const btnOpenFounder = queryOptionalElement<HTMLButtonElement>(appRoot, "#btn-open-founder");
  const rfModal = queryOptionalElement<HTMLElement>(appRoot, "#religion-founder-modal");
  const rfCancel = queryOptionalElement<HTMLButtonElement>(appRoot, "#rf-cancel-btn");
  const rfSubmit = queryOptionalElement<HTMLButtonElement>(appRoot, "#rf-submit-btn");
  const rfTenetsGrid = queryOptionalElement<HTMLElement>(appRoot, "#rf-tenets-grid");
  const rfBudgetText = queryOptionalElement<HTMLElement>(appRoot, "#rf-budget-text");
  const selectedTenets = new Set<string>();

  function updateRfModal() {
    if (!rfTenetsGrid || !rfBudgetText || !rfSubmit) return;
    rfTenetsGrid.innerHTML = "";
    const tenets = staticWorldData.tenets;
    
    let usedBudget = 0;
    selectedTenets.forEach(id => usedBudget += tenets[id]?.cost || 0);
    const remaining = 100 - usedBudget;
    
    rfBudgetText.textContent = `Orçamento: ${remaining} Pontos`;
    rfBudgetText.style.color = remaining < 0 ? "#ff5555" : "#4ade80";

    for (const tId in tenets) {
      const t = tenets[tId];
      const isSelected = selectedTenets.has(tId);
      const card = document.createElement("div");
      card.className = `tenet-card ${isSelected ? 'selected' : ''}`;
      const costClass = t.cost > 0 ? "tenet-cost negative" : "tenet-cost";
      const costSign = t.cost > 0 ? "-" : "+";
      card.innerHTML = `<h4><span>${t.name}</span> <span class="${costClass}">${costSign}${Math.abs(t.cost)}</span></h4><p>${t.description}</p>`;
      
      card.addEventListener("click", () => {
        if (isSelected) selectedTenets.delete(tId);
        else {
          selectedTenets.add(tId);
        }
        updateRfModal();
      });
      rfTenetsGrid.appendChild(card);
    }
    
    const state = session.getState();
    const canAffordBase = state ? playerFaithCache >= 1000 && getPlayerTotalResource(state, ResourceType.Legitimacy) >= 50 : false;
    rfSubmit.disabled = remaining < 0 || !canAffordBase || selectedTenets.size === 0;
  }

  if (btnOpenFounder && rfModal) {
    btnOpenFounder.addEventListener("click", () => { 
      document.body.classList.add("is-modal-open");
      selectedTenets.clear(); updateRfModal(); rfModal.classList.remove("is-hidden"); 
    });
  }
  if (rfCancel && rfModal) rfCancel.addEventListener("click", () => {
    rfModal.classList.add("is-hidden");
    document.body.classList.remove("is-modal-open");
  });
  if (rfSubmit && rfModal) {
    rfSubmit.addEventListener("click", () => {
      const res = session.foundCustomReligion({
        name: (document.getElementById("rf-name") as HTMLInputElement).value.trim(),
        color: (document.getElementById("rf-color") as HTMLInputElement).value,
        deityName: (document.getElementById("rf-deity-name") as HTMLInputElement).value.trim(),
        deityDescription: (document.getElementById("rf-deity-desc") as HTMLInputElement).value.trim(),
        tenets: Array.from(selectedTenets)
      });
      if (res.ok) {
        rfModal.classList.add("is-hidden"); 
        document.body.classList.remove("is-modal-open");
        showToast(res.message);
        const state = session.getState();
        if (state) {
          const p = getPlayerKingdom(state); const idxs = getPlayerRegionIndicesCached(state, p);
          simulationWorker.postMessage({ type: "APPLY_ECS_EFFECTS", payload: { target: "faith", operation: "subtract_empire_total", value: 1000, indices: idxs } });
          simulationWorker.postMessage({ type: "APPLY_ECS_EFFECTS", payload: { target: "legitimacy", operation: "subtract_empire_total", value: 50, indices: idxs } });
          playerFaithCache -= 1000; updateUIPanel();
        }
      } else showToast(res.message);
    });
  }

  const simulationWorker = new Worker(
    new URL("./infrastructure/worker/simulation.worker.ts", import.meta.url),
    { type: "module" }
  );
  
  // Interceptador O(1) de Tráfego de Saída (Main -> Worker)
  const originalWorkerPost = simulationWorker.postMessage.bind(simulationWorker);
  simulationWorker.postMessage = (msg: any) => {
    // Filtra comandos de alta frequência para não poluir o console
    if (msg.type !== "SET_TIME_SCALE" && msg.type !== "START" && msg.type !== "STOP") {
      // Oculta payloads gigantescos para manter a legibilidade
      const isHeavyPayload = msg.type === "RESTORE_ECS_STATE" || msg.type === "UPDATE_MODIFIERS";
      const payloadForLog = isHeavyPayload ? "[Matrizes Omitidas por Performance]" : msg.payload;

      Diagnostic.trace("WRK-TX", `Ordem enviada ao Motor Físico: ${msg.type}`, payloadForLog);
    }
    originalWorkerPost(msg);
  };

  simulationWorker.onmessage = (event: MessageEvent) => {
    if (Date.now() < ignoreWorkerTicksUntil) {
      return; // Descarta ticks fantasmas/velhos gerados antes do carregamento
    }

    const data = event.data as {
      type?: string;
      payload?: {
        timestamp?: number;
        goldData?: Float64Array;
        foodData?: Float64Array;
        woodData?: Float64Array;
        ironData?: Float64Array;
        faithData?: Float64Array;
        legitimacyData?: Float64Array;
        populationTotalData?: Float64Array;
        populationGrowthRateData?: Float64Array;
        manpowerData?: Float64Array;
      };
    };
    if (data?.type === "TICK" || data?.type === "INITIAL_STATE") {
      const payload = data.payload;
      if (payload?.goldData instanceof Float64Array) {
        currentSimulationState.goldData = payload.goldData;
      }
      if (payload?.foodData instanceof Float64Array) {
        currentSimulationState.foodData = payload.foodData;
      }
      if (payload?.woodData instanceof Float64Array) {
        currentSimulationState.woodData = payload.woodData;
      }
      if (payload?.ironData instanceof Float64Array) {
        currentSimulationState.ironData = payload.ironData;
      }
      if (payload?.faithData instanceof Float64Array) {
        currentSimulationState.faithData = payload.faithData;
      }
      if (payload?.legitimacyData instanceof Float64Array) {
        currentSimulationState.legitimacyData = payload.legitimacyData;
      }
      if (payload?.populationTotalData instanceof Float64Array) {
        currentSimulationState.populationTotalData = payload.populationTotalData;
      }
      if (payload?.populationGrowthRateData instanceof Float64Array) {
        currentSimulationState.populationGrowthRateData = payload.populationGrowthRateData;
      }
      if (payload?.manpowerData instanceof Float64Array) {
        currentSimulationState.manpowerData = payload.manpowerData;
      }

      // Atualiza o GameState na sessão com os dados mais recentes do worker.
      // Isso é crucial para que as decisões lógicas (como canAfford) usem dados frescos.
      if (payload) {
        session.updateEcsState({
          gold: payload.goldData ?? new Float64Array(),
          food: payload.foodData ?? new Float64Array(),
          wood: payload.woodData ?? new Float64Array(),
          iron: payload.ironData ?? new Float64Array(),
          faith: payload.faithData ?? new Float64Array(),
          legitimacy: payload.legitimacyData ?? new Float64Array(),
          populationTotal: payload.populationTotalData ?? new Float64Array(),
          populationGrowthRate: payload.populationGrowthRateData ?? new Float64Array(),
          manpower: payload.manpowerData ?? new Float64Array()
        });
      }

      updateUIPanel();
    } else {
      Diagnostic.trace("WRK-RX", `Resposta recebida do Motor Físico: ${data?.type}`, data?.payload);
    }
  };

  const totalCountries = WORLD_DEFINITIONS_V1.length;
  simulationWorker.postMessage({ 
    type: "INIT" as const, 
    payload: { entityCount: totalCountries, isWaterData: STATIC_IS_WATER, biomeData: STATIC_BIOME } 
  });

  // Impede o travamento do DOM listando apenas as 300 regiões de terra com maior valor estratégico
  const playableDefs = WORLD_DEFINITIONS_V1
    .filter(def => !def.isWater)
    .sort((a, b) => (b.economyValue + b.strategicValue) - (a.economyValue + a.strategicValue))
    .slice(0, 300);
    
  for (const def of playableDefs) {
    const opt = document.createElement("option");
    opt.value = def.id;
    opt.textContent = `${def.name} (Riqueza Eco: ${def.economyValue})`;
    ui.splashCountrySelect.appendChild(opt);
  }

  const resourceLabels: Record<ResourceType, string> = {
    gold: "Ouro",
    food: "Comida",
    wood: "Madeira",
    iron: "Ferro",
    faith: "Fé",
    legitimacy: "Legitimidade"
  };

  const governmentInputs = [
    ...Object.values(ui.taxInputs),
    ...Object.values(ui.budgetInputs)
  ];

  let profile = loadLocalProfile();
  
  const activeCampaignId = `campaign:${profile.id}`;
  const staticWorldData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);

  const eventBus = new LocalEventBus();
  const npcDecisionService = new UtilityNpcDecisionService(staticWorldData);
  const diplomacyResolver = new LocalDiplomacyResolver();
  const warResolver = new LocalWarResolver(staticWorldData);
  const persistence = createRuntimePersistenceBundle(activeCampaignId, fsDirHandle);

  const session = new GameSession({
    gameStateRepository: persistence.gameStateRepository,
    saveRepository: persistence.saveRepository,
    staticWorldData,
    commandLogRepository: persistence.commandLogRepository,
    snapshotRepository: persistence.snapshotRepository,
    clock: new BrowserClockService(1_000),
    eventBus,
    diplomacyResolver,
    warResolver,
    systems: createDefaultSimulationSystems({
      npcDecisionService,
      diplomacyResolver,
      warResolver,
      eventBus,
      staticData: staticWorldData,
      orderedDefinitions: WORLD_DEFINITIONS_V1
    }),
    autosaveEveryTicks: 5,
    maxOfflineTicks: 12_000,
    snapshotEveryTicks: 25,
    maxSnapshots: 20
  });

  let selectedRegionId: string | null = null;
  let selectedMapLabel: string | null = null;
  let toastTimeout: number | null = null;
  let isGovernmentFormDirty = false;
  let hideCompletedTechnologies = true;
  let ignoreWorkerTicksUntil = 0;
  let isFogOfTruthDisabled = false; // Controle do Modo Deus
  let currentWorkerSpeed = 1;
  let currentWorkerPaused = false;
  
  let playerFaithCache = 0;
  let lastCandidatePoolHash = "";

  // TELEMETRIA CONTÍNUA (Exame Holter)
  let isRecordingTelemetry = false;
  let telemetryData: any = null;

  const originalPublish = eventBus.publish.bind(eventBus);
  eventBus.publish = (event: any) => {
    if (isRecordingTelemetry && telemetryData && telemetryData.eventosOcorridos) {
      // Filtra os eventos passivos de sistema para focar estritamente na História/Mecânica
      if (event.type !== "game.autosaved" && event.type !== "game.loaded") {
        telemetryData.eventosOcorridos.push(structuredClone(event));
      }
    }
    originalPublish(event);
  };

  // CACHE DE TERRITÓRIO: Evita varrer 62.400 regiões múltiplas vezes por segundo
  let cachedPlayerRegionIndices: number[] | null = null;

  function getPlayerRegionIndicesCached(state: GameState, player: KingdomState): number[] {
    if (cachedPlayerRegionIndices !== null) {
      return cachedPlayerRegionIndices;
    }
    
    cachedPlayerRegionIndices = [];
    const len = WORLD_DEFINITIONS_V1.length;
    for (let i = 0; i < len; i++) {
      const def = WORLD_DEFINITIONS_V1[i];
      if (!def.isWater && state.world.regions[def.id]?.ownerId === player.id) {
        cachedPlayerRegionIndices.push(i);
      }
    }
    return cachedPlayerRegionIndices;
  }

  // Extrai índices geográficos dinâmicos para aplicar efeitos em qualquer nação (Player ou NPC)
  function getKingdomRegionIndices(state: GameState, kingdomId: string): number[] {
    const indices: number[] = [];
    const len = WORLD_DEFINITIONS_V1.length;
    for (let i = 0; i < len; i++) {
      const def = WORLD_DEFINITIONS_V1[i];
      if (!def.isWater && state.world.regions[def.id]?.ownerId === kingdomId) {
        indices.push(i);
      }
    }
    return indices;
  }

  let currentSimulationState: {
    goldData: Float64Array;
    foodData: Float64Array;
    woodData: Float64Array;
    ironData: Float64Array;
    faithData: Float64Array;
    legitimacyData: Float64Array;
    populationTotalData: Float64Array;
    populationGrowthRateData: Float64Array;
    manpowerData: Float64Array;
  } = {
    goldData: new Float64Array(0),
    foodData: new Float64Array(0),
    woodData: new Float64Array(0),
    ironData: new Float64Array(0),
    faithData: new Float64Array(0),
    legitimacyData: new Float64Array(0),
    populationTotalData: new Float64Array(0),
    populationGrowthRateData: new Float64Array(0),
    manpowerData: new Float64Array(0)
  };
  let resourcesInitialized = false;

  let syncModifiersTimeout: number | null = null;
  let pendingStateForSync: GameState | null = null;

  // FAGULHA VITAL 3.0: Compila e despacha a soma de todos os bônus tecnológicos para o Motor Matemático
  function syncModifiersToWorker(state: GameState): void {
    pendingStateForSync = state;
    if (syncModifiersTimeout !== null) return;
    
    syncModifiersTimeout = window.setTimeout(() => {
      syncModifiersTimeout = null;
      const stateToSync = pendingStateForSync;
      if (!stateToSync) return;
      
      const expectedLength = WORLD_DEFINITIONS_V1.length;
      const modifiers: Record<string, Float64Array> = {
        "economy.food_production_multiplier": new Float64Array(expectedLength),
        "economy.tax_income_multiplier": new Float64Array(expectedLength),
        "population.growth_rate_multiplier": new Float64Array(expectedLength),
        "population.carrying_capacity_multiplier": new Float64Array(expectedLength),
        "military.manpower_modifier": new Float64Array(expectedLength),
      };

      const kingdomBonuses = new Map<string, Map<string, number>>();
      for (const kingdomId in stateToSync.kingdoms) {
        kingdomBonuses.set(kingdomId, calculateTechnologyBonuses(stateToSync.kingdoms[kingdomId].technology));
      }

      // Roteia cada Bônus Nacional para as células geográficas que ele governa O(N)
      for (let i = 0; i < expectedLength; i++) {
        const regionId = WORLD_DEFINITIONS_V1[i].id;
        const region = stateToSync.world.regions[regionId];
        const ownerId = region?.ownerId;
        if (ownerId) {
          const bonuses = kingdomBonuses.get(ownerId);
          if (bonuses) {
            modifiers["economy.food_production_multiplier"][i] = bonuses.get("economy.food_production_multiplier") ?? 0;
            modifiers["economy.tax_income_multiplier"][i] = bonuses.get("economy.tax_income_multiplier") ?? 0;
            modifiers["population.growth_rate_multiplier"][i] = bonuses.get("population.growth_rate_multiplier") ?? 0;
            modifiers["population.carrying_capacity_multiplier"][i] = bonuses.get("population.carrying_capacity_multiplier") ?? 0;
            modifiers["military.manpower_modifier"][i] = bonuses.get("military.manpower_modifier") ?? 0;
          }
          
          // Bônus Assímétricos de Edifícios (Locais)
          if (region.buildings) {
            for (let b = 0; b < region.buildings.length; b++) {
               const building = region.buildings[b];
               if (building === BuildingType.Market) {
                  modifiers["economy.tax_income_multiplier"][i] += 0.25;
               } else if (building === BuildingType.Barracks) {
                  modifiers["military.manpower_modifier"][i] += 0.25;
               }
            }
          }
        }
      }

      simulationWorker.postMessage({ type: "UPDATE_MODIFIERS", payload: modifiers });
    }, 16);
  }

  // Efeito Visual de Feedback (Animação de Pulso de Cores)
  function flashUIElement(el: HTMLElement | null, color: string) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.color = color;
    el.style.textShadow = `0 0 10px ${color}`;
    // Força o reflow do DOM para garantir que a transição comece de imediato
    void el.offsetWidth;
    el.style.transition = 'color 1.2s ease-out, text-shadow 1.2s ease-out';
    el.style.color = '';
    el.style.textShadow = '';
  }

  function showToast(message: string): void {
    ui.toastArea.textContent = message;
    ui.toastArea.style.display = "block";
    ui.toastArea.style.animation = "fadeIn 0.2s ease";

    if (toastTimeout !== null) {
      window.clearTimeout(toastTimeout);
    }

    toastTimeout = window.setTimeout(() => {
      ui.toastArea.style.display = "none";
      toastTimeout = null;
    }, 3500);
  }

  function setActiveTab(tabId: TabId): void {
    for (const button of ui.tabButtons) {
      button.classList.toggle("is-active", button.dataset.tab === tabId);
    }

    for (const panel of ui.tabPanels) {
      panel.classList.toggle("is-hidden", panel.dataset.tabPanel !== tabId);
    }

    // Notificar gerenciador de controladores sobre mudança de aba
    tabControllerManager.setActiveTab(tabId);
  }

  function syncProfileUi(): void {
    ui.playerValue.textContent = profile.name;
    ui.profileNameInput.value = profile.name;
    ui.profileEmailInput.value = profile.email;
    ui.profileColorInput.value = profile.color || "#d4af37";
    ui.profileIdValue.textContent = profile.id;
  }

  function isGovernmentInputFocused(): boolean {
    const active = document.activeElement;
    return governmentInputs.includes(active as HTMLInputElement);
  }
  
  // highlight-start
  // Envia o estado do ECS para o worker quando um jogo é carregado
  eventBus.subscribe("game.loaded", (event: any) => {
    // Suporta tanto a injeção antiga quanto o objeto de DomainEvent nativo
    const state = (event.payload || event) as GameState;
    
    const len = WORLD_DEFINITIONS_V1.length;

    // FAGULHA VITAL 2.0: Proteção contra saves mortos (Ausentes ou População Zerada)
    if (!state.ecs) {
      state.ecs = {
        gold: Array.from(new Float64Array(len).fill(500)) as any,
        food: Array.from(new Float64Array(len).fill(1000)) as any,
        wood: Array.from(new Float64Array(len).fill(500)) as any,
        iron: Array.from(new Float64Array(len).fill(100)) as any,
        faith: Array.from(new Float64Array(len).fill(50)) as any,
        legitimacy: Array.from(new Float64Array(len).fill(50)) as any,
        populationTotal: Array.from(new Float64Array(len).fill(5000)) as any,
        populationGrowthRate: Array.from(new Float64Array(len).fill(0.00015)) as any,
        manpower: Array.from(new Float64Array(len).fill(0)) as any
      };
    } else {
      // Vacina: Se o save veio com População morta (artefato de testes antigos), revive o mundo
      const pop = state.ecs.populationTotal as any;
      let totalLandPopulation = 0;
      
      if (pop && pop.length > 0) {
        for (let i = 0; i < Math.min(pop.length, len); i++) {
          if (STATIC_IS_WATER[i] === 0) {
            totalLandPopulation += pop[i] || 0;
          }
        }
      }

      const isWorldDead = totalLandPopulation <= 0;

      if (isWorldDead) {
        Diagnostic.warn("PERS-003", "Fagulha Vital: Save antigo corrompido detectado (Mundo Morto). Injetando sobreviventes apenas em terra firme.");
        const safePop = new Float64Array(len);
        const safeGrowth = new Float64Array(len);
        for (let i = 0; i < len; i++) {
          if (STATIC_IS_WATER[i] === 0) {
            safePop[i] = 5000;
            safeGrowth[i] = 0.00015;
          }
        }
        state.ecs.populationTotal = Array.from(safePop) as any;
        state.ecs.populationGrowthRate = Array.from(safeGrowth) as any;
      }
    }

    if (state.ecs) {
      const expectedLength = WORLD_DEFINITIONS_V1.length;
      const toFloat = (data: any) => {
        const arr = new Float64Array(expectedLength);
        if (!data) return arr;

        if (data instanceof Float64Array || Array.isArray(data)) {
          const limit = Math.min(data.length, expectedLength);
          for (let i = 0; i < limit; i++) {
            arr[i] = data[i] || 0;
          }
          return arr;
        }

        if (typeof data === 'object') {
          for (let i = 0; i < expectedLength; i++) {
            arr[i] = data[i] || 0;
          }
        }
        return arr;
      };
      
      // Evita race conditions pausando o worker durante a restauração
      simulationWorker.postMessage({ type: "STOP" });
      simulationWorker.postMessage({ 
        type: "INIT", 
        payload: { entityCount: expectedLength, isWaterData: STATIC_IS_WATER, biomeData: STATIC_BIOME } 
      });
      
      const payload = {
        gold: toFloat(state.ecs.gold),
        food: toFloat(state.ecs.food),
        wood: toFloat(state.ecs.wood),
        iron: toFloat(state.ecs.iron),
        faith: toFloat(state.ecs.faith),
        legitimacy: toFloat(state.ecs.legitimacy),
        populationTotal: toFloat(state.ecs.populationTotal),
        populationGrowthRate: toFloat(state.ecs.populationGrowthRate),
        manpower: toFloat(state.ecs.manpower),
        
        // Duplicado com sufixo Data para garantir compatibilidade com diferentes versões do Worker
        goldData: toFloat(state.ecs.gold),
        foodData: toFloat(state.ecs.food),
        woodData: toFloat(state.ecs.wood),
        ironData: toFloat(state.ecs.iron),
        faithData: toFloat(state.ecs.faith),
        legitimacyData: toFloat(state.ecs.legitimacy),
        populationTotalData: toFloat(state.ecs.populationTotal),
        populationGrowthRateData: toFloat(state.ecs.populationGrowthRate),
        manpowerData: toFloat(state.ecs.manpower),
      };

      simulationWorker.postMessage({ type: "RESTORE_ECS_STATE", payload });
      syncModifiersToWorker(state); // Injeta a tecnologia no carregamento do Save
      simulationWorker.postMessage({ type: "START" });

      ignoreWorkerTicksUntil = Date.now() + 500;

      currentSimulationState.goldData = payload.gold;
      currentSimulationState.foodData = payload.food;
      currentSimulationState.woodData = payload.wood;
      currentSimulationState.ironData = payload.iron;
      currentSimulationState.faithData = payload.faith;
      currentSimulationState.legitimacyData = payload.legitimacy;
      currentSimulationState.populationTotalData = payload.populationTotal;
      currentSimulationState.populationGrowthRateData = payload.populationGrowthRate;
      currentSimulationState.manpowerData = payload.manpower;
      
      playerFaithCache = getPlayerTotalResource(state, ResourceType.Faith);

      updateUIPanel();
    }
  });

  // Evento assíncrono caso uma nova região seja capturada via guerra e necessite de recálculo
  eventBus.subscribe("war.region_captured", () => {
    const state = session.getState();
    if (state) syncModifiersToWorker(state);
  });

  eventBus.subscribe("region.building_completed", () => {
    const state = session.getState();
    if (state) syncModifiersToWorker(state);
  });

  eventBus.subscribe("automation.build_structure", (event: any) => {
    const state = session.getState();
    if (!state) return;
    const { regionId, buildingType, cost } = event.payload;
    const kingdomId = event.actorKingdomId;

    const indices = [REGION_INDEX_MAP.get(state.kingdoms[kingdomId]?.capitalRegionId || "")].filter(i => i !== undefined) as number[];
    if (indices.length > 0) {
      for (const [res, val] of Object.entries(cost)) {
        simulationWorker.postMessage({
          type: "APPLY_ECS_EFFECTS",
          payload: { target: res, operation: "subtract", value: val, indices }
        });
      }
    }
    syncModifiersToWorker(state);
    if (state.kingdoms[kingdomId]?.isPlayer) {
      const bName = session.getBuildingConfig(buildingType as BuildingType).label;
      showToast(`Obras finalizadas: ${bName} em ${staticWorldData.definitions[regionId]?.name || regionId}.`);
    }
  });

  eventBus.subscribe("council.advice_issued", (event: any) => {
    const urgency = event.payload.urgency;
    showToast(`Novo relatório do Conselho Real ${urgency === 'high' ? 'URGENTE' : ''}!`);
  });

  // ALVO B: Ouve eventos da simulação POO e dispara danos instantâneos na Memória ECS (Desastres)
  function applyEmpireEcsEffect(
    kingdomId: string | undefined,
    target: "food" | "population",
    operation: "add_empire_total" | "subtract_empire_total",
    value: number
  ): void {
    if (!kingdomId || value <= 0) {
      return;
    }

    const state = session.getState();
    if (!state) {
      return;
    }

    const indices = getKingdomRegionIndices(state, kingdomId);
    if (indices.length === 0) {
      return;
    }

    simulationWorker.postMessage({
      type: "APPLY_ECS_EFFECTS",
      payload: { target, operation, value, indices }
    });
  }

  eventBus.subscribe("disaster.plague", (event: any) => {
    applyEmpireEcsEffect(
      event.actorKingdomId,
      "population",
      "subtract_empire_total",
      Number(event.payload?.amount ?? 0)
    );
  });

  eventBus.subscribe("disaster.drought", (event: any) => {
    applyEmpireEcsEffect(
      event.actorKingdomId,
      "food",
      "subtract_empire_total",
      Number(event.payload?.amount ?? 0)
    );
  });

  // Escuta os poderes divinos POO e aplica o benefício nas matrizes ECS
  eventBus.subscribe("event.bountiful_harvest", (event: any) => {
    applyEmpireEcsEffect(
      event.actorKingdomId,
      "food",
      "add_empire_total",
      Number(event.payload?.amount ?? 0)
    );
  });

  eventBus.subscribe("event.population_migration", (event: any) => {
    applyEmpireEcsEffect(
      event.actorKingdomId,
      "population",
      "add_empire_total",
      Number(event.payload?.amount ?? 0)
    );
  });

  eventBus.subscribe("event_chain.economic_crisis", (event: any) => {
    if (event.payload?.impact !== "food_shortage") {
      return;
    }

    applyEmpireEcsEffect(
      event.actorKingdomId,
      "food",
      "subtract_empire_total",
      Number(event.payload?.amount ?? 0)
    );
  });

  eventBus.subscribe("religion.blessing", (event: any) => {
    const state = session.getState();
    if (!state) return;
    const kingdomId = event.payload.kingdomId || event.kingdomId;
    const indices = getKingdomRegionIndices(state, kingdomId);
    if (indices.length === 0) return;

    simulationWorker.postMessage({
      type: "APPLY_ECS_EFFECTS",
      payload: { 
        target: "food", 
        operation: "add_empire_total", 
        value: event.payload.amount, 
        indices
      }
    });
    const foodEl = ui.resourceList.querySelector<HTMLLIElement>(`li[data-resource="food"]`);
    flashUIElement(foodEl, "#00ff00");
    showToast(`As colheitas de ${state.kingdoms[kingdomId]?.name} florescem (+${formatNumber(event.payload.amount)} Comida)!`);
  });

  // Escuta as Ordens Sociais (Migração Orgânica) e converte em mutações de Worker
  eventBus.subscribe("population.migration", (event: any) => {
    const state = session.getState();
    Diagnostic.system("MIG-SYS", "Evento de Migração Orgânica recebido.", event.payload);

    if (!state) return;
    const { sourceId, targetId, amount, kingdomId } = event.payload;
    const sourceIdx = REGION_INDEX_MAP.get(sourceId);
    const targetIdx = REGION_INDEX_MAP.get(targetId);

    if (sourceIdx !== undefined && targetIdx !== undefined) {
      // O trânsito atômico exige dedução da origem e injeção no alvo
      simulationWorker.postMessage({
        type: "APPLY_ECS_EFFECTS",
        payload: { target: "population", operation: "subtract", value: amount, indices: [sourceIdx] }
      });
      simulationWorker.postMessage({
        type: "APPLY_ECS_EFFECTS",
        payload: { target: "population", operation: "add", value: amount, indices: [targetIdx] }
      });

      // Atualiza o Motor com as capacidades geográficas da nova região
      syncModifiersToWorker(state);

      // Log narrativo se for a sua civilização que migrou
      if (state.kingdoms[kingdomId]?.isPlayer) {
        const def = staticWorldData.definitions[targetId];
        state.events.unshift({
          id: `mig_${state.meta.tick}_${targetId}`,
          title: "Expansão Tribal Orgânica",
          details: `O excesso populacional transbordou as fronteiras, assentando os nossos nômades na região de ${def?.name ?? targetId}.`,
          severity: "info",
          occurredAt: Date.now()
        });
        if (state.events.length > 50) state.events.pop(); // Limpeza de Memória
      }
    }
  });

  // Escuta o Êxodo Nômade e transporta os recursos e população instantaneamente no Worker
  eventBus.subscribe("population.exodus", (event: any) => {
    const state = session.getState();
    Diagnostic.system("MIG-SYS", "Evento de Êxodo Nômade recebido.", event.payload);

    if (!state) return;
    const { sourceId, targetId, kingdomId } = event.payload;
    const sourceIdx = REGION_INDEX_MAP.get(sourceId);
    const targetIdx = REGION_INDEX_MAP.get(targetId);

    if (sourceIdx !== undefined && targetIdx !== undefined) {
      const resources = ["gold", "food", "wood", "iron", "faith", "legitimacy", "population", "manpower"] as const;
      
      for (const res of resources) {
        let amount = 0;
        switch(res) {
          case "gold": amount = currentSimulationState.goldData[sourceIdx] || 0; break;
          case "food": amount = currentSimulationState.foodData[sourceIdx] || 0; break;
          case "wood": amount = currentSimulationState.woodData[sourceIdx] || 0; break;
          case "iron": amount = currentSimulationState.ironData[sourceIdx] || 0; break;
          case "faith": amount = currentSimulationState.faithData[sourceIdx] || 0; break;
          case "legitimacy": amount = currentSimulationState.legitimacyData[sourceIdx] || 0; break;
          case "population": amount = currentSimulationState.populationTotalData[sourceIdx] || 0; break;
          case "manpower": amount = currentSimulationState.manpowerData[sourceIdx] || 0; break;
        }

        if (amount > 0) {
          // Transfere o valor exato lido no último tick para o novo hexágono e aniquila os vestígios na origem
          simulationWorker.postMessage({ type: "APPLY_ECS_EFFECTS", payload: { target: res, operation: "add", value: amount, indices: [targetIdx] } });
          simulationWorker.postMessage({ type: "APPLY_ECS_EFFECTS", payload: { target: res, operation: "set", value: 0, indices: [sourceIdx] } });
        }
      }

      syncModifiersToWorker(state); // Reajusta limites de bioma

      if (state.kingdoms[kingdomId]?.isPlayer) {
        const def = staticWorldData.definitions[targetId];
        state.events.unshift({ id: `exo_${state.meta.tick}_${targetId}`, title: "Êxodo Nômade", details: `A tribo abandonou suas terras ancestrais e migrou em massa para ${def?.name ?? targetId}.`, severity: "info", occurredAt: Date.now() });
        if (state.events.length > 50) state.events.pop();
      }
    }
  });

  // ALVO B2: Aplicação do Dano Militar Físico (As guerras matam a população real)
  eventBus.subscribe("war.casualties", (event: any) => {
    const state = session.getState();
    if (!state) return;
    
    const kingdomId = event.actorKingdomId;
    const amount = event.payload?.amount;
    if (!amount || amount <= 0) return;

    const indices = getKingdomRegionIndices(state, kingdomId);
    if (indices.length === 0) return;

    simulationWorker.postMessage({
      type: "APPLY_ECS_EFFECTS",
      payload: { target: "population", operation: "subtract_empire_total", value: amount, indices }
    });
  });

  // Inicializar gerenciador de controladores de abas (MVC/MVP Pattern)
  tabControllerManager.initialize(ui, session);

  // highlight-end
  const mapRenderer = new HybridMapRenderer(ui.mapCanvas, staticWorldData, (selection: MapSelection) => {
    selectedRegionId = selection.regionId;
    selectedMapLabel = selection.label ?? selection.regionId;

    renderRegionInfo(session.getState());
    setActiveTab("mapa");
    updateUIPanel();
  });

  eventBus.subscribe("victory.achieved", () => {
    showToast("Caminho de vitória alcançado. O império segue em modo contínuo.");
  });

  function renderHeader(state: GameState): void {
    ui.playerValue.textContent = profile.name;
    ui.tickValue.textContent = formatCalendarTime(state.meta.tick);
    ui.updatedValue.textContent = formatDate(state.meta.lastUpdatedAt);
    ui.statusValue.textContent = state.meta.paused ? "Pausado" : "Executando";
    ui.pauseButton.textContent = state.meta.paused ? "Retomar" : "Pausar";
    ui.speedSelect.value = String(state.meta.speedMultiplier);

    ui.victoryValue.textContent = state.victory.achievedPath ?? "Ainda não alcançada";
    ui.postVictoryValue.textContent = state.victory.postVictoryMode
      ? `${formatNumber(state.victory.crisisPressure * 100)}%`
      : "-";
  }

  function renderRuntimeMetrics(metrics: RuntimeMetrics): void {
    if (!ui.devTickLastValue || !ui.devTickAvgValue || !ui.devOfflineValue) {
      return;
    }

    ui.devTickLastValue.textContent = formatNumber(metrics.tickMsLast, 2);
    ui.devTickAvgValue.textContent = formatNumber(metrics.tickMsAverage, 2);
    ui.devOfflineValue.textContent = `${formatNumber(metrics.offlineCatchUpMs, 2)} ms / ${metrics.offlineTicks} ticks`;
  }

  function renderResources(): void {
    if (!resourcesInitialized) {
      ui.resourceList.innerHTML = "";

      for (const resource of Object.keys(resourceLabels) as ResourceType[]) {
        const item = document.createElement("li");
        item.dataset.resource = resource;
        // Inicializa com 0; updateUIPanel irá preencher com os dados do worker.
        item.textContent = `${resourceLabels[resource]}: 0`;
        ui.resourceList.appendChild(item);
      }

      resourcesInitialized = true;
    }
    // A atualização agora é feita exclusivamente pela função updateUIPanel
    // para garantir que os dados venham sempre do worker (ECS).
  }

  function updateUIPanel(): void {
    const state = session.getState();
    if (!state) {
      return;
    }

    const player = getPlayerKingdom(state);
    
    const playerRegionIndices = getPlayerRegionIndicesCached(state, player);

    const totals: Record<string, number> = {};
    const allResources = currentSimulationState;

    for (const resource of Object.keys(resourceLabels) as ResourceType[]) {
      const dataArray = allResources[`${resource}Data` as keyof typeof allResources];
      let total = 0;
      if (dataArray) {
        for (const index of playerRegionIndices) {
          if (index < dataArray.length) {
            total += dataArray[index];
          }
        }
      }
      totals[resource] = total;

      if (resource === ResourceType.Faith) playerFaithCache = total;

      const item = ui.resourceList.querySelector<HTMLLIElement>(`li[data-resource="${resource}"]`);
      if (item) {
        item.textContent = `${resourceLabels[resource]}: ${formatNumber(totals[resource])}`;
      }
    }

    const faithEl = appRoot!.querySelector("#faith-pool-value");
    if (faithEl) {
      faithEl.textContent = formatNumber(playerFaithCache);
    }
  }

  function getPlayerTotalPopulation(state: GameState): number {
    const player = getPlayerKingdom(state);
    
    const playerRegionIndices = getPlayerRegionIndicesCached(state, player);

    let total = 0;
    const popData = currentSimulationState.populationTotalData;
    if (popData) {
      for (const index of playerRegionIndices) {
        if (index < popData.length) {
          total += popData[index];
        }
      }
    }
    return total;
  }

  function getPlayerTotalResource(state: GameState, resource: ResourceType): number {
    const player = getPlayerKingdom(state);
    
    const playerRegionIndices = getPlayerRegionIndicesCached(state, player);

    let total = 0;
    const dataArray = currentSimulationState[`${resource}Data` as keyof typeof currentSimulationState];
    if (dataArray) {
      for (const index of playerRegionIndices) {
        if (index < dataArray.length) {
          total += dataArray[index];
        }
      }
    }
    return total;
  }

  function getPlayerTotalManpower(state: GameState): number {
    const player = getPlayerKingdom(state);
    const playerRegionIndices = getPlayerRegionIndicesCached(state, player);

    let total = 0;
    const dataArray = currentSimulationState.manpowerData;
    if (dataArray) {
      for (const index of playerRegionIndices) {
        if (index < dataArray.length) {
          total += dataArray[index];
        }
      }
    }
    return total;
  }

  function renderRiskIndicators(state: GameState): void {
    const player = getPlayerKingdom(state);
    const playerIndices = getPlayerRegionIndicesCached(state, player);

    let maxUnrest = 0;
    for (const idx of playerIndices) {
      const regionId = WORLD_DEFINITIONS_V1[idx].id;
      const unrest = state.world.regions[regionId]?.unrest || 0;
      if (unrest > maxUnrest) maxUnrest = unrest;
    }

    // A necessidade de comida e o estoque agora são baseados nos dados do ECS.
    const totalFood = getPlayerTotalResource(state, ResourceType.Food);
    const foodNeed = getPlayerTotalPopulation(state) / 8_000;
    const famine = foodNeed <= 0 ? 0 : Math.max(0, (foodNeed - totalFood) / foodNeed);
    const revolt = maxUnrest;

    const atWar = Object.keys(state.wars)
      .sort()
      .some((warId) => {
        const war = state.wars[warId];
        return war.attackers.includes(player.id) || war.defenders.includes(player.id);
      });

    const worstRivalry = Object.keys(player.diplomacy.relations)
      .sort()
      .map((relationId) => player.diplomacy.relations[relationId])
      .reduce((top, relation) => Math.max(top, relation.score.rivalry), 0);

    const warRisk = atWar ? 1 : worstRivalry;

    const entries = [
      { label: "Fome", value: famine },
      { label: "Revolta", value: revolt },
      { label: "Guerra", value: warRisk }
    ];

    ui.riskList.innerHTML = "";

    for (const entry of entries) {
      const item = document.createElement("li");
      item.className = `risk-item ${riskClass(entry.value)}`;
      item.innerHTML = `<span>${entry.label}</span><strong>${formatNumber(entry.value * 100)}%</strong>`;
      ui.riskList.appendChild(item);
    }
  }

  function renderExplainers(state: GameState): void {
    const player = getPlayerKingdom(state);
    const explainers: Array<{ label: string; reason: string; suggestion: string; level: "low" | "medium" | "high" }> = [];

    // A reserva de comida e a população agora são baseadas nos dados do ECS.
    const totalPopulation = getPlayerTotalPopulation(state);
    const totalFood = getPlayerTotalResource(state, ResourceType.Food);
    const foodReserveTarget = totalPopulation / 8_000;
    const foodGap = foodReserveTarget <= 0 ? 0 : (foodReserveTarget - totalFood) / foodReserveTarget;
    if (foodGap > 0.35) {
      explainers.push({
        label: "Pressão alimentar",
        reason: "A reserva de comida está abaixo da necessidade da população.",
        suggestion: "Invista em agricultura e aumente orçamento em economia.",
        level: foodGap > 0.6 ? "high" : "medium"
      });
    }

    const adminUsage = player.administration.adminCapacity <= 0
      ? 0
      : player.administration.usedCapacity / player.administration.adminCapacity;
    if (adminUsage > 0.85 || player.administration.corruption > 0.2) {
      explainers.push({
        label: "Sobrecarga administrativa",
        reason: `Capacidade usada em ${formatNumber(adminUsage * 100)}% e corrupção em ${formatNumber(player.administration.corruption * 100)}%.`,
        suggestion: "Priorize tecnologia de administração e reduza expansão imediata.",
        level: adminUsage > 0.95 ? "high" : "medium"
      });
    }

    let highUnrestRegions = 0;
    const playerIndices = getPlayerRegionIndicesCached(state, player);
    for (const idx of playerIndices) {
      const regionId = WORLD_DEFINITIONS_V1[idx].id;
      if ((state.world.regions[regionId]?.unrest || 0) > 0.45) {
        highUnrestRegions++;
      }
    }

    if (highUnrestRegions > 0) {
      explainers.push({
        label: "Instabilidade regional",
        reason: `${highUnrestRegions} região(ões) próprias com risco alto de revolta.`,
        suggestion: "Use pacificação e guarnição nas regiões críticas.",
        level: highUnrestRegions >= 3 ? "high" : "medium"
      });
    }

    const strongestRival = Object.keys(player.diplomacy.relations)
      .sort()
      .map((relationId) => player.diplomacy.relations[relationId])
      .reduce((top, relation) => Math.max(top, relation.score.rivalry + relation.score.fear * 0.5), 0);
    const externalThreat = Math.max(player.diplomacy.coalitionThreat, strongestRival);

    if (externalThreat > 0.55) {
      explainers.push({
        label: "Ameaça externa",
        reason: "Rivais e coalizões estão aumentando o risco de guerra.",
        suggestion: "Tente pacto/aliança com vizinhos e fortaleça postura defensiva.",
        level: externalThreat > 0.75 ? "high" : "medium"
      });
    }

    let schismRegions = 0;
    for (const idx of playerIndices) {
      const regionId = WORLD_DEFINITIONS_V1[idx].id;
      const r = state.world.regions[regionId];
      if (r && r.dominantFaith !== player.religion.stateFaith) {
        const rDef = state.world.religions[r.dominantFaith];
        const sDef = state.world.religions[player.religion.stateFaith];
        if (rDef && sDef && (rDef.parentReligionId === sDef.id || sDef.parentReligionId === rDef.id)) {
           schismRegions++;
        }
      }
    }

    if (schismRegions > 0) {
      explainers.push({
        label: "Cisma Religioso",
        reason: `${schismRegions} região(ões) seguem uma heresia declarada, sofrendo +250% de tensão.`,
        suggestion: "Envie missionários ou ative a política Fanática para expurgar a heresia rapidamente.",
        level: schismRegions >= 2 ? "high" : "medium"
      });
    }

    if (explainers.length === 0) {
      explainers.push({
        label: "Situação estável",
        reason: "Nenhum risco sistêmico crítico no momento.",
        suggestion: "Aproveite para acelerar tecnologia e desenvolvimento.",
        level: "low"
      });
    }

    ui.explainList.innerHTML = "";

    for (const explainer of explainers) {
      const item = document.createElement("li");
      item.className = `explain-item risk-${explainer.level}`;
      item.innerHTML = `<strong>${explainer.label}</strong><span>${explainer.reason}</span><small>Sugestão: ${explainer.suggestion}</small>`;
      ui.explainList.appendChild(item);
    }
  }

  function renderRegionInfo(state: GameState): void {
    if (!selectedRegionId) {
      ui.regionInfo.textContent = "Selecione uma região no mapa.";
      ui.regionActions.innerHTML = "";
      return;
    }

    const region = state.world.regions[selectedRegionId];
    const regionDef = staticWorldData.definitions[selectedRegionId];

    if (!region || !regionDef) {
      const label = selectedMapLabel ?? selectedRegionId;
      ui.regionInfo.innerHTML = `
        <div class="summary-grid">
          <span>País</span><strong>${label}</strong>
          <span>Status</span><strong>Fora da campanha inicial</strong>
          <span>Ações</span><strong>Indisponíveis nesta fase</strong>
        </div>
      `;
      ui.regionActions.innerHTML = "";
      return;
    }

    const player = getPlayerKingdom(state);
    const owner = state.kingdoms[region.ownerId];
    const isPlayer = owner?.isPlayer;
    const isAdjacent = regionDef.neighbors.some(nid => state.world.regions[nid]?.ownerId === player.id);
    const ownerName = owner ? `${owner.name}${isPlayer ? " (Você)" : ""}` : "-";

    // Tradução e mapeamento de dados do Bioma
    const biomeLabels: Record<string, string> = { ocean: "Oceano", desert: "Deserto", tundra: "Tundra", temperate: "Temperado", tropical: "Tropical" };
    const biomeCapacity: Record<string, number> = { ocean: 0, desert: 50, tundra: 20, temperate: 250, tropical: 150 };
    const regionBiomeLabel = biomeLabels[regionDef.biome] ?? "Desconhecido";
    const baseCapacity = biomeCapacity[regionDef.biome] ?? 0;

    // Extração populacional local (do ECS)
    const regionIndex = REGION_INDEX_MAP.get(selectedRegionId);
    const currentPop = (regionIndex !== undefined && currentSimulationState.populationTotalData) 
      ? currentSimulationState.populationTotalData[regionIndex] 
      : 0;
    const currentManpower = (regionIndex !== undefined && currentSimulationState.manpowerData)
      ? currentSimulationState.manpowerData[regionIndex]
      : 0;

    // Aplicação da Desinformação Visual (Fog of Truth)
    let popText = "";
    let faithUnrestText = "";
    let unrestText = "";
    let autonomyText = "";
    let assimilationText = "";
    let devText = "";    
    let dominantFaithText = "";
    let minorityFaithText = "";
    let manpowerText = "";

    if (isPlayer || isFogOfTruthDisabled) {
      popText = `${formatNumber(currentPop)} / ${formatNumber(baseCapacity)} (Máx. Natural)`;
      faithUnrestText = `${formatNumber(region.faithUnrest * 100)}%`;
      unrestText = `${formatNumber(region.unrest * 100)}%`;
      autonomyText = `${formatNumber(region.autonomy * 100)}%`;
      assimilationText = `${formatNumber(region.assimilation * 100)}%`;
      devText = `${formatNumber(region.devastation * 100)}%`;
      const dominantFaith = state.world.religions[region.dominantFaith];
      
      let schismWarning = "";
      const stateFaithDef = state.world.religions[player.religion.stateFaith];
      if (dominantFaith && stateFaithDef && region.dominantFaith !== player.religion.stateFaith) {
        const isSchism = dominantFaith.parentReligionId === player.religion.stateFaith || stateFaithDef.parentReligionId === region.dominantFaith;
        if (isSchism) {
          schismWarning = `<br><span style="background: rgba(255, 60, 60, 0.15); border: 1px solid #ff5555; color: #ff5555; font-size: 0.85em; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 6px;">⚠️ Cisma Ativo (Instabilidade Extrema)</span>`;
        }
      }
      const domColor = dominantFaith?.color ?? '#ffffff';
      dominantFaithText = `<span style="color: ${domColor}; text-shadow: 0 1px 3px rgba(0,0,0,0.9); font-weight: bold;">${dominantFaith?.name ?? region.dominantFaith}</span> (${formatNumber(region.dominantShare * 100)}%)${schismWarning}`;
      
      const minorityFaith = region.minorityFaith ? state.world.religions[region.minorityFaith] : null;
      const minColor = minorityFaith?.color ?? '#ffffff';
      minorityFaithText = region.minorityFaith && typeof region.minorityShare === "number"
        ? `<span style="color: ${minColor}; text-shadow: 0 1px 3px rgba(0,0,0,0.9); font-weight: bold;">${minorityFaith?.name ?? region.minorityFaith}</span> (${formatNumber(region.minorityShare * 100)}%)`
        : "Nenhuma";
      manpowerText = formatNumber(currentManpower);
    } else if (isAdjacent) {
      const popEst = Math.max(0, Math.round(currentPop / 10) * 10);
      popText = `~${formatNumber(popEst)} (Estimativa de Fronteira)`;
      faithUnrestText = region.faithUnrest > 0.5 ? "Alta" : region.faithUnrest > 0.2 ? "Média" : "Baixa";
      unrestText = region.unrest > 0.5 ? "Alta" : region.unrest > 0.2 ? "Média" : "Baixa";
      autonomyText = region.autonomy > 0.5 ? "Alta" : region.autonomy > 0.2 ? "Média" : "Baixa";
      assimilationText = region.assimilation > 0.5 ? "Alta" : region.assimilation > 0.2 ? "Média" : "Baixa";
      devText = region.devastation > 0.5 ? "Severa" : region.devastation > 0.2 ? "Moderada" : "Mínima";
      const dominantFaith = state.world.religions[region.dominantFaith];
      dominantFaithText = `${dominantFaith?.name ?? "Desconhecida"} (Maioria)`;
      minorityFaithText = "Presente";
      manpowerText = "Desconhecido";
    } else {
      popText = "Desconhecida (Névoa)";
      faithUnrestText = "Desconhecida";
      unrestText = "Desconhecida";
      autonomyText = "Desconhecida";
      assimilationText = "Desconhecida";
      devText = "Desconhecida";
      dominantFaithText = "Desconhecida";
      minorityFaithText = "Desconhecida";
      manpowerText = "Desconhecido";
    }

    ui.regionInfo.innerHTML = `
      <div class="summary-grid">
        <span>Nome</span><strong>${regionDef.name}</strong>
        <span>Dono</span><strong>${ownerName}</strong>
        <span>Bioma</span><strong>${regionBiomeLabel}</strong>
        <span>População</span><strong>${popText}</strong>
        <span>Recrutas (Manpower)</span><strong>${manpowerText}</strong>
        <span>Fé dominante</span><strong>${dominantFaithText}</strong>
        <span>Minoria religiosa</span><strong>${minorityFaithText}</strong>
        <span>Tensão de fé</span><strong>${faithUnrestText}</strong>
        <span>Instabilidade</span><strong>${unrestText}</strong>
        <span>Autonomia</span><strong>${autonomyText}</strong>
        <span>Assimilação</span><strong>${assimilationText}</strong>
        <span>Devastação</span><strong>${devText}</strong>
      </div>
    `;

    ui.regionActions.innerHTML = "";

    if (isPlayer) {
      const actions: Array<{ id: RegionActionType; label: string }> = [
        { id: "invest_agriculture", label: "Investir em agricultura" },
        { id: "invest_infrastructure", label: "Investir em infraestrutura" },
        { id: "garrison", label: "Reforçar guarnição" },
        { id: "pacify", label: "Pacificar" }
      ];

      if (region.regionId !== owner.capitalRegionId) {
        actions.push({ id: "change_capital", label: "Mudar Sede (Tornar Capital)" });
      }

      for (const action of actions) {
        const config = session.getRegionActionConfig(action.id);
        const costStrings = Object.entries(config.cost).map(([res, val]) => `${val} ${resourceLabels[res as ResourceType]}`);
        const isAffordable = session.canAfford(config.cost);

        const button = document.createElement("button");
        button.disabled = !isAffordable;
        button.innerHTML = `<span>${action.label}</span><small style="display:block; font-size:0.75em; opacity:0.75; margin-top:2px;">Custo: ${costStrings.join(", ")}</small>`;
        button.addEventListener("click", () => {
          const result = session.executeRegionAction(selectedRegionId ?? "", action.id);
          showToast(result.message);
        });
        ui.regionActions.appendChild(button);
      }

      // NEW: Building UI
      const MAX_SLOTS = 2;
      const buildings = region.buildings || [];
      
      const buildingContainer = document.createElement("div");
      buildingContainer.style.marginTop = "20px";
      buildingContainer.innerHTML = `<h4 style="margin-top: 0; border-bottom: 1px solid var(--border-color, #ccc); padding-bottom: 5px;">Slots de Infraestrutura (${buildings.length}/${MAX_SLOTS})</h4>`;
      
      if (buildings.length > 0) {
          const list = document.createElement("ul");
          list.style.listStyle = "none";
          list.style.padding = "0";
          list.style.margin = "10px 0";
          for (const b of buildings) {
              const config = session.getBuildingConfig(b);
              const li = document.createElement("li");
              li.style.background = "var(--bg-secondary, rgba(0,0,0,0.05))";
              li.style.border = "1px solid var(--border-color, rgba(0,0,0,0.1))";
              li.style.padding = "8px 12px";
              li.style.borderRadius = "4px";
              li.style.marginBottom = "5px";
              li.style.display = "flex";
              li.style.justifyContent = "space-between";
              li.innerHTML = `<strong>${config.label}</strong><span style="opacity: 0.75; font-size: 0.9em;">${config.effectStr}</span>`;
              list.appendChild(li);
          }
          buildingContainer.appendChild(list);
      } else {
          const emptyMsg = document.createElement("p");
          emptyMsg.style.fontSize = "0.85em";
          emptyMsg.style.opacity = "0.7";
          emptyMsg.style.fontStyle = "italic";
          emptyMsg.textContent = "Nenhum edifício construído.";
          buildingContainer.appendChild(emptyMsg);
      }

      if (buildings.length < MAX_SLOTS) {
          const buildGrid = document.createElement("div");
          buildGrid.className = "action-grid";
          buildGrid.style.marginTop = "10px";

          const availableBuildings = Object.values(BuildingType).filter(b => !buildings.includes(b as BuildingType));
          
          for (const b of availableBuildings) {
              const config = session.getBuildingConfig(b as BuildingType);
              const canAfford = session.canAfford(config.cost);
              const costStrings = Object.entries(config.cost).map(([res, val]) => `${val} ${resourceLabels[res as ResourceType]}`);
              
              const btn = document.createElement("button");
              btn.disabled = !canAfford;
              btn.style.textAlign = "left";
              btn.style.padding = "10px";
              btn.style.display = "flex";
              btn.style.flexDirection = "column";
              btn.style.gap = "4px";
              btn.innerHTML = `
                <strong style="display: block; margin-bottom: 2px;">Erguer ${config.label}</strong>
                <span style="font-size: 0.8em; display: block; opacity: 0.85; margin-bottom: 2px;">Efeito: ${config.effectStr}</span>
                <span style="font-size: 0.75em; display: block; opacity: 0.65;">Custo: ${costStrings.join(", ")}</span>
              `;
              
              btn.addEventListener("click", () => {
                  const res = session.executeBuildStructure(selectedRegionId!, b as BuildingType);
                  showToast(res.message);
                  if (res.ok) {
                      renderRegionInfo(session.getState());
                  }
              });
              
              buildGrid.appendChild(btn);
          }
          buildingContainer.appendChild(buildGrid);
      }

      ui.regionActions.appendChild(buildingContainer);
    } else if (region.ownerId === "k_nature") {
      const isNomad = Object.keys(state.world.regions).filter(r => state.world.regions[r].ownerId === player.id).length === 1;

      const actionsToRender: RegionActionType[] = ["colonize"];
      if (isNomad) actionsToRender.push("exodus");

      for (const actionId of actionsToRender) {
        const config = session.getRegionActionConfig(actionId);
        const costStrings = Object.entries(config.cost).map(([res, val]) => `${val} ${resourceLabels[res as ResourceType]}`);
        const isAffordable = session.canAfford(config.cost);

        const button = document.createElement("button");
        button.className = "primary";
        button.disabled = !isAffordable;
        
        let extraCost = "";
        if (actionId === "colonize") extraCost = " | -50 Pop. da Capital";
        if (actionId === "exodus") extraCost = " | Abandona território";

        button.innerHTML = `<span>${config.label}</span><small style="display:block; font-size:0.75em; opacity:0.75; margin-top:2px;">Custo: ${costStrings.join(", ")}${extraCost}</small>`;
        
        if (!isAdjacent) {
          button.disabled = true;
          button.innerHTML += `<small style="display:block; font-size:0.75em; opacity:0.9; font-weight:bold; margin-top:2px;">Requer fronteira vizinha</small>`;
        }

        button.addEventListener("click", () => {
          const result = session.executeRegionAction(selectedRegionId ?? "", actionId);
          showToast(result.message);
        });
        ui.regionActions.appendChild(button);
      }
    } else {
      const targetId = region.ownerId;
      
      const warConfig = session.getDiplomaticConfig(state, player.id, targetId, "war");
      const warCostStrings = Object.entries(warConfig.cost).map(([res, val]) => `${val} ${resourceLabels[res as ResourceType]}`);
      const canWar = session.canAfford(warConfig.cost);
      const warBtn = document.createElement("button");
      warBtn.className = "danger";
      warBtn.disabled = !canWar;
      warBtn.innerHTML = `<span>Declarar Guerra</span><small style="display:block; font-size:0.8em; opacity:0.8; margin-top:4px;">Custo: ${warCostStrings.join(", ")}</small><small style="display:block; font-size:0.8em; opacity:0.9; margin-top:2px; font-weight:bold;">Apoio do Conselho: ${formatNumber(warConfig.chance * 100)}%</small>`;
      warBtn.addEventListener("click", () => {
        const result = session.executeDiplomaticAction(targetId, "war");
        showToast(result.message);
      });
      ui.regionActions.appendChild(warBtn);

      const relConfig = session.getReligiousActionConfig(player.id, targetId, "send_missionaries");
      const relCostStrings = Object.entries(relConfig.cost).map(([res, val]) => `${val} ${resourceLabels[res as ResourceType]}`);
      const canMissionary = session.canAfford(relConfig.cost);
      const relBtn = document.createElement("button");
      relBtn.disabled = !canMissionary;
      relBtn.innerHTML = `<span>Enviar Missionários</span><small style="display:block; font-size:0.8em; opacity:0.8; margin-top:4px;">Custo: ${relCostStrings.join(", ")}</small><small style="display:block; font-size:0.8em; opacity:0.9; margin-top:2px; font-weight:bold;">Eficácia da Conversão: ${formatNumber(relConfig.chance * 100)}%</small>`;
      relBtn.addEventListener("click", () => {
        const result = session.executeReligiousAction(targetId, "send_missionaries");
        showToast(result.message);
      });
      ui.regionActions.appendChild(relBtn);
    }
  }

  function renderGovernmentInputs(state: GameState): void {
    if (isGovernmentFormDirty || isGovernmentInputFocused()) {
      return;
    }

    const player = getPlayerKingdom(state);

    ui.taxInputs.baseRate.value = String(round(player.economy.taxPolicy.baseRate * 100, 0));
    ui.taxInputs.nobleRelief.value = String(round(player.economy.taxPolicy.nobleRelief * 100, 0));
    ui.taxInputs.clergyExemption.value = String(round(player.economy.taxPolicy.clergyExemption * 100, 0));
    ui.taxInputs.tariffRate.value = String(round(player.economy.taxPolicy.tariffRate * 100, 0));

    ui.budgetInputs.economy.value = String(round(player.economy.budgetPriority.economy));
    ui.budgetInputs.military.value = String(round(player.economy.budgetPriority.military));
    ui.budgetInputs.religion.value = String(round(player.economy.budgetPriority.religion));
    ui.budgetInputs.administration.value = String(round(player.economy.budgetPriority.administration));
    ui.budgetInputs.technology.value = String(round(player.economy.budgetPriority.technology));
    ui.expansionAutomationSelect.value = player.administration.automation.expansion;
    ui.constructionAutomationSelect.value = player.administration.automation.construction ?? "manual";
    ui.globalAutomationToggle.checked = !!player.administration.automation.globalToggleActive;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function renderCouncil(state: GameState): void {
    const player = getPlayerKingdom(state);
    const admin = player.administration;

    const council = admin.council || {};
    const candidatePool = admin.candidatePool || [];
    const activeAdvice = admin.activeAdvice || [];

    const ALL_ROLES = [MinisterRole.PrimeMinister, MinisterRole.Steward, MinisterRole.Marshal, MinisterRole.Chancellor, MinisterRole.Chaplain, MinisterRole.Scholar];

    const roleTitles: Record<string, string> = {
      [MinisterRole.PrimeMinister]: "Primeiro-Ministro (A Mão)",
      [MinisterRole.Steward]: "Intendente Real",
      [MinisterRole.Marshal]: "Lorde Marechal",
      [MinisterRole.Chancellor]: "Grão-Chanceler",
      [MinisterRole.Chaplain]: "Alto Capelão",
      [MinisterRole.Scholar]: "Sábio da Corte"
    };

    const roleDesc: Record<string, string> = {
      [MinisterRole.PrimeMinister]: "Reduz a corrupção e mitiga ineficiência administrativa do império.",
      [MinisterRole.Steward]: "Gerencia a economia, recolhe impostos e planeja obras.",
      [MinisterRole.Marshal]: "Comanda os exércitos, o recrutamento e as defesas.",
      [MinisterRole.Chancellor]: "Lida com aliados, pactos e declarações de guerra.",
      [MinisterRole.Chaplain]: "Garante a ortodoxia, combate heresias e gera estabilidade.",
      [MinisterRole.Scholar]: "Foca o império em ciência e avanço cultural veloz."
    };

    const persTitles: Record<string, string> = {
      [MinisterPersonality.Militarist]: "Militarista",
      [MinisterPersonality.Pacifist]: "Pacifista",
      [MinisterPersonality.Greedy]: "Ganancioso",
      [MinisterPersonality.Zealous]: "Zeloso",
      [MinisterPersonality.Progressive]: "Progressista",
      [MinisterPersonality.Cautious]: "Cauteloso"
    };

    const persDesc: Record<string, string> = {
      [MinisterPersonality.Militarist]: "Foca verbas no exército; detesta acordos de paz.",
      [MinisterPersonality.Pacifist]: "Busca diplomacia; pede demissão em guerras contínuas.",
      [MinisterPersonality.Greedy]: "Extorce o povo; tolerante à corrupção se for bem pago.",
      [MinisterPersonality.Zealous]: "Odeia heresias; exige inquisições e zelo cego.",
      [MinisterPersonality.Progressive]: "Foca orçamento em Universidades e tecnologias.",
      [MinisterPersonality.Cautious]: "Acumula cofres cheios; teme invasões e instabilidade."
    };

    // Renderiza o conselho atual
    ui.councilPanel.innerHTML = "";

    const monarch = state.world.characters ? state.world.characters[player.rulerId || ""] : null;
    if (monarch) {
      const monarchCard = document.createElement("div");
      monarchCard.className = "rpg-card monarch-card";
      monarchCard.style.textAlign = "center";
      monarchCard.style.padding = "25px";
      monarchCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.8), inset 0 0 40px rgba(212,175,55,0.05)";
      
      const traitsHtml = monarch.traits && monarch.traits.length > 0 
        ? monarch.traits.map((t: string) => `<span style="display: inline-block; background: rgba(212,175,55,0.15); color: #d4af37; border: 1px solid rgba(212,175,55,0.4); border-radius: 4px; padding: 4px 12px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 4px;">${t === 'ambitious' ? 'Ambicioso' : t}</span>`).join('')
        : '';

      monarchCard.innerHTML = `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #d4af37; font-family: serif; font-size: 2rem; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(212,175,55,0.3);">${monarch.name}</h3>
            <div style="color: #ccc; font-style: italic; font-size: 1rem; margin-top: 5px;">${monarch.title || 'Soberano Supremo'}</div>
            <div style="margin-top: 12px;">${traitsHtml}</div>
          </div>
          
          <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-top: 15px;">
            <div style="background: rgba(0,0,0,0.5); border: 1px solid #444; border-radius: 8px; padding: 12px 15px; min-width: 130px; flex: 1;">
              <div style="color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">Administração</div>
              <div style="color: #fff; font-size: 1.6rem; font-weight: bold; font-family: monospace; text-shadow: 0 0 8px rgba(255,255,255,0.3);">${monarch.stats.administration}</div>
            </div>
            <div style="background: rgba(0,0,0,0.5); border: 1px solid #444; border-radius: 8px; padding: 12px 15px; min-width: 130px; flex: 1;">
              <div style="color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">Marcial</div>
              <div style="color: #fff; font-size: 1.6rem; font-weight: bold; font-family: monospace; text-shadow: 0 0 8px rgba(255,255,255,0.3);">${monarch.stats.martial}</div>
            </div>
            <div style="background: rgba(0,0,0,0.5); border: 1px solid #444; border-radius: 8px; padding: 12px 15px; min-width: 130px; flex: 1;">
              <div style="color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">Diplomacia</div>
              <div style="color: #fff; font-size: 1.6rem; font-weight: bold; font-family: monospace; text-shadow: 0 0 8px rgba(255,255,255,0.3);">${monarch.stats.diplomacy}</div>
            </div>
            <div style="background: rgba(0,0,0,0.5); border: 1px solid #444; border-radius: 8px; padding: 12px 15px; min-width: 130px; flex: 1;">
              <div style="color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">Intriga</div>
              <div style="color: #fff; font-size: 1.6rem; font-weight: bold; font-family: monospace; text-shadow: 0 0 8px rgba(255,255,255,0.3);">${monarch.stats.intrigue}</div>
            </div>
            <div style="background: rgba(0,0,0,0.5); border: 1px solid #444; border-radius: 8px; padding: 12px 15px; min-width: 130px; flex: 1;">
              <div style="color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">Erudição</div>
              <div style="color: #fff; font-size: 1.6rem; font-weight: bold; font-family: monospace; text-shadow: 0 0 8px rgba(255,255,255,0.3);">${monarch.stats.learning}</div>
            </div>
          </div>
      `;
      ui.councilPanel.appendChild(monarchCard);
    }

    for (const role of ALL_ROLES) {
      const minister = council[role];
      const isPM = role === MinisterRole.PrimeMinister;
      if (minister) {
        const card = document.createElement("div");
        card.className = `rpg-card ${isPM ? 'pm-card' : ''}`;
        card.innerHTML = `
          <div class="rpg-header">
            <h4>${minister.name}</h4>
            <span class="role-badge">${roleTitles[role]}</span>
          </div>
          <p class="rpg-desc">${roleDesc[role]}</p>
          <div class="rpg-stats" style="grid-template-columns: 1fr 1fr 1fr;">
            <div title="Administração"><span>Adm:</span> <strong>${minister.stats?.administration ?? (minister.skillLevel*2)}</strong></div>
            <div title="Marcial"><span>Mar:</span> <strong>${minister.stats?.martial ?? (minister.skillLevel*2)}</strong></div>
            <div title="Diplomacia"><span>Dip:</span> <strong>${minister.stats?.diplomacy ?? (minister.skillLevel*2)}</strong></div>
            <div title="Intriga"><span>Int:</span> <strong>${minister.stats?.intrigue ?? (minister.skillLevel*2)}</strong></div>
            <div title="Erudição"><span>Sab:</span> <strong>${minister.stats?.learning ?? (minister.skillLevel*2)}</strong></div>
            <div style="text-align: right;"><strong class="skill-stars">${'★'.repeat(minister.skillLevel)}</strong></div>
          </div>
          <div class="rpg-stats" style="margin-top: -6px; grid-template-columns: 1fr 1fr;">
            <div style="grid-column: 1 / -1;"><span>Origem:</span> <strong>${minister.origin}</strong></div>
            <div><span>Perfil:</span> <strong title="${persDesc[minister.personality]}">${persTitles[minister.personality]}</strong></div>
            <div style="text-align: right;"><span>Salário:</span> <strong style="color: #4ade80;">${formatNumber(minister.salary ?? 0)}G</strong></div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px; color: #fff; font-weight: bold;">
              <span>Lealdade do Titular</span>
              <span class="${riskClass(minister.loyalty / 100)}">${formatNumber(minister.loyalty, 1)}%</span>
            </div>
            <div style="width: 100%; background: #222; height: 6px; border-radius: 3px; overflow: hidden; border: 1px solid #111;">
              <div style="width: ${minister.loyalty}%; background: ${minister.loyalty > 70 ? '#4ade80' : minister.loyalty > 30 ? '#facc15' : '#f87171'}; height: 100%;"></div>
            </div>
          </div>
          <div class="actions" style="flex-wrap: wrap; gap: 6px; margin-top: 10px;">
            <button class="primary" style="flex: 1; font-size: 0.8rem;" data-interact-role="${role}" data-interact-action="consult">Conselhos</button>
            <button style="flex: 1; font-size: 0.8rem;" data-interact-role="${role}" data-interact-action="praise">Elogiar</button>
            <button style="flex: 1; font-size: 0.8rem;" data-interact-role="${role}" data-interact-action="raise_salary">+ Ouro</button>
            <button style="flex: 1; font-size: 0.8rem;" data-interact-role="${role}" data-interact-action="cut_salary">- Ouro</button>
            <button class="danger" style="flex: 1; font-size: 0.8rem;" data-interact-role="${role}" data-interact-action="threaten">Ameaçar</button>
            <button style="flex: 1; font-size: 0.8rem; background: #6b46c1; border-color: #6b46c1;" data-swap-role="${role}">Remanejar</button>
            <button class="danger" style="flex: 1; font-size: 0.8rem; border-color: #f00;" data-fire-role="${role}">Demitir</button>
          </div>
        `;
        ui.councilPanel.appendChild(card);
      } else {
        ui.councilPanel.innerHTML += `
          <div class="rpg-card empty-slot ${isPM ? 'pm-card' : ''}">
            <div class="rpg-header" style="border-bottom-color: #ccc;">
              <h4 style="color: #333; text-shadow: none;">Pasta sem Titular</h4>
              <span class="role-badge" style="color: #444; border-color: #888; background: #e2e2e2; font-weight: bold; filter: none; opacity: 1;">${roleTitles[role]}</span>
            </div>
            <p class="rpg-desc" style="color: #555; opacity: 1;">${roleDesc[role]}</p>
            <div style="text-align: center; padding: 20px 0; color: #b91c1c; font-size: 0.85rem; font-weight: bold; border: 1px dashed #b91c1c; border-radius: 4px; background: rgba(220, 38, 38, 0.05); margin-top: 15px;">
              Gargalo Administrativo!<br>
              <span style="font-weight: normal; color: #666; font-size: 0.75rem;">Contrate um talento abaixo para esta função.</span>
            </div>
          </div>
        `;
      }
    }

    // Renderiza os candidatos do mercado
    const missingRoles = ALL_ROLES.filter(r => !council[r]);
    const isCouncilFull = missingRoles.length === 0;
    
    const currentHash = candidatePool.map(c => c.id).join(",") + "|" + missingRoles.join(",");
    
    if (currentHash !== lastCandidatePoolHash) {
      lastCandidatePoolHash = currentHash;

      let candidatesHtml = "";
      if (candidatePool.length === 0) {
        candidatesHtml = `<p class="hint-text">A corte está vazia. Novos talentos procurarão o palácio em breve.</p>`;
      } else {
        for (const candidate of candidatePool) {
          let hireActionHtml = "";
          
          if (candidate.role === MinisterRole.Wildcard) {
            if (missingRoles.length === 0) {
              hireActionHtml = `<button disabled style="width:100%;">Corte Cheia</button>`;
            } else {
              const opts = missingRoles.map(r => `<option value="${r}">${roleTitles[r]}</option>`).join('');
              hireActionHtml = `<select id="wildcard-role-${candidate.id}" style="width: 100%; margin-bottom: 8px; padding: 6px; background: #111; color: #d4af37; border: 1px solid #d4af37; font-weight: bold;">
                                  <option value="" disabled selected>-- Escolher Cargo --</option>${opts}
                                </select>
                                <button class="primary" style="width: 100%; font-size: 0.9rem;" data-hire-id="${candidate.id}">Nomear a Lenda</button>`;
            }
          } else {
            hireActionHtml = `<button class="primary" style="width: 100%; font-size: 0.9rem;" data-hire-id="${candidate.id}">Nomear para o Conselho</button>`;
          }

          candidatesHtml += `
          <div class="rpg-card">
            <div class="rpg-header">
              <h4>${candidate.name}</h4>
              <span class="role-badge">${candidate.role === MinisterRole.Wildcard ? 'Curinga Lendário' : roleTitles[candidate.role]}</span>
            </div>
            <p class="rpg-desc">${roleDesc[candidate.role]}</p>
            <div class="rpg-stats" style="grid-template-columns: 1fr 1fr;">
              <div style="grid-column: 1 / -1;"><span>Origem:</span> <br><strong>${candidate.origin}</strong></div>
              <div><span>Perfil:</span> <br><strong title="${persDesc[candidate.personality]}">${persTitles[candidate.personality]}</strong></div>
              <div style="text-align: right;"><span>Pedida:</span> <br><strong style="color: #4ade80;">${formatNumber(candidate.salary ?? 0)} Ouro</strong></div>
            </div>
            <div class="actions" style="margin-top: 12px;">
              ${hireActionHtml}
            </div>
          </div>`;
        }
      }
      
      const detailsEl = ui.councilCandidates.querySelector('details');
      const wasOpen = detailsEl ? detailsEl.open : !isCouncilFull;

      ui.councilCandidates.innerHTML = `
        <details ${wasOpen ? 'open' : ''} style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid #333; outline: none;">
          <summary style="cursor: pointer; color: #e5e7eb; font-weight: bold; font-size: 1.05rem; outline: none;">
            Mercado de Talentos ${isCouncilFull ? '(Corte Cheia - Clique para Expandir)' : '(Clique para Ocultar)'}
          </summary>
          <div class="candidate-grid" style="margin-top: 15px;">
            ${candidatesHtml}
          </div>
        </details>
      `;
    }

    // Renderiza os conselhos
    ui.councilAdvice.innerHTML = "";
    if (activeAdvice.length === 0) {
      ui.councilAdvice.innerHTML = `<li class="hint-text">Nenhum relatório recente do conselho.</li>`;
    } else {
      const pendingAdvice = [];
      const historyAdvice = [];

      for (const advice of activeAdvice) {
        if (advice.resolved || (advice.isRead && (!advice.options || advice.options.length === 0))) {
          historyAdvice.push(advice);
        } else {
          pendingAdvice.push(advice);
        }
      }

      const renderAdviceItem = (advice: any, isHistory: boolean) => {
        const minister = Object.values(council).find((m: any) => m?.id === advice.ministerId);
        const item = document.createElement("li");
        item.className = `event-${advice.urgency === 'high' ? 'critical' : advice.urgency === 'medium' ? 'warning' : 'info'}`;
        if (isHistory) item.style.opacity = "0.7";
        
        let optionsHtml = "";
        if (!advice.resolved && advice.options && advice.options.length > 0) {
          optionsHtml = `<div class="action-grid" style="margin-top: 8px; grid-template-columns: 1fr;">`;
          for (const opt of advice.options) {
            const btnClass = opt.loyaltyImpact < 0 ? "danger" : "primary";
            optionsHtml += `<button class="${btnClass}" style="font-size: 0.85em; padding: 6px 12px; text-align: left;" data-resolve-advice="${advice.id}" data-resolve-option="${opt.id}">📜 ${opt.label}</button>`;
          }
          optionsHtml += `</div>`;
        } else if (!advice.resolved && !advice.isRead) {
           optionsHtml = `<div style="margin-top: 8px;"><button style="font-size: 0.85em; padding: 6px 12px; background: #e5e7eb; color: #111827; font-weight: bold; border: 1px solid #9ca3af; border-radius: 4px; cursor: pointer;" data-mark-read="${advice.id}">✔️ Ciente (Arquivar)</button></div>`;
        } else if (advice.resolved) {
           optionsHtml = `<div style="margin-top: 8px; font-size: 0.8em; color: #888; font-style: italic;">Decisão já tomada pelo monarca.</div>`;
        }

        const badge = (!advice.isRead && !isHistory) ? `<span style="background: #ff3366; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7em; margin-left: 8px; vertical-align: super; box-shadow: 0 0 5px #ff3366;">NOVO</span>` : "";

        item.innerHTML = `
          <strong>${advice.title} (de ${minister?.name ?? 'Conselho'})${badge}</strong>
          <span>${advice.narrativeText}</span>
          ${optionsHtml}
        `;
        return item;
      };

      if (pendingAdvice.length === 0 && historyAdvice.length > 0) {
        const noPendingMsg = document.createElement("p");
        noPendingMsg.className = "hint-text";
        noPendingMsg.textContent = "Nenhum relatório pendente de atenção.";
        ui.councilAdvice.appendChild(noPendingMsg);
      }

      for (const advice of pendingAdvice) {
        ui.councilAdvice.appendChild(renderAdviceItem(advice, false));
      }

      if (historyAdvice.length > 0) {
        const details = document.createElement("details");
        details.style.marginTop = "15px";
        details.style.background = "rgba(0,0,0,0.2)";
        details.style.padding = "10px";
        details.style.borderRadius = "6px";
        details.style.border = "1px solid #333";
        
        const summary = document.createElement("summary");
        summary.style.cursor = "pointer";
        summary.style.color = "#111827";
        summary.style.background = "#d1d5db";
        summary.style.padding = "8px 12px";
        summary.style.borderRadius = "4px";
        summary.style.fontWeight = "bold";
        summary.textContent = `Histórico de Relatórios (${historyAdvice.length})`;
        details.appendChild(summary);

        const histList = document.createElement("ul");
        histList.className = "list compact";
        histList.style.marginTop = "10px";
        for (const advice of historyAdvice) {
          histList.appendChild(renderAdviceItem(advice, true));
        }
        details.appendChild(histList);
        
        ui.councilAdvice.appendChild(details);
      }
    }
  }

  function renderTechnologyTree(choices: TechnologyChoice[]): void {
    const nameById = new Map(choices.map((choice) => [choice.id, choice.name] as const));
    ui.techTreeList.innerHTML = "";

    for (const domain of TECH_DOMAIN_ORDER) {
      const rawDomainNodes = choices.filter((choice) => choice.domain === domain);
      const domainNodes = hideCompletedTechnologies
        ? rawDomainNodes.filter((choice) => choice.status !== "unlocked")
        : rawDomainNodes;

      if (domainNodes.length === 0) {
        continue;
      }

      const section = document.createElement("section");
      section.className = "tech-domain-group";

      const heading = document.createElement("h4");
      const completedCount = rawDomainNodes.filter((choice) => choice.status === "unlocked").length;
      heading.textContent = `${techDomainLabel(domain)} (${domainNodes.length} ativos, ${completedCount} concluídas)`;
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "tech-node-grid";

      for (const node of domainNodes) {
        const nodeElement = document.createElement("article");
        nodeElement.className = `tech-node tech-${node.status}${node.isGoal ? " tech-goal" : ""}`;
        const requiredText = node.required.length === 0
          ? "Sem pré-requisitos"
          : node.required.map((requiredId) => nameById.get(requiredId) ?? requiredId).join(", ");

        const goalBadge = node.isGoal ? `<span class="tech-goal-badge">Meta</span>` : "";
        nodeElement.innerHTML = `
          <header class="tech-node-header">
            <strong>${node.name}</strong>
            <span class="tech-status">${techStatusLabel(node.status)}</span>
          </header>
          <div class="tech-node-meta">
            <span>Pesquisa necessária: ${formatNumber(node.cost)}</span>
            <span>Pré-requisitos: ${requiredText}</span>
            ${goalBadge}
          </div>
        `;

        const actions = document.createElement("div");
        actions.className = "tech-node-actions";

        const researchAction = document.createElement("button");
        researchAction.className = "tech-action-btn";
        if (node.status === "available") {
          researchAction.textContent = "Pesquisar agora";
          researchAction.addEventListener("click", () => {
            const result = session.setResearchTarget(node.id);
            showToast(result.message);
          });
        } else if (node.status === "active") {
          researchAction.textContent = "Pesquisa ativa";
          researchAction.disabled = true;
        } else if (node.status === "unlocked") {
          researchAction.textContent = "Concluída";
          researchAction.disabled = true;
        } else {
          researchAction.textContent = "Bloqueada";
          researchAction.disabled = true;
        }

        const goalAction = document.createElement("button");
        goalAction.className = "tech-action-btn";
        if (node.status === "unlocked") {
          goalAction.textContent = "Meta indisponível";
          goalAction.disabled = true;
        } else if (node.isGoal) {
          goalAction.textContent = "Meta ativa";
          goalAction.disabled = true;
        } else {
          goalAction.textContent = "Definir meta";
          goalAction.addEventListener("click", () => {
            const result = session.setResearchGoal(node.id);
            showToast(result.message);
          });
        }

        actions.appendChild(researchAction);
        actions.appendChild(goalAction);
        nodeElement.appendChild(actions);
        grid.appendChild(nodeElement);
      }

      section.appendChild(grid);
      ui.techTreeList.appendChild(section);
    }

    if (ui.techTreeList.childElementCount === 0) {
      const empty = document.createElement("p");
      empty.className = "hint-text";
      empty.textContent = "Nenhuma tecnologia pendente visível com o filtro atual.";
      ui.techTreeList.appendChild(empty);
    }
  }

  function renderTechnology(state: GameState): void {
    const player = getPlayerKingdom(state);
    const choices = session.listTechnologyChoices();
    const activeChoice = choices.find((choice) => choice.id === player.technology.activeResearchId);
    const goalChoice = choices.find((choice) => choice.isGoal);

    ui.techFocusSelect.value = player.technology.researchFocus;
    ui.techAutomationSelect.value = player.administration.automation.technology;
    ui.techHideCompletedToggle.checked = hideCompletedTechnologies;

    ui.techSummary.innerHTML = `
      <span>Pesquisa ativa</span><strong>${activeChoice?.name ?? "-"}</strong>
      <span>Meta tecnológica</span><strong>${goalChoice?.name ?? "-"}</strong>
      <span>Automação</span><strong>${automationLevelLabel(player.administration.automation.technology)}</strong>
      <span>Acúmulo</span><strong>${formatNumber(player.technology.accumulatedResearch)}</strong>
      <span>Tecnologias desbloqueadas</span><strong>${player.technology.unlocked.length}</strong>
    `;

    renderTechnologyTree(choices);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function renderReligion(state: GameState): void {
    const player = getPlayerKingdom(state);
    const playerIndices = getPlayerRegionIndicesCached(state, player);
    const currentFaithDef = state.world.religions[player.religion.stateFaith];

    ui.religionSummary.innerHTML = `
      <span>Religião de Estado</span><strong style="color: ${currentFaithDef?.color ?? '#fff'}">${currentFaithDef?.name ?? "Nenhuma"}</strong>
      <span>Tolerância</span><strong>${formatNumber(player.religion.tolerance * 100)}%</strong>
    `;

    if (ui.religionPolicySelect.options.length === 0) {
      ui.religionPolicySelect.add(new Option("Tolerante (Permite osmose livre, +Paz)", String(ReligiousPolicy.Tolerant)));
      ui.religionPolicySelect.add(new Option("Ortodoxa (Equilíbrio Padrão)", String(ReligiousPolicy.Orthodoxy)));
      ui.religionPolicySelect.add(new Option("Fanática (Inquisição e Alta Conversão)", String(ReligiousPolicy.Zealous)));
    }
    ui.religionPolicySelect.value = String(player.religion.policy);

    const rdName = document.getElementById("rd-name");
    const rdDesc = document.getElementById("rd-desc");
    if (rdName && rdDesc && currentFaithDef) {
       rdName.textContent = currentFaithDef.deityName;
       rdName.style.color = currentFaithDef.color;
       rdName.style.textShadow = `0 1px 3px rgba(0,0,0,0.8)`;
       rdDesc.textContent = currentFaithDef.deityDescription;
       (rdName.parentElement as HTMLElement).style.borderLeftColor = currentFaithDef.color;
    }

    ui.religionActiveTenets.innerHTML = "";
    if (currentFaithDef && currentFaithDef.tenets) {
        for (const tId of currentFaithDef.tenets) {
            const tenet = staticWorldData.tenets[tId];
            if (tenet) {
                const card = document.createElement("div");
                card.className = "tenet-card";
                card.style.cursor = "default";
                card.style.borderColor = "rgba(255,255,255,0.1)";
                const isOnus = tenet.cost < 0;
                card.innerHTML = `<h4 style="color: ${currentFaithDef.color}; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"><span>${tenet.name}</span> <span class="tenet-cost ${isOnus ? 'negative' : ''}">${isOnus ? '-' : '+'}${Math.abs(tenet.cost)}</span></h4><p style="color: #ddd;">${tenet.description}</p>`;
                ui.religionActiveTenets.appendChild(card);
            }
        }
    }

    // Preenche o dropdown dinamicamente com as religiões vivas do mundo (incluindo as fundadas)
    const currentSelectValue = ui.religionChangeSelect.value;
    ui.religionChangeSelect.innerHTML = "";
    for (const faithId in state.world.religions) {
      const opt = document.createElement("option");
      opt.value = faithId;
      opt.textContent = state.world.religions[faithId].name;
      ui.religionChangeSelect.appendChild(opt);
    }
    if (state.world.religions[currentSelectValue]) {
      ui.religionChangeSelect.value = currentSelectValue;
    }

    // Calcula demografia iterando as regiões do player
    const faithCounts: Record<string, number> = {};
    for (const idx of playerIndices) {
      const regionId = WORLD_DEFINITIONS_V1[idx].id;
      const region = state.world.regions[regionId];
      if (region && region.dominantFaith) {
        faithCounts[region.dominantFaith] = (faithCounts[region.dominantFaith] || 0) + 1;
      }
    }

    ui.religionDemographics.innerHTML = "";
    const totalRegions = playerIndices.length;
    
    for (const [faithId, count] of Object.entries(faithCounts).sort((a, b) => b[1] - a[1])) {
      const faithDef = state.world.religions[faithId];
      const percent = totalRegions > 0 ? (count / totalRegions) * 100 : 0;
      const item = document.createElement("li");
      item.innerHTML = `<span style="color: ${faithDef?.color ?? '#fff'}; font-weight: bold;">${faithDef?.name ?? faithId}</span> <strong>Maioria em ${count} região(ões) (${formatNumber(percent, 1)}% do Império)</strong>`;
      ui.religionDemographics.appendChild(item);
    }

    // Desabilita o botão de mudar religião se não houver legitimidade
    const canAffordReligionChange = session.canAfford({ legitimacy: 40 });
    ui.religionChangeBtn.disabled = !canAffordReligionChange;
    if (!canAffordReligionChange) {
      ui.religionChangeBtn.innerHTML = `Decretar Nova Fé <small style="display:block; font-size: 0.7em;">Falta Legitimidade (40)</small>`;
    } else {
      ui.religionChangeBtn.innerHTML = `Decretar Nova Fé`;
    }

    // Validação de Orçamento de Fundação Customizada
    const btnOpenFounderRender = document.getElementById("btn-open-founder") as HTMLButtonElement | null;
    if (btnOpenFounderRender) {
      const canFound = playerFaithCache >= 1000 && getPlayerTotalResource(state, ResourceType.Legitimacy) >= 50;
      btnOpenFounderRender.disabled = !canFound;
      if (!canFound) {
        btnOpenFounderRender.innerHTML = `Forjar Nova Fé <small style="display:block; font-size: 0.7em;">Requer 1000 Fé e 50 Legitimidade</small>`;
      } else {
        btnOpenFounderRender.innerHTML = `Forjar Nova Fé`;
      }
    }
  }

  function createDiplomacyActionButton(targetId: string, actionType: DiplomaticActionType, label: string, isAffordable: boolean): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.disabled = !isAffordable;

    button.addEventListener("click", () => {
      const result = session.executeDiplomaticAction(targetId, actionType);
      const chanceText = typeof result.chance === "number" ? ` (chance ${formatNumber(result.chance * 100)}%)` : "";
      showToast(`${result.message}${chanceText}`);
      if (result.ok) {
        setActiveTab("eventos");
      }
    });

    return button;
  }

  function createReligiousActionButton(targetId: string, actionType: ReligiousActionType, label: string, isAffordable: boolean): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.disabled = !isAffordable;

    button.addEventListener("click", () => {
      const result = session.executeReligiousAction(targetId, actionType);
      const chanceText = typeof result.chance === "number" ? ` (chance ${formatNumber(result.chance * 100)}%)` : "";
      showToast(`${result.message}${chanceText}`);
      if (result.ok) {
        setActiveTab("eventos");
      }
    });

    return button;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function renderDiplomacy(state: GameState): void {
    const player = getPlayerKingdom(state);
    const playerIndices = getPlayerRegionIndicesCached(state, player);
    const neighborIds = new Set<string>();

    for (const idx of playerIndices) {
      const regionId = WORLD_DEFINITIONS_V1[idx].id;
      const definition = staticWorldData.definitions[regionId];
      
      for (const neighborRegionId of definition?.neighbors ?? []) {
        const neighborOwner = state.world.regions[neighborRegionId]?.ownerId;
        if (neighborOwner && neighborOwner !== player.id) {
          neighborIds.add(neighborOwner);
        }
      }
    }

    ui.diplomacyList.innerHTML = "";

    if (neighborIds.size === 0) {
      ui.diplomacyList.innerHTML = "<p>Nenhum vizinho diplomático direto no momento.</p>";
      return;
    }

    for (const targetId of Array.from(neighborIds).sort()) {
      const target = state.kingdoms[targetId];
      const relation = player.diplomacy.relations[targetId];

      const row = document.createElement("div");
      row.className = "diplomacy-row";
      row.innerHTML = `
        <div class="summary-grid">
          <span>Reino</span><strong>${target?.name ?? targetId}</strong>
          <span>Confiança</span><strong>${formatNumber((relation?.score.trust ?? 0) * 100)}%</strong>
          <span>Rivalidade</span><strong>${formatNumber((relation?.score.rivalry ?? 0) * 100)}%</strong>
          <span>Agravo</span><strong>${formatNumber((relation?.grievance ?? 0) * 100)}%</strong>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "action-grid diplomacy-actions";
      
      const canAlliance = session.canAfford(session.getDiplomaticConfig(state, player.id, targetId, "alliance").cost);
      const canPact = session.canAfford(session.getDiplomaticConfig(state, player.id, targetId, "non_aggression").cost);
      const canPeace = session.canAfford(session.getDiplomaticConfig(state, player.id, targetId, "peace").cost);
      const canTribute = session.canAfford(session.getDiplomaticConfig(state, player.id, targetId, "tribute").cost);
      const canEmbargo = session.canAfford(session.getDiplomaticConfig(state, player.id, targetId, "embargo").cost);
      const canVassalage = session.canAfford(session.getDiplomaticConfig(state, player.id, targetId, "demand_vassalage").cost);
      const canWar = session.canAfford(session.getDiplomaticConfig(state, player.id, targetId, "war").cost);
      const canMissionary = session.canAfford(session.getReligiousActionConfig(player.id, targetId, "send_missionaries").cost);

      actions.appendChild(createDiplomacyActionButton(targetId, "alliance", "Aliança", canAlliance));
      actions.appendChild(createDiplomacyActionButton(targetId, "non_aggression", "Pacto", canPact));
      actions.appendChild(createDiplomacyActionButton(targetId, "peace", "Paz", canPeace));
      actions.appendChild(createDiplomacyActionButton(targetId, "tribute", "Tributo Único", canTribute));
      actions.appendChild(createDiplomacyActionButton(targetId, "demand_vassalage", "Exigir Vassalagem", canVassalage));
      actions.appendChild(createDiplomacyActionButton(targetId, "embargo", "Embargo", canEmbargo));
      actions.appendChild(createDiplomacyActionButton(targetId, "war", "Declarar guerra", canWar));
      actions.appendChild(createReligiousActionButton(targetId, "send_missionaries", "Enviar missionários", canMissionary));

      row.appendChild(actions);
      ui.diplomacyList.appendChild(row);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function renderMilitary(state: GameState): void {
    const player = getPlayerKingdom(state);

    const activeWars = Object.keys(state.wars)
      .sort()
      .map((warId) => state.wars[warId])
      .filter((war) => war.attackers.includes(player.id) || war.defenders.includes(player.id));

    const totalManpower = getPlayerTotalManpower(state);

    ui.militarySummary.innerHTML = `
      <div class="summary-grid">
        <span>Postura</span><strong>${player.military.posture}</strong>
        <span>Manpower do Reino</span><strong>${formatNumber(totalManpower)}</strong>
        <span>Militarização Base</span><strong>2.5% da População</strong>
        <span>Tecnologia militar</span><strong>${formatNumber(player.military.militaryTechLevel)}</strong>
        <span>Guerras ativas</span><strong>${activeWars.length}</strong>
      </div>
    `;

    if (activeWars.length > 0) {
      const list = document.createElement("ul");
      list.className = "list";

      for (const war of activeWars) {
        const item = document.createElement("li");
        item.innerHTML = `<strong>${war.id}</strong><span>War score: ${formatNumber(war.warScore)}</span>`;
        list.appendChild(item);
      }

      ui.militarySummary.appendChild(list);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function renderEventLog(state: GameState): void {
    ui.eventList.innerHTML = "";

    const activeChains = Object.values(state.world.eventChains ?? {}).sort((left, right) => right.startedAt - left.startedAt);

    for (const chain of activeChains.slice(0, 5)) {
      const item = document.createElement("li");
      const kingdomName = state.kingdoms[chain.kingdomId]?.name ?? chain.kingdomId;
      const chainLabel = chain.chainType === "economic_crisis" ? "Crise economica" : "Guerra santa";
      item.className = "event-info";
      item.innerHTML = `
        <strong>Cadeia ativa: ${chainLabel}</strong>
        <span>${kingdomName} esta no estagio ${chain.stage}/${chain.maxStages}.</span>
        <small>Iniciada no tick ${chain.startedAt}.</small>
      `;
      ui.eventList.appendChild(item);
    }

    if (activeChains.length > 5) {
      const item = document.createElement("li");
      item.className = "event-info";
      item.textContent = `+${activeChains.length - 5} cadeias ativas adicionais em andamento.`;
      ui.eventList.appendChild(item);
    }

    if (state.events.length === 0 && activeChains.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Sem eventos recentes.";
      ui.eventList.appendChild(item);
      return;
    }

    for (const event of state.events.slice(0, 30)) {
      const item = document.createElement("li");
      const countText = event.count && event.count > 1 ? ` (x${event.count})` : "";
      const suggestion = event.suggestedAction ? `<small>Sugestão: ${event.suggestedAction}</small>` : "";
      item.className = `event-${event.severity}`;
      item.innerHTML = `<strong>${event.title}${countText}</strong><span>${event.details}</span>${suggestion}<small>${formatDate(event.occurredAt)}</small>`;
      ui.eventList.appendChild(item);
    }
  }

  function exposeAutomationHooks(): void {
    const debugWindow = window as DebugWindow;

    debugWindow.render_game_to_text = () => {
      const state = session.getState();
      if (!state) {
        return JSON.stringify({ mode: "booting" });
      }

      return buildRenderGameTextState({
        state,
        player: getPlayerKingdom(state),
        definitions: WORLD_DEFINITIONS_V1,
        simulation: currentSimulationState,
        activeLayer: ui.mapLayerSelect.value as MapLayerMode,
        selectedRegionId,
        selectedMapLabel
      });
    };

    debugWindow.advanceTime = async (ms: number) => {
      session.advanceTimeForTesting(ms);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    };
  }

  function buildMapRenderContext(state: GameState): MapRenderContext {
    const activeLayer = ui.mapLayerSelect.value as MapLayerMode;
    const contestedRegionIds = new Set<string>();
    const recentlyCapturedRegionIds = new Set<string>();
    const activeWarMarkerRegionIds = new Set<string>();
    const playerAlliedRegionIds = new Set<string>();
    const playerEnemyRegionIds = new Set<string>();
    const regionWealthRatio: Record<string, number> = {};
    const recentCaptureWindowMs = Math.max(30_000, state.meta.tickDurationMs * 24);

    // O pulso de captura recente (animação de borda) precisa rodar sempre
    for (const event of state.events) {
      if (event.occurredAt < state.meta.lastUpdatedAt - recentCaptureWindowMs) {
        continue;
      }
      if (event.groupKey?.startsWith("war.region_captured") && event.regionId) {
        recentlyCapturedRegionIds.add(event.regionId);
      }
    }

    // AVALIAÇÃO PREGUIÇOSA (LAZY EVALUATION)
    // O processamento pesado só ocorre se a camada correspondente estiver ativa na tela.
    if (activeLayer === "war" || activeLayer === "unrest") {
      for (const warId in state.wars) {
        const war = state.wars[warId];
        for (const front of war.fronts) {
          contestedRegionIds.add(front.regionId);
          activeWarMarkerRegionIds.add(front.regionId);
        }
      }

      const len = WORLD_DEFINITIONS_V1.length;
      for (let i = 0; i < len; i++) {
        const def = WORLD_DEFINITIONS_V1[i];
        if (def.isWater) continue;
        const region = state.world.regions[def.id];
        if (region && (region.unrest > 0.62 || region.devastation > 0.35)) {
          contestedRegionIds.add(def.id);
        }
      }
    }

    if (activeLayer === "diplomacy") {
      const player = getPlayerKingdom(state);
      const enemyIds = new Set<string>();

      for (const warId in state.wars) {
        const war = state.wars[warId];
        if (war.attackers.includes(player.id)) {
          war.defenders.forEach((id) => enemyIds.add(id));
        } else if (war.defenders.includes(player.id)) {
          war.attackers.forEach((id) => enemyIds.add(id));
        }
      }

      const len = WORLD_DEFINITIONS_V1.length;
      for (let i = 0; i < len; i++) {
        const def = WORLD_DEFINITIONS_V1[i];
        if (def.isWater) continue;
        const ownerId = state.world.regions[def.id]?.ownerId;
        if (!ownerId) continue;

        if (ownerId === player.id) {
          playerAlliedRegionIds.add(def.id);
        } else if (enemyIds.has(ownerId)) {
          playerEnemyRegionIds.add(def.id);
        } else {
          const relation = player.diplomacy.relations[ownerId];
          if (relation) {
            if (relation.score.trust > 0.6) {
              playerAlliedRegionIds.add(def.id);
            } else if (relation.score.rivalry > 0.6) {
              playerEnemyRegionIds.add(def.id);
            }
          }
        }
      }
    }

    if (activeLayer === "economy") {
      const goldData = currentSimulationState.goldData;
      if (goldData && goldData.length > 0) {
      let maxGold = Number.NEGATIVE_INFINITY;
      let minGold = Number.POSITIVE_INFINITY;

      for (let i = 0; i < goldData.length; i++) {
        if (goldData[i] > maxGold) {
          maxGold = goldData[i];
        }
        if (goldData[i] < minGold) {
          minGold = goldData[i];
        }
      }

      const range = maxGold - minGold;

      for (let i = 0; i < goldData.length; i++) {
        const def = WORLD_DEFINITIONS_V1[i];
        if (def) {
          if (range <= 0.001) {
            // Se não há desigualdade no mundo (todos produzem igual),
            // exibe uma cor média em vez do cinza de pobreza extrema.
            regionWealthRatio[def.id] = 0.3;
          } else {
            let ratio = (goldData[i] - minGold) / range;
            if (!Number.isFinite(ratio)) ratio = 0; // Proteção WebGL (Evita mapa cinza/rosa por NaN)
            regionWealthRatio[def.id] = Math.max(0, Math.min(1, ratio));
          }
        }
      }
      }
    }

    return {
      contestedRegionIds: Array.from(contestedRegionIds).sort(),
      recentlyCapturedRegionIds: Array.from(recentlyCapturedRegionIds).sort(),
      activeWarMarkerRegionIds: Array.from(activeWarMarkerRegionIds).sort(),
      playerAlliedRegionIds: Array.from(playerAlliedRegionIds).sort(),
      playerEnemyRegionIds: Array.from(playerEnemyRegionIds).sort(),
      regionWealthRatio,
      animationClockMs: typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now(),
      orderedDefinitions: WORLD_DEFINITIONS_V1
    };
  }

  async function renderSaveSlots(): Promise<void> {
    const slots = await session.listSaveSlots();
    ui.saveList.innerHTML = "";

    if (slots.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhum save encontrado.";
      ui.saveList.appendChild(empty);
      return;
    }

    for (const slot of slots) {
      ui.saveList.appendChild(buildSaveSlotElement(slot));
    }
  }

  function buildSaveSlotElement(slot: SaveSummary): HTMLElement {
    const item = document.createElement("div");
    item.className = "save-item";

    const metadata = document.createElement("div");
    metadata.className = "save-meta";
    metadata.innerHTML = `
      <strong>${slot.slotId}</strong>
      <span>${slot.playerKingdomName} • ${formatCalendarTime(slot.tick)}</span>
      <span>${formatDate(slot.savedAt)}</span>
      <span>Territórios: ${slot.territoryCount} | Militar: ${formatNumber(slot.militaryPower)}</span>
    `;

    const loadButton = document.createElement("button");
    loadButton.textContent = "Carregar";
    loadButton.addEventListener("click", async () => {
      Diagnostic.trace("CMD-UI", `Intenção de Carregamento Solicitada via UI. Slot alvo: ${slot.slotId}`);
      
      const saveState = await session.peekSaveSlot(slot.slotId);
      if (!saveState) {
        showToast("Erro: O save está corrompido ou vazio.");
        return;
      }

      const player = Object.values(saveState.kingdoms).find(k => k.isPlayer);
      const ciclo = formatCalendarTime(saveState.meta.tick);
      const tecnologias = player?.technology.unlocked.length ?? 0;
      const territorios = Object.values(saveState.world.regions).filter(r => r.ownerId === player?.id).length;
      
      let ouro = 0, comida = 0, popTotal = 0;
      if (saveState.ecs && player) {
        const capitalIndex = REGION_INDEX_MAP.get(player.capitalRegionId);
        
        if (capitalIndex !== undefined && capitalIndex !== -1) {
          ouro = saveState.ecs.gold[capitalIndex] ?? 0;
          comida = saveState.ecs.food[capitalIndex] ?? 0;
          popTotal = saveState.ecs.populationTotal[capitalIndex] ?? 0;
        }
      }

      const msg = `Deseja carregar este jogo?\n\n` +
                  `Ciclo: ${ciclo}\n` +
                  `Domínios: ${territorios}\n` +
                  `Tecnologias: ${tecnologias}\n` +
                  `Ouro na Capital: ${Math.floor(ouro)} | Comida: ${Math.floor(comida)}\n` +
                  `População (Capital): ${Math.floor(popTotal)}\n`;

      if (!confirm(msg)) {
        return;
      }

      try {
        const result = await session.loadSlot(slot.slotId);
        await renderSaveSlots();
        showToast("Save restaurado com sucesso.");
        Diagnostic.system("PERS-002", "Substituição do Mundo via Carregamento concluída com sucesso.", result);
      } catch (e) {
        Diagnostic.error("ERR-SYS", "Falha catastrófica ao carregar save da persistência local.", e);
        showToast("Falha ao carregar save. Verifique o console para detalhes.");
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Excluir";
    deleteButton.className = "danger";
    deleteButton.addEventListener("click", async () => {
      if (!confirm(`Tem certeza que deseja excluir o save "${slot.slotId}"? Esta ação é irreversível.`)) {
        return;
      }
      try {
        await session.deleteSlot(slot.slotId);
        await renderSaveSlots();
        showToast("Save excluído.");
      } catch (e) {
        Diagnostic.error("ERR-SYS", "Falha de IO ao tentar excluir save no Banco de Dados.", e);
        showToast("Falha ao excluir o save.");
      }
    });

    item.appendChild(metadata);
    item.appendChild(loadButton);
    item.appendChild(deleteButton);
    return item;
  }
  
  function updateMapLegend(layer: string): void {
    if (!ui.mapLegend) return;
    let html = "";
    switch(layer) {
      case "owner":
        html = `
          <div class="map-legend-title">Domínio Estratégico</div>
          <div class="legend-item"><span class="legend-color" style="background: #3b453b;"></span> Terra Selvagem (Inabitada)</div>
          <div class="legend-item"><span class="legend-color" style="background: #8d816e;"></span> Reinos e Tribos NPC</div>
          <div class="legend-item"><span class="legend-color" style="background: #ffffff; height: 3px;"></span> Fronteira Selecionada</div>
        `;
        break;
      case "unrest":
        html = `
          <div class="map-legend-title">Instabilidade Civil</div>
          <div class="legend-item"><span class="legend-color" style="background: #3e6b57;"></span> Calmo (0%)</div>
          <div class="legend-item"><span class="legend-color" style="background: #bb7a2a;"></span> Tensão Média (~45%)</div>
          <div class="legend-item"><span class="legend-color" style="background: #ad2a24;"></span> Rebelião Iminente (75%+)</div>
        `;
        break;
      case "war":
        html = `
          <div class="map-legend-title">Estado de Conflito</div>
          <div class="legend-item"><span class="legend-color" style="background: #8d816e; opacity: 0.5;"></span> Paz / Sem Disputa</div>
          <div class="legend-item"><span class="legend-color" style="background: #a31f1f; border: 1px dashed #fff;"></span> Guerra Ativa / Fronteira em Cerco</div>
        `;
        break;
      case "religion":
        html = `
          <div class="map-legend-title">Religiões Dominantes</div>
          <div class="legend-item"><span class="legend-color" style="background: #4a463c;"></span> Cultos Ancestrais (Nativos)</div>
          <div class="legend-item"><span class="legend-color" style="background: #75624a;"></span> Fé Estrangeira</div>
          <div style="margin-top: 6px; font-size: 0.75rem; color: #999;">Cores Vivas = Alta conversão</div>
        `;
        break;
      case "economy":
        html = `
          <div class="map-legend-title">Riqueza Relativa</div>
          <div class="legend-item"><span class="legend-color" style="background: #8d816e;"></span> Pobreza / Subsistência</div>
          <div class="legend-item"><span class="legend-color" style="background: #cca43b;"></span> Economia Estável</div>
          <div class="legend-item"><span class="legend-color" style="background: #f2d067;"></span> Polo de Riqueza Global</div>
        `;
        break;
      case "diplomacy":
        html = `
          <div class="map-legend-title">Postura Diplomática</div>
          <div class="legend-item"><span class="legend-color" style="background: #3e6b8c;"></span> Você e Aliados</div>
          <div class="legend-item"><span class="legend-color" style="background: #a32a2a;"></span> Inimigos Declarados</div>
          <div class="legend-item"><span class="legend-color" style="background: #8d816e;"></span> Países Neutros</div>
        `;
        break;
    }
    ui.mapLegend.innerHTML = html;
  }

  function renderState(state: GameState): void {
    // Limpa o cache todo início de render (1x por segundo) para forçar recálculo caso tenha anexado territórios
    cachedPlayerRegionIndices = null;

    if (currentWorkerSpeed !== state.meta.speedMultiplier || currentWorkerPaused !== state.meta.paused) {
      currentWorkerSpeed = state.meta.speedMultiplier;
      currentWorkerPaused = state.meta.paused;
      simulationWorker.postMessage({
        type: "SET_TIME_SCALE",
        payload: { speedMultiplier: currentWorkerSpeed, isPaused: currentWorkerPaused }
      });
    }

    // Sincronização passiva: Garante que os bônus de pesquisa cheguem ao motor global
    // A cada ~10 segundos (para não sobrecarregar as rotinas UI), varremos o status de Techs concluídas
    if (state.meta.tick > 0 && state.meta.tick % 10 === 0) {
       syncModifiersToWorker(state);
    }

    // Gravação da Timeline Economica e Geopolítica dos NPCs em tempo real
    if (isRecordingTelemetry && telemetryData) {
      const npcs = Object.values(state.kingdoms)
        .filter(k => k.id !== "k_nature") // Grava Player e NPCs
        .map(k => {
          const indices = getKingdomRegionIndices(state, k.id);
          let pop = 0, gold = 0, food = 0, unrestAcc = 0;
          for (const idx of indices) {
            pop += currentSimulationState.populationTotalData?.[idx] || 0;
            gold += currentSimulationState.goldData?.[idx] || 0;
            food += currentSimulationState.foodData?.[idx] || 0;
            unrestAcc += state.world.regions[WORLD_DEFINITIONS_V1[idx].id]?.unrest || 0;
          }
          return {
            id: k.id,
            nome: k.name,
            isPlayer: k.isPlayer,
            territorios: indices.length,
            populacao: Math.floor(pop),
            ouro: Math.floor(gold),
            comida: Math.floor(food),
            instabilidadeMedia: indices.length > 0 ? Number((unrestAcc / indices.length).toFixed(2)) : 0,
            objetivoIA: k.npc?.strategicGoal ?? "Player",
            guerras: Object.keys(state.wars).filter(w => state.wars[w].attackers.includes(k.id) || state.wars[w].defenders.includes(k.id)).length
          };
        });

      telemetryData.timelineEconomica.push({
        tick: state.meta.tick,
        reinos: npcs
      });
    }

    renderHeader(state);
    renderRuntimeMetrics(session.getRuntimeMetrics());
    renderResources();
    renderRiskIndicators(state);
    renderExplainers(state);
    renderRegionInfo(state);
    renderCouncil(state);
    renderGovernmentInputs(state);
    renderTechnology(state);
    renderReligion(state);
    renderDiplomacy(state);
    renderMilitary(state);
    renderEventLog(state);

    tabControllerManager.updateAllTabs(state);

    mapRenderer.render(state.world, state.kingdoms, buildMapRenderContext(state));
    ui.offlineProgressionToggle.checked = state.meta.offlineProgression ?? false;
    ui.immortalityToggle.checked = state.meta.immortalityEnabled ?? false;
  }

  ui.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab as TabId | undefined;
      if (tab) {
        setActiveTab(tab);
      }
    });
  });

  ui.pauseButton.addEventListener("click", () => {
    session.togglePause();
  });

  ui.speedSelect.addEventListener("change", () => {
    const speed = Number.parseFloat(ui.speedSelect.value);
    session.setSpeed(Number.isFinite(speed) ? speed : 1);
  });

  ui.openSettingsButton.addEventListener("click", () => {
    setActiveTab("configuracoes");
    const tabsSection = document.querySelector(".tabs.card");
    if (tabsSection) {
      tabsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  ui.manualSaveButton.addEventListener("click", async () => {
    try {
      Diagnostic.system("PERS-001", "Salvamento Manual Requisitado.");
      await session.saveManual();
      await renderSaveSlots();
      showToast("Save manual concluído.");
    } catch {
      showToast("Falha ao salvar.");
    }
  });

  ui.refreshSavesButton.addEventListener("click", async () => {
    await renderSaveSlots();
    showToast("Lista de saves atualizada.");
  });

  ui.exitToMenuBtn.addEventListener("click", () => {
    session.stop(true);
    window.location.href = window.location.pathname + "?menu=1";
  });

  ui.mapLayerSelect.addEventListener("change", () => {
    const layer = ui.mapLayerSelect.value as MapLayerMode;
    const state = session.getState();
    mapRenderer.setLayer(layer);
    mapRenderer.render(state.world, state.kingdoms, buildMapRenderContext(state));
    updateMapLegend(layer);
  });

  for (const input of governmentInputs) {
    input.addEventListener("input", () => {
      isGovernmentFormDirty = true;
    });
  }

  ui.governmentApplyButton.addEventListener("click", () => {
    Diagnostic.trace("CMD-UI", "Aplicando novas Políticas Fiscais e Orçamentárias.", { baseRate: ui.taxInputs.baseRate.value });
    session.updateTaxPolicy({
      baseRate: normalizePercentage(ui.taxInputs.baseRate.value),
      nobleRelief: normalizePercentage(ui.taxInputs.nobleRelief.value),
      clergyExemption: normalizePercentage(ui.taxInputs.clergyExemption.value),
      tariffRate: normalizePercentage(ui.taxInputs.tariffRate.value)
    });

    session.updateBudgetPriority({
      economy: normalizePercentage(ui.budgetInputs.economy.value),
      military: normalizePercentage(ui.budgetInputs.military.value),
      religion: normalizePercentage(ui.budgetInputs.religion.value),
      administration: normalizePercentage(ui.budgetInputs.administration.value),
      technology: normalizePercentage(ui.budgetInputs.technology.value)
    });

    isGovernmentFormDirty = false;
    renderGovernmentInputs(session.getState());
    showToast("Políticas de governo aplicadas.");
  });

  ui.expansionAutomationSelect.addEventListener("change", () => {
    const level = ui.expansionAutomationSelect.value as AutomationLevel;
    session.setExpansionAutomation(level);
    showToast(`Automação de Expansão: ${automationLevelLabel(level)}.`);
  });

  ui.constructionAutomationSelect.addEventListener("change", () => {
    const level = ui.constructionAutomationSelect.value as AutomationLevel;
    session.setConstructionAutomation(level);
    showToast(`Automação de Construção: ${automationLevelLabel(level)}.`);
  });

  ui.globalAutomationToggle.addEventListener("change", () => {
    const active = ui.globalAutomationToggle.checked;
    session.toggleGlobalAutomation(active);
    showToast(`Modo Automático Total ${active ? "Ativado" : "Desativado"}.`);
  });

  // Event Delegation para os botões do Conselho
  appRoot.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const hireId = target.dataset.hireId;
    const fireRole = target.dataset.fireRole;

    if (hireId) {
      let targetRole: MinisterRole | undefined = undefined;
      // Checa se era um candidato curinga e tenta pegar o cargo escolhido no dropdown
      const selectEl = document.getElementById(`wildcard-role-${hireId}`) as HTMLSelectElement;
      if (selectEl) targetRole = selectEl.value as MinisterRole;

      const result = session.hireMinister(hireId, targetRole);
      showToast(result.message);
    }

    if (fireRole) {
      const result = session.fireMinister(fireRole as MinisterRole);
      showToast(result.message);
    }

    // Intercepta ações de remanejamento de ministros
    const swapRole = target.dataset.swapRole;
    if (swapRole) {
      const state = session.getState();
      const player = getPlayerKingdom(state);
      const council = player?.administration.council || {};
      const ALL_ROLES = [MinisterRole.PrimeMinister, MinisterRole.Steward, MinisterRole.Marshal, MinisterRole.Chancellor, MinisterRole.Chaplain, MinisterRole.Scholar];
      const roleTitles: Record<string, string> = {
        [MinisterRole.PrimeMinister]: "Primeiro-Ministro (A Mão)",
        [MinisterRole.Steward]: "Intendente Real",
        [MinisterRole.Marshal]: "Lorde Marechal",
        [MinisterRole.Chancellor]: "Grão-Chanceler",
        [MinisterRole.Chaplain]: "Alto Capelão",
        [MinisterRole.Scholar]: "Sábio da Corte"
      };
      // Mostra um modal/prompt para escolher o novo cargo
      const availableRoles = ALL_ROLES.filter(r => !council[r] || r === swapRole);
      const options = availableRoles.map(r => `<option value="${r}" ${r === swapRole ? 'selected' : ''}>${roleTitles[r]}</option>`).join('');
      
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
        align-items: center; justify-content: center;
      `;
      
      modal.innerHTML = `
        <div style="background: #111; border: 2px solid #d4af37; border-radius: 8px; padding: 20px; max-width: 400px; width: 90%;">
          <h3 style="color: #d4af37; margin-top: 0;">Remanejar Ministro</h3>
          <p style="color: #ccc; margin-bottom: 15px;">Escolha o novo cargo para este ministro:</p>
          <select id="swap-target-role" style="width: 100%; padding: 8px; background: #222; color: #fff; border: 1px solid #555; border-radius: 4px; margin-bottom: 15px;">
            ${options}
          </select>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="swap-cancel" style="padding: 8px 16px; background: #666; border: none; border-radius: 4px; color: white; cursor: pointer;">Cancelar</button>
            <button id="swap-confirm" style="padding: 8px 16px; background: #d4af37; border: none; border-radius: 4px; color: #111; cursor: pointer; font-weight: bold;">Remanejar</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const cancelBtn = modal.querySelector('#swap-cancel') as HTMLButtonElement;
      const confirmBtn = modal.querySelector('#swap-confirm') as HTMLButtonElement;
      const selectEl = modal.querySelector('#swap-target-role') as HTMLSelectElement;
      
      cancelBtn.addEventListener('click', () => document.body.removeChild(modal));
      confirmBtn.addEventListener('click', () => {
        const targetRole = selectEl.value as MinisterRole;
        if (targetRole !== swapRole) {
          const result = session.reassignMinister(swapRole as MinisterRole, targetRole);
          showToast(result.message);
        }
        document.body.removeChild(modal);
      });
      
      // Fecha o modal ao clicar fora
      modal.addEventListener('click', (e) => {
        if (e.target === modal) document.body.removeChild(modal);
      });
    }
    
    // Intercepta ações de diálogo e interação
    const interactRole = target.dataset.interactRole;
    const interactAction = target.dataset.interactAction;
    if (interactRole && interactAction) {
      const result = session.interactMinister(interactRole as MinisterRole, interactAction as any);
      showToast(result.message);
    }
    
    // Intercepta os cliques nos botões de Projetos de Lei do conselho
    const btn = target.closest('button');
    if (btn) {
      const resolveAdviceId = btn.dataset.resolveAdvice;
      const resolveOptionId = btn.dataset.resolveOption;
      if (resolveAdviceId && resolveOptionId) {
        const result = session.resolveCouncilAdvice(resolveAdviceId, resolveOptionId);
        showToast(result.message);
      }
      
      const markReadId = btn.dataset.markRead;
      if (markReadId) {
        session.markAdviceRead(markReadId);
      }
    }
  });

  // Botões de Religião (Poderes Divinos Diretos)
  const btnBlessCrops = appRoot!.querySelector<HTMLButtonElement>("#btn-bless-crops");
  if (btnBlessCrops) {
    btnBlessCrops.addEventListener("click", () => {
      const state = session.getState();
      if (!state) return;
      const player = getPlayerKingdom(state);
      const indices = getPlayerRegionIndicesCached(state, player);
      const canBless = playerFaithCache >= 500;
      btnBlessCrops.disabled = !canBless;
      
      if (indices.length === 0) return;
      
      if (canBless) {
        // 1. Atualização Otimista (Optimistic UI): Dá o feedback visual instantâneo e impede spam de cliques
        playerFaithCache -= 500;
        const faithEl = appRoot!.querySelector("#faith-pool-value");
        if (faithEl) faithEl.textContent = formatNumber(playerFaithCache);
        const faithListEl = ui.resourceList.querySelector<HTMLLIElement>(`li[data-resource="faith"]`);
        if (faithListEl) faithListEl.textContent = `Fé: ${formatNumber(playerFaithCache)}`;

        // 2. Subtrai 500 de Fé reais da Memória RAM do império (Custo Proporcional Percentual)
        simulationWorker.postMessage({
          type: "APPLY_ECS_EFFECTS",
          payload: { target: "faith", operation: "subtract_empire_total", value: 500, indices }
        });
        
        flashUIElement(faithEl as HTMLElement, "#ff3333");
        
        // 3. Invoca a Bênção para explodir +2.000 de Comida Instantânea
        eventBus.publish({ type: "religion.blessing", payload: { kingdomId: player.id, amount: 2000 } } as any);
      } else {
        showToast("Fé insuficiente. Seus sacerdotes não foram ouvidos.");
      }
    });
  }

  ui.techApplyButton.addEventListener("click", () => {
    const focus = ui.techFocusSelect.value as TechnologyDomain;
    session.setResearchFocus(focus);
    showToast(`Foco de pesquisa atualizado para ${focus}.`);
  });

  ui.techAutomationSelect.addEventListener("change", () => {
    const level = ui.techAutomationSelect.value as AutomationLevel;
    session.setTechnologyAutomation(level);
    showToast(`Automação tecnológica: ${automationLevelLabel(level)}.`);
  });

  ui.religionChangeBtn.addEventListener("click", () => {
    const result = session.changeStateReligion(ui.religionChangeSelect.value);
    showToast(result.message);
  });

  ui.religionPolicySelect.addEventListener("change", () => {
    const rawVal = ui.religionPolicySelect.value;
    const policyVal = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
    session.setReligiousPolicy(policyVal as ReligiousPolicy);
    showToast("Postura oficial do clero atualizada.");
  });

  ui.techHideCompletedToggle.addEventListener("change", () => {
    hideCompletedTechnologies = ui.techHideCompletedToggle.checked;
    renderTechnology(session.getState());
  });

  ui.techClearGoalButton.addEventListener("click", () => {
    const result = session.setResearchGoal(null);
    showToast(result.message);
  });

  ui.profileSaveButton.addEventListener("click", () => {
    const nextName = ui.profileNameInput.value.trim();
    const nextEmail = ui.profileEmailInput.value.trim();

    if (nextName.length < 2) {
      showToast("Informe um nome de jogador com pelo menos 2 caracteres.");
      return;
    }

    profile = {
      ...profile,
      name: nextName,
      email: nextEmail,
      color: ui.profileColorInput.value
    };
    saveLocalProfile(profile);
    syncProfileUi();

    // Aplica a cor em tempo real ao império sem precisar de nova campanha
    const state = session.getState();
    if (state) {
      const player = getPlayerKingdom(state);
      player.color = profile.color;
      session.updateEcsState(state.ecs!); // Força commit de UI
    }
    showToast("Perfil local salvo.");
  });

  ui.offlineProgressionToggle.addEventListener("change", () => {
    session.setOfflineProgression(ui.offlineProgressionToggle.checked);
    showToast(`Progresso offline ${ui.offlineProgressionToggle.checked ? "ativado" : "desativado"}.`);
  });

  ui.immortalityToggle.addEventListener("change", () => {
    session.setImmortalityEnabled(ui.immortalityToggle.checked);
    showToast(`Modo Jogo Eterno ${ui.immortalityToggle.checked ? "ATIVADO" : "DESATIVADO"}.`);
  });
  
  const btnLinkFolder = document.getElementById("btn-link-folder") as HTMLButtonElement;
  const btnUnlinkFolder = document.getElementById("btn-unlink-folder") as HTMLButtonElement;
  const fsStatus = document.getElementById("fs-status") as HTMLSpanElement;

  if (!('showDirectoryPicker' in window)) {
    btnLinkFolder.disabled = true;
    fsStatus.textContent = "Navegador não suportado (Use Chrome/Edge).";
  } else {
    if (fsDirHandle) {
      btnLinkFolder.style.display = "none"; btnUnlinkFolder.style.display = "inline-block";
      fsStatus.textContent = `Pasta vinculada: ${fsDirHandle.name}`; fsStatus.style.color = "#4ade80";
      fsStatus.textContent = `Pasta vinculada: ${fsDirHandle.name}`; fsStatus.style.color = "#d4af37";
    }
    btnLinkFolder.addEventListener("click", async () => {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
        
        // VERIFICAÇÃO DE SEGURANÇA: Evita sobrescrever saves de outros navegadores (Edge vs Chrome)
        let hasExistingSave = false;
        try {
          await handle.getFileHandle("current_state.json");
          hasExistingSave = true;
        } catch (e) {}

        if (hasExistingSave) {
          const overwrite = confirm(
            "⚠️ ATENÇÃO: Esta pasta já contém um jogo salvo (possivelmente do seu outro navegador)!\n\n" +
            "• Clique em [OK] para APAGAR o save da pasta e colocar o jogo DESTE navegador lá.\n" +
            "• Clique em [CANCELAR] para MANTER o jogo da pasta (Recomendado para continuar o jogo do outro navegador)."
          );
          
          if (!overwrite) {
            await saveDirectoryHandle(handle);
            showToast("Pasta vinculada! Recarregue a página (F5) para carregar o jogo que já estava nela.");
            btnLinkFolder.style.display = "none"; btnUnlinkFolder.style.display = "inline-block";
            fsStatus.textContent = `Pasta vinculada: ${handle.name}`; fsStatus.style.color = "#4ade80";
            fsStatus.textContent = `Pasta vinculada: ${handle.name}`; fsStatus.style.color = "#d4af37";
            return; // Interrompe a migração para não apagar o save do outro navegador
          }
        }

        await saveDirectoryHandle(handle);
        
        // MIGRACÃO INSTANTÂNEA: Copia os saves que estavam escondidos no navegador para a nova pasta visível
        try {
          const state = session.getState();
          if (state) {
            const fsStateRepo = new WebFsGameStateRepository(handle);
            await fsStateRepo.saveCurrent(state);
            
            const fsSaveRepo = new WebFsSaveRepository(handle);
            const slots = await persistence.saveRepository.listSlots();
            for (const slot of slots) {
              const snap = await persistence.saveRepository.loadFromSlot(slot.slotId);
              if (snap) await fsSaveRepo.saveToSlot(snap);
            }
          }
        } catch (e) {
          console.warn("Apenas criando pasta nova. Ignorando cópia (nenhum jogo ativo ou erro).", e);
        }

        showToast("Saves copiados para a pasta! Recarregue a página (F5) para aplicar a sincronização.");
      } catch (e) { console.error(e); }
    });
    btnUnlinkFolder.addEventListener("click", async () => {
      await clearDirectoryHandle();
      btnLinkFolder.style.display = "inline-block"; btnUnlinkFolder.style.display = "none";
      fsStatus.textContent = "Nenhuma pasta vinculada."; fsStatus.style.color = "#bbb";
      showToast("Pasta desvinculada! Recarregue a página para voltar ao banco de dados interno.");
    });
  }

  new GodModeConsole(ui.appVersion, (command, targetId) => {
    const state = session.getState();
    if (!state) return;
    
    const targetKingdom = state.kingdoms[targetId];
    const targetRegionIndices = targetKingdom ? getKingdomRegionIndices(state, targetId) : [];

    switch (command) {
      case "gold_10k":
        if (targetRegionIndices.length > 0) {
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "gold", operation: "add", value: 10000, indices: targetRegionIndices }
          });
          if (targetKingdom?.isPlayer) flashUIElement(ui.resourceList.querySelector<HTMLLIElement>(`li[data-resource="gold"]`), "#00ff00");
        }
        showToast(`Modo Deus: +10.000 Ouro injetado em ${targetKingdom?.name ?? "Alvo"}.`);
        break;
      case "food_10k":
        if (targetRegionIndices.length > 0) {
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "food", operation: "add", value: 10000, indices: targetRegionIndices }
          });
          if (targetKingdom?.isPlayer) flashUIElement(ui.resourceList.querySelector<HTMLLIElement>(`li[data-resource="food"]`), "#00ff00");
        }
        showToast(`Modo Deus: +10.000 Comida injetada em ${targetKingdom?.name ?? "Alvo"}.`);
        break;
      case "faith_10k":
        if (targetRegionIndices.length > 0) {
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "faith", operation: "add", value: 10000, indices: targetRegionIndices }
          });
        }
        showToast(`Modo Deus: +10.000 Fé injetada em ${targetKingdom?.name ?? "Alvo"}.`);
        break;
      case "leg_10k":
        if (targetRegionIndices.length > 0) {
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "legitimacy", operation: "add", value: 10000, indices: targetRegionIndices }
          });
        }
        showToast(`Modo Deus: +10.000 Legitimidade injetada em ${targetKingdom?.name ?? "Alvo"}.`);
        break;
      case "ruin_economy":
        if (targetRegionIndices.length > 0) {
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "gold", operation: "set", value: 0, indices: targetRegionIndices }
          });
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "food", operation: "set", value: 0, indices: targetRegionIndices }
          });
        }
        showToast(`Modo Deus: APOCALIPSE. Recursos de ${targetKingdom?.name ?? "Alvo"} zerados.`);
        break;
      case "toggle_fog":
        isFogOfTruthDisabled = !isFogOfTruthDisabled;
        renderRegionInfo(state);
        showToast(`Modo Deus: Fog of Truth ${isFogOfTruthDisabled ? "DESATIVADO" : "ATIVADO"}.`);
        break;
      case "unlock_tech":
        showToast("Modo Deus: Desbloqueio requer rotina na GameSession. Em breve.");
        break;
      case "pop_1k":
        if (targetRegionIndices.length > 0) {
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "population", operation: "add", value: 1000, indices: targetRegionIndices }
          });
        }
        showToast(`Modo Deus: +1.000 Habitantes injetados em ${targetKingdom?.name ?? "Alvo"}.`);
        break;
      case "kill_pop":
        if (targetRegionIndices.length > 0) {
          simulationWorker.postMessage({
            type: "APPLY_ECS_EFFECTS",
            payload: { target: "population", operation: "set", value: 0, indices: targetRegionIndices }
          });
        }
        showToast(`Modo Deus: População dizimada nas regiões de ${targetKingdom?.name ?? "Alvo"}.`);
        break;
      case "force_disaster": {
        if (!targetKingdom) return;
        const isPlague = Math.random() > 0.5;
        const eventType = isPlague ? "disaster.plague" : "disaster.drought";
        const payload = {
          actorKingdomId: targetId,
          impact: isPlague ? "population_loss" : "food_loss"
        };
        eventBus.publish({ type: eventType, payload } as any);
        showToast(`Modo Deus: Forçando desastre (${isPlague ? 'Praga' : 'Seca'}) em ${targetKingdom.name}.`);
        if (targetKingdom.isPlayer) {
          const eventEl = ui.eventList.querySelector<HTMLLIElement>(`li`);
          flashUIElement(eventEl, "#ff3333");
          setActiveTab("eventos");
        }
        break;
      }
      case "add_unrest": {
        for (const idx of targetRegionIndices) {
          const def = WORLD_DEFINITIONS_V1[idx];
          if (state.world.regions[def.id]) state.world.regions[def.id].unrest = 1.0;
        }
        showToast(`Modo Deus: Regiões de ${targetKingdom?.name ?? "Alvo"} em Rebelião Total.`);
        break;
      }
      case "add_dev": {
        for (const idx of targetRegionIndices) {
          const def = WORLD_DEFINITIONS_V1[idx];
          if (state.world.regions[def.id]) state.world.regions[def.id].devastation = 1.0;
        }
        showToast(`Modo Deus: Regiões de ${targetKingdom?.name ?? "Alvo"} sofreram Devastação Máxima.`);
        break;
      }
      case "dump_state": {
        // HOLTER / RAIO-X PROFUNDO: Coleta de dados avançada para diagnóstico médico da simulação
        const player = getPlayerKingdom(state); // Necessário para o holter focar no jogador
        const playerIndices = getPlayerRegionIndicesCached(state, player);
        const topUnrestRegions = playerIndices
          .map(idx => {
            const rId = WORLD_DEFINITIONS_V1[idx].id;
            return { id: rId, unrest: state.world.regions[rId]?.unrest || 0 };
          })
          .filter(r => r.unrest > 0)
          .sort((a, b) => b.unrest - a.unrest)
          .slice(0, 3);

        // LEITURA GLOBAL DE NPCS: Avalia a saúde e evolução da Inteligência Artificial
        const npcs = Object.values(state.kingdoms)
          .filter(k => !k.isPlayer && k.id !== "k_nature")
          .map(k => {
            const indices = getKingdomRegionIndices(state, k.id);
            let pop = 0, gold = 0;
            for (const idx of indices) {
              pop += currentSimulationState.populationTotalData?.[idx] || 0;
              gold += currentSimulationState.goldData?.[idx] || 0;
            }
            return {
              nome: k.name,
              territorios: indices.length,
              populacao: Math.floor(pop),
              ouro: Math.floor(gold),
              estabilidade: Math.floor(k.stability),
              objetivoIA: k.npc?.strategicGoal ?? "Nenhum"
            };
          });

        const dump = {
          sinaisVitais: {
            ciclo: state.meta.tick,
            velocidadeWorker: currentWorkerSpeed,
            isPausado: currentWorkerPaused,
            progressoOfflineAtivo: state.meta.offlineProgression
          },
          economiaInterna: {
             // O que o reino gera vs o que ele gasta (POO Core)
             rendaPorTick: player.economy.incomePerTick,
             despesaPorTick: player.economy.upkeepPerTick,
             estoqueAtualECS: {
               ouro: getPlayerTotalResource(state, ResourceType.Gold),
               comida: getPlayerTotalResource(state, ResourceType.Food),
               fe: getPlayerTotalResource(state, ResourceType.Faith),
               legitimidade: getPlayerTotalResource(state, ResourceType.Legitimacy),
               populacaoVIVA: getPlayerTotalPopulation(state),
               manpower: getPlayerTotalManpower(state)
             },
             politicaFiscal: player.economy.taxPolicy,
             orcamento: player.economy.budgetPriority
          },
          geopolitica: {
            religiaoDeEstado: player.religion.stateFaith,
            relacoesDiplomaticas: Object.keys(player.diplomacy.relations).length,
            guerrasAtivas: Object.keys(state.wars).filter(w => state.wars[w].attackers.includes(player.id) || state.wars[w].defenders.includes(player.id)).length,
            regioesSobRiscoCritico: topUnrestRegions
          },
          concorrenciaGlobal: npcs,
          diagnosticoWorker: {
            // Verifica se a memória de alta performance está corrompida
            tamanhoArrayOuro: currentSimulationState.goldData?.length || 0,
            tamanhoArrayPop: currentSimulationState.populationTotalData?.length || 0,
            matrizEsperada: WORLD_DEFINITIONS_V1.length
          },
          analiseSintomatica: Array.from(ui.explainList.querySelectorAll('li')).map(li => li.textContent),
          focoPaciente: selectedRegionId ? {
             id: selectedRegionId,
             dono: state.world.regions[selectedRegionId]?.ownerId,
             populacao: currentSimulationState.populationTotalData?.[REGION_INDEX_MAP.get(selectedRegionId)!] || 0,
             feDominante: state.world.regions[selectedRegionId]?.dominantFaith,
             instabilidade: state.world.regions[selectedRegionId]?.unrest,
             tensaoReligiosa: state.world.regions[selectedRegionId]?.faithUnrest,
             devastacao: state.world.regions[selectedRegionId]?.devastation
          } : "Nenhuma região inspecionada no Raio-X"
        };
        
        console.log("%c================ HOLTER DE SIMULAÇÃO (RAIO-X PARA A IA) ================", "color: #ff3366; background: #220000; font-weight: bold; font-size: 14px; padding: 5px;");
        console.log(JSON.stringify(dump, null, 2));
        console.log("%c========================================================================", "color: #ff3366; background: #220000; font-weight: bold; font-size: 14px; padding: 5px;");
        
        showToast("Exame Holter gerado no Console (F12).");
        break;
      }
      case "toggle_telemetry": {
        const telemetryBtnEl = document.getElementById("btn-toggle-telemetry");
        if (!isRecordingTelemetry) {
          isRecordingTelemetry = true;
          telemetryData = {
            periodo: {
              inicioTick: state.meta.tick,
              inicioData: new Date().toISOString(),
            },
            configuracaoMundo: {
              velocidade: currentWorkerSpeed,
              progressoOffline: state.meta.offlineProgression
            },
            timelineEconomica: [],
            eventosOcorridos: []
          };
          if (telemetryBtnEl) {
            telemetryBtnEl.textContent = "⏹️ Parar Gravação Contínua (Holter)";
            telemetryBtnEl.style.background = "#ff3366";
            telemetryBtnEl.style.color = "#fff";
          }
          showToast("🔴 Holter Iniciado. Monitorando a mente das IAs e todos os eventos...");
        } else {
          isRecordingTelemetry = false;
          telemetryData.periodo.fimTick = state.meta.tick;
          telemetryData.periodo.fimData = new Date().toISOString();
          telemetryData.duracaoTicks = telemetryData.periodo.fimTick - telemetryData.periodo.inicioTick;
          
          console.log("%c================ RELATÓRIO HOLTER CONTÍNUO (LINHA DO TEMPO) ================", "color: #ff3366; background: #220000; font-weight: bold; font-size: 14px; padding: 5px;");
          console.log(JSON.stringify(telemetryData, null, 2));
          console.log("%c============================================================================", "color: #ff3366; background: #220000; font-weight: bold; font-size: 14px; padding: 5px;");
          
          if (telemetryBtnEl) {
            telemetryBtnEl.textContent = "🔴 Iniciar Gravação Contínua (Holter)";
            telemetryBtnEl.style.background = "#222";
            telemetryBtnEl.style.color = "#ff3366";
          }
          showToast("⏹️ Holter Parado. A Linha do Tempo foi exportada para o Console (F12).");
        }
        break;
      }
      default: {
        if (command.startsWith("spawn_legend:")) {
          const legendId = command.split(":")[1];
          const template = FAMILY_TRIBUTE_LEGENDARIES.find(l => l.historicalId === legendId);
          
          if (!template) {
             showToast(`Modo Deus: A Lenda '${legendId}' não foi reconhecida pelas crônicas.`);
             break;
          }

          if (!state.world.characters) state.world.characters = {};
          
          // Verifica se a lenda já nasceu neste universo
          const existing = Object.values(state.world.characters).find(c => c.historicalId === legendId);
          if (existing) {
             showToast(`Modo Deus: ${template.name} já caminha pelo mundo!`);
             break;
          }

          // Cria a entidade imortal/poderosa
          const charId = `char_${legendId}_${Date.now()}`;
          state.world.characters[charId] = {
             id: charId, historicalId: template.historicalId, name: template.name, title: template.title,
             isLegendary: true, birthTick: state.meta.tick, deathTick: null,
             stats: template.stats, traits: template.traits, status: "wanderer",
             locationKingdomId: targetKingdom?.id || null, employerKingdomId: null,
             affinity: { institutionalLoyalty: 100, personalAffinity: 100 },
             personalWealth: 5000,
             influence: 100,
             memory: [`Despertou no mundo como mito no ano ${formatCalendarTime(state.meta.tick)}.`]
          };

          // Força a entrada dele como um candidato recrutável na Corte do Alvo (Para o jogador poder testar a contratação)
          if (targetKingdom && targetKingdom.administration) {
             if (!targetKingdom.administration.candidatePool) targetKingdom.administration.candidatePool = [];
             
             targetKingdom.administration.candidatePool.unshift({
                id: charId, name: `${template.name}, ${template.title}`, role: MinisterRole.Wildcard,
                personality: MinisterPersonality.Progressive, origin: "Descido dos Céus (O Panteão)",
                skillLevel: 5, experience: 0, experienceToNext: 500,
                salary: 0, delegationLevel: AutomationLevel.Manual, loyalty: 100
             });
             state.world.characters[charId].status = "minister";
          }
          
          session.updateEcsState(state.ecs!); // Força persistência
          showToast(`Modo Deus: ${template.name} desceu aos mortais! Verifique os Candidatos do Conselho.`);
        }
        break;
      }
    }
  }, () => {
    const state = session.getState();
    if (!state) return [];
    return Object.values(state.kingdoms)
      .filter(k => k.id !== "k_nature")
      .map(k => ({ id: k.id, name: k.name, isPlayer: k.isPlayer }))
      .sort((a, b) => {
        if (a.isPlayer) return -1;
        if (b.isPlayer) return 1;
        return a.name.localeCompare(b.name);
      });
  });
  syncProfileUi();

  // Check for sync state first and move it to async if it exists
  const syncState = persistence.gameStateRepository.loadCurrentSync();
  if (syncState) {
    persistence.gameStateRepository.clearCurrentSync();
    await persistence.gameStateRepository.saveCurrent(syncState);
  }

  const currentState = await persistence.gameStateRepository.loadCurrent();
  const initialSlots = await persistence.saveRepository.listSlots();

  // Impede o "pulo" dos botões. Só mostra a UI quando o banco de dados responder.
  const splashLoadingIndicator = document.getElementById("splash-loading-indicator");
  const splashActions = document.getElementById("splash-actions");
  if (splashLoadingIndicator && splashActions) {
    splashLoadingIndicator.style.display = "none";
    splashActions.style.display = "flex";
  }

  // Mostrar botão "Carregar Jogo Salvo" sempre, mas com texto diferente se não há saves
  ui.splashContinueBtn.style.display = "inline-block";

  if (initialSlots.length > 0 || currentState) {
    ui.splashContinueBtn.textContent = "Carregar Jogo Salvo";
    ui.splashContinueBtn.title = "Carregar seu jogo salvo mais recente";
  } else {
    ui.splashContinueBtn.textContent = "Carregar Jogo Salvo";
    ui.splashContinueBtn.disabled = true;
    ui.splashContinueBtn.title = "Nenhum jogo salvo encontrado. Comece uma nova campanha primeiro.";
    ui.splashContinueBtn.style.opacity = "0.5";
  }

  ui.splashNewBtn.addEventListener("click", () => {
    ui.splashForm.classList.remove("is-hidden");
    if (splashActions) splashActions.style.display = "none";
  });

  ui.splashContinueBtn.addEventListener("click", async () => {
    // Se não há saves nem estado atual, mostrar mensagem e não fazer nada
    if (initialSlots.length === 0 && !currentState) {
      alert("Nenhum jogo salvo encontrado. Comece uma nova campanha primeiro.");
      return;
    }

    // UX: Fornece feedback visual de que o jogo está processando dados densos
    ui.splashContinueBtn.disabled = true;
    ui.splashNewBtn.disabled = true;

    // `currentState` and `initialSlots` are from the outer scope and already loaded.
    let stateToBoot: GameState | null = currentState;
    let willCalculateOffline = false;

    // Espia a configuração do save para não mentir para o usuário
    if (!stateToBoot && initialSlots.length > 0) {
      const mostRecentSlot = [...initialSlots].sort((a, b) => b.savedAt - a.savedAt)[0];
      const peekState = await session.peekSaveSlot(mostRecentSlot.slotId);
      if (peekState?.meta.offlineProgression) willCalculateOffline = true;
    } else if (stateToBoot?.meta.offlineProgression) {
      willCalculateOffline = true;
    }

    ui.splashContinueBtn.textContent = willCalculateOffline 
      ? "Calculando tempo ausente... Aguarde." 
      : "Restaurando simulação... Aguarde.";
      
    // Força 2 frames de repintura nativa da GPU antes de travar a CPU com matemática O(N)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    if (!stateToBoot && initialSlots.length > 0) {
      Diagnostic.system("SYS-BOOT", "Sem estado em memória. Auto-selecionando o save mais recente...");
      // No active session, but there are saved slots. Load the most recent one.
      const mostRecentSlot = [...initialSlots].sort((a, b) => b.savedAt - a.savedAt)[0];

      try {
        // `loadSlot` will place the session in the correct state and return the state object.
        stateToBoot = await session.loadSlot(mostRecentSlot.slotId);
        showToast(`Continuando do save: ${mostRecentSlot.slotId}`);
      } catch (e) {
        Diagnostic.error("ERR-SYS", "Auto-Boot falhou ao extrair o save mais recente.", e);
        showToast("Falha ao carregar save. Verifique o console.");
        ui.splashContinueBtn.disabled = false;
        ui.splashContinueBtn.textContent = "Continuar Jornada";
        return; // Abort on failure
      }
    }

    if (stateToBoot) {
      await startGameplay(stateToBoot);
    } else {
      // This case should not be reached if the button is only visible when there's something to load.
      // As a fallback, show the new game form.
      ui.splashForm.classList.remove("is-hidden");
      if (splashActions) splashActions.style.display = "none";
    }
  });

  ui.splashStartBtn.addEventListener("click", async () => {
    const currentSlots = await persistence.saveRepository.listSlots();
    if (currentSlots.length > 0 && !confirm("ATENÇÃO: Fundar um novo império apagará TODO o seu progresso da campanha atual. Deseja continuar?")) {
      return;
    }

    ui.splashStartBtn.disabled = true;
    ui.splashStartBtn.textContent = "Forjando mundo...";

    profile = { ...profile, name: ui.splashMonarchInput.value.trim() || "Soberano", color: ui.splashColorInput.value };
    saveLocalProfile(profile);
    syncProfileUi(); // Força a atualização da aba Configurações imediatamente

    session.stop();
    const slotsToDelete = await persistence.saveRepository.listSlots();
    for (const slot of slotsToDelete) {
      await persistence.saveRepository.deleteSlot(slot.slotId);
    }
    await persistence.gameStateRepository.clearCurrent();
    
    const selectedRegionId = ui.splashCountrySelect.value;
    const freshState = createInitialState(staticWorldData, selectedRegionId, WORLD_DEFINITIONS_V1);

    const playerKingdom = freshState.kingdoms["k_player"];
    if (playerKingdom) {
      const def = WORLD_DEFINITIONS_V1.find(d => d.id === selectedRegionId);
      const monarchName = ui.splashMonarchInput.value.trim() || "Soberano";
      playerKingdom.name = `Tribo de ${monarchName}`;
      playerKingdom.adjective = def ? def.name : "Nativo";
      playerKingdom.color = profile.color;

      // Cria a Entidade do Monarca no ECS e entrega a ele o Trono
      const charId = `char_player_${Date.now()}`;
      playerKingdom.rulerId = charId;
      
      if (!freshState.world.characters) freshState.world.characters = {};
      freshState.world.characters[charId] = {
        id: charId, historicalId: "player_monarch",
        name: monarchName, title: "o Fundador",
        isLegendary: true, // Monarcas do jogador vivem até os 75 anos no mínimo
        birthTick: 0, deathTick: null,
        stats: { ...playerStats }, traits: ["ambitious"],
        status: "ruler", locationKingdomId: playerKingdom.id, employerKingdomId: playerKingdom.id,
        affinity: { institutionalLoyalty: 100, personalAffinity: 100 },
        personalWealth: 0, influence: 100,
        memory: [`Unificou as tribos e forjou a coroa no Ano 1.`]
      };

      // Gera herdeiros para o novo monarca
      const heir1 = generateHeir(freshState.world.characters[charId], playerKingdom.id, 0);
      const heir2 = generateHeir(freshState.world.characters[charId], playerKingdom.id, 0);
      freshState.world.characters[heir1.id] = heir1;
      freshState.world.characters[heir2.id] = heir2;
      playerKingdom.heirs = [heir1.id, heir2.id];
    }

    await persistence.gameStateRepository.saveCurrent(freshState);

    ui.splashStartBtn.disabled = false;
    ui.splashStartBtn.textContent = "Fundar Império";
    await startGameplay(freshState);
  });

  async function startGameplay(stateToBoot: GameState | null) {
    // Não ocultar a tela ainda. O processo de loading ficará visual!
    const bootState = stateToBoot ?? createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1);
    
    // Injeta a cor do jogador escolhida no menu de forma irrevogável
    const player = getPlayerKingdom(bootState);
    if (player && profile.color) {
      player.color = profile.color;
    }

    const finalState = await session.bootstrap(bootState);
    
    // Sincroniza o perfil local e a tela inicial com a cor que efetivamente veio do save carregado
    const loadedPlayer = getPlayerKingdom(finalState);
    if (loadedPlayer && loadedPlayer.color && loadedPlayer.color !== profile.color) {
      profile = { ...profile, color: loadedPlayer.color };
      saveLocalProfile(profile);
      syncProfileUi();
    }
    
    mapRenderer.setLayer("owner");
    updateMapLegend("owner");
    await mapRenderer.mount(finalState.world, finalState.kingdoms);

    // Oculta a tela somente APÓS a matemática terminar e o mapa estar desenhado
    ui.splashScreen.classList.add("is-hidden");
    document.body.classList.remove("is-modal-open");
    document.body.classList.remove("is-modal-open");

    session.subscribe((state) => {
      renderState(state);
    });

    const debugWindow = window as DebugWindow;
    debugWindow.__DEBUG_SESSION = session;
    debugWindow.__WORLD_DEFS = WORLD_DEFINITIONS_V1;
    exposeAutomationHooks();

    await renderSaveSlots();
    session.start();
    simulationWorker.postMessage({ type: "START" as const });
  }

  window.addEventListener("beforeunload", () => {
    session.stop(true);
    mapRenderer.destroy();
  });
}

void bootstrapApp().catch((error: unknown) => {
  Diagnostic.error("ERR-SYS", "Falha irreversível na injeção principal do arquivo Bootstrap.", error);

  const appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.innerHTML = `
      <main class="app-shell">
        <section class="card">
          <h1>Falha na inicialização</h1>
          <p>Verifique o console do navegador para detalhes.</p>
        </section>
      </main>
    `;
  }
});

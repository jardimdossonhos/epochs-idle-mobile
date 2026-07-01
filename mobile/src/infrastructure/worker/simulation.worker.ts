import { World } from "../../core/ecs/World";
import { EconomyComponent } from "../../core/components/EconomyComponent";
import { PopulationComponent } from "../../core/components/PopulationComponent";
import { MilitaryComponent } from "../../core/components/MilitaryComponent";
import type { EcsState } from "../../core/models/game-state";
import { EconomySystem } from "../../core/systems/EconomySystem";
import { PopulationSystem } from "../../core/systems/PopulationSystem";
import { MilitarySystem } from "../../core/systems/MilitarySystem";

const DiagnosticWorker = {
  trace: (code: string, message: string, data?: any) => {
    console.log(`%c[${code}]%c ${message}`, "color: #ff9900; background: #222; padding: 2px 4px; border-radius: 3px; font-weight: bold;", "color: inherit;", data !== undefined ? data : "");
  },
  warn: (code: string, message: string, data?: any) => {
    console.warn(`[${code}] ${message}`, data !== undefined ? data : "");
  }
};

let intervalId: number | null = null;

let world: World | null = null;
let economy: EconomyComponent | null = null;
let population: PopulationComponent | null = null;
let military: MilitaryComponent | null = null;
let geography: { isWater: Uint8Array; biome: Uint8Array } | null = null;
const economySystem = new EconomySystem();
const populationSystem = new PopulationSystem();
const militarySystem = new MilitarySystem();

const activeEntities: number[] = [];
let activeModifiers: Record<string, Float64Array> | null = null;

type WorkerCommand =
  | { type: "START" }
  | { type: "STOP" }
  | { type: "INIT"; payload: { entityCount: number; isWaterData: Uint8Array; biomeData: Uint8Array } }
  | { type: "RESTORE_ECS_STATE"; payload: EcsState }
  | { type: "EXTRACT_SAVE_STATE" }
  | { type: "PAUSE_AND_EXTRACT_STATE" }
  | { type: "RESUME" }
  | { type: "SET_TIME_SCALE"; payload: { speedMultiplier: number; isPaused: boolean } }
  | { type: "APPLY_ECS_EFFECTS"; payload: { target: string; operation: string; value: number; indices: number[] } }
  | { type: "UPDATE_MODIFIERS"; payload: Record<string, Float64Array> };

interface TickMessage {
  type: "TICK";
  payload: {
    timestamp: number;
    goldData: Float64Array;
    foodData: Float64Array;
    woodData: Float64Array;
    ironData: Float64Array;
    faithData: Float64Array;
    legitimacyData: Float64Array;
    populationTotalData: Float64Array;
    populationGrowthRateData: Float64Array;
    manpowerData: Float64Array;
  };
}

let debugTickCount = 0;
let speedMultiplier = 1;
let isPaused = false;
function startClock(): void {
  if (intervalId !== null) {
    return;
  }

  if (!world || !economy || !population || !military || activeEntities.length === 0) {
    // Ainda não inicializado via INIT; não inicia o relógio.
    return;
  }

  let lastTickMs = typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

  intervalId = self.setInterval(() => {
    const nowMs = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
    const deltaTimeSeconds = Math.max(0, (nowMs - lastTickMs) / 1_000);
    lastTickMs = nowMs;

    if (economy && population && military && geography) {
      if (!isPaused && speedMultiplier > 0) {
        const gameDeltaTime = deltaTimeSeconds * speedMultiplier;
        economySystem.update(gameDeltaTime, economy, population, activeEntities, activeModifiers);
        populationSystem.update(gameDeltaTime, population, activeEntities, activeModifiers, geography.biome);
        militarySystem.update(gameDeltaTime, military, population, activeEntities, activeModifiers);
      }

      debugTickCount++;
      if (debugTickCount % 40 === 0) { // Log aprox a cada 10s reais
        DiagnosticWorker.trace("WRK-ADT", `Tick Físico ${debugTickCount} processado.`, { speed: `${speedMultiplier}x`, deltaMs: deltaTimeSeconds });
      }

      const message: TickMessage = {
        type: "TICK",
        payload: {
          timestamp: Date.now(),
          goldData: economy.gold,
          foodData: economy.food,
          woodData: economy.wood,
          ironData: economy.iron,
          faithData: economy.faith,
          legitimacyData: economy.legitimacy,
          populationTotalData: population.total,
          populationGrowthRateData: population.growthRate,
          manpowerData: military.manpower
        }
      };
      self.postMessage(message);
    }
  }, 250); // 4 ciclos por segundo real para fluidez visual (Buttery Smooth UI)
}

function stopClock(): void {
  if (intervalId !== null) {
    self.clearInterval(intervalId);
    intervalId = null;
  }
}

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;

  if (!command || typeof command.type !== "string") {
    return;
  }

  switch (command.type) {
    case "UPDATE_MODIFIERS": {
      activeModifiers = command.payload;
      DiagnosticWorker.trace("WRK-MOD", `Modificadores de tecnologia recebidos e aplicados.`, { keys: Object.keys(command.payload) });
      break;
    }
    case "SET_TIME_SCALE": {
      speedMultiplier = command.payload.speedMultiplier;
      isPaused = command.payload.isPaused;
      break;
    }
    case "INIT": {
      const count = command.payload?.entityCount ?? 0;
      world = new World();
      economy = new EconomyComponent(count > 0 ? count : 1);
      population = new PopulationComponent(count > 0 ? count : 1);
      military = new MilitaryComponent(count > 0 ? count : 1);
      geography = {
        isWater: command.payload.isWaterData,
        biome: command.payload.biomeData
      };
      activeEntities.length = 0;
      // Apenas aloca as entidades. O preenchimento virá do RESTORE_ECS_STATE ou de uma lógica de "novo jogo".
      for (let i = 0; i < count; i += 1) {
        const entityId = world.createEntity();
        activeEntities.push(entityId);
      }
      DiagnosticWorker.trace("WRK-ECS", `Alocação Inicial ECS concluída. Reservados blocos para ${count} províncias.`, { geoMatrixSize: geography?.isWater.length });
      break;
    }
    case "EXTRACT_SAVE_STATE": {
      if (!economy || !population || !military) {
        return;
      }

      const saveData: EcsState = {
        gold: Array.from(economy.gold),
        food: Array.from(economy.food),
        wood: Array.from(economy.wood),
        iron: Array.from(economy.iron),
        faith: Array.from(economy.faith || []),
        legitimacy: Array.from(economy.legitimacy || []),
        populationTotal: Array.from(population.total),
        populationGrowthRate: Array.from(population.growthRate),
        manpower: Array.from(military.manpower)
      };

      self.postMessage({ type: "SAVE_STATE_DATA", payload: saveData });
      break;
    }
    case "PAUSE_AND_EXTRACT_STATE": {
      stopClock();
      if (!economy || !population || !military) return;
      const saveData: EcsState = {
        gold: Array.from(economy.gold),
        food: Array.from(economy.food),
        wood: Array.from(economy.wood),
        iron: Array.from(economy.iron),
        faith: Array.from(economy.faith || []),
        legitimacy: Array.from(economy.legitimacy || []),
        populationTotal: Array.from(population.total),
        populationGrowthRate: Array.from(population.growthRate),
        manpower: Array.from(military.manpower)
      };
      self.postMessage({ type: "SAVE_STATE_DATA", payload: saveData });
      break;
    }
    case "RESUME": {
      startClock();
      break;
    }
    case "RESTORE_ECS_STATE": {
      if (!economy || !population || !military) {
        DiagnosticWorker.warn("WRK-ERR", "Comando de Restauração falhou: Arrays nulos antes do preenchimento.");
        return;
      }
      const state = command.payload;
      
      // Usamos o tamanho alocado internamente. Mesmo que o JSON recebido 
      // seja um objeto esparso, garantimos que todos os índices recebam o valor ou 0.
      if (state.gold) {
        const len = economy.gold.length;
        let nonZeroCount = 0;
        for (let i = 0; i < len; i++) {
          economy.gold[i] = state.gold[i] || 0;
          economy.food[i] = state.food[i] || 0;
          economy.wood[i] = state.wood[i] || 0;
          economy.iron[i] = state.iron[i] || 0;
          if (economy.faith && state.faith) economy.faith[i] = state.faith[i] || 0;
          if (economy.legitimacy && state.legitimacy) economy.legitimacy[i] = state.legitimacy[i] || 0;
          if (population.total && state.populationTotal) population.total[i] = state.populationTotal[i] || 0;
          if (population.growthRate && state.populationGrowthRate) population.growthRate[i] = state.populationGrowthRate[i] || 0;
          if (military.manpower && state.manpower) military.manpower[i] = state.manpower[i] || 0;
          if (
            economy.gold[i] > 0 ||
            economy.food[i] > 0 ||
            economy.wood[i] > 0 ||
            economy.iron[i] > 0 ||
            (economy.faith && economy.faith[i] > 0) ||
            (economy.legitimacy && economy.legitimacy[i] > 0) ||
            (population.total && population.total[i] > 0) ||
            (population.growthRate && population.growthRate[i] !== 0) ||
            (military.manpower && military.manpower[i] > 0)
          ) {
            nonZeroCount++;
          }
        }
        DiagnosticWorker.trace(
          "WRK-ECS",
          `Restauração Finalizada: ${len} células restauradas. ${nonZeroCount} continham dados não nulos.`
        );
      }
      
      // Handshake Crítico: Avisa a Main Thread que os dados foram restaurados com sucesso
      self.postMessage({ type: "WORKER_STATE_RESTORED" });
      break;
    }
    case "APPLY_ECS_EFFECTS": {
      if (!economy || !population || !military) return;
      
      const { target, operation, value, indices } = command.payload;
      let targetArray: Float64Array | null = null;

      // Roteamento O(1): Mapeia a string segura para o ponteiro de memória real
      switch (target) {
        case "gold": targetArray = economy.gold; break;
        case "food": targetArray = economy.food; break;
        case "wood": targetArray = economy.wood; break;
        case "iron": targetArray = economy.iron; break;
        case "faith": targetArray = economy.faith; break;
        case "legitimacy": targetArray = economy.legitimacy; break;
        case "population": targetArray = population.total; break;
        case "manpower": targetArray = military.manpower; break;
      }

      if (!targetArray) {
        DiagnosticWorker.warn("WRK-ERR", `APPLY_ECS_EFFECTS ignorado: alvo '${target}' não encontrado na arquitetura.`);
        return;
      } else {
        DiagnosticWorker.trace("WRK-ECS", `APPLY_ECS_EFFECTS: { op: ${operation}, target: ${target}, val: ${value}, indices: ${indices.length} }`);
      }

      if (operation === "subtract_empire_total") {
        // Rateio Proporcional (Taxação Uniforme): Drena recursos percentualmente baseando-se no total do império
        let empireTotal = 0;
        for (let i = 0; i < indices.length; i++) {
          const idx = indices[i];
          if (idx >= 0 && idx < targetArray.length) empireTotal += targetArray[idx];
        }

        if (empireTotal > 0) {
          const safeValue = Math.min(value, empireTotal); // Evita cobrar mais de 100%
          const preserveRatio = 1 - (safeValue / empireTotal);

          for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            if (idx >= 0 && idx < targetArray.length) targetArray[idx] = targetArray[idx] * preserveRatio;
          }
        }
      } else if (operation === "add_empire_total") {
        // Rateio Igualitário: Distribui uma injeção global de recurso fatiada igualmente por todos os territórios
        const slice = indices.length > 0 ? value / indices.length : 0;
        for (let i = 0; i < indices.length; i++) {
          const idx = indices[i];
          if (idx >= 0 && idx < targetArray.length) targetArray[idx] += slice;
        }
      } else {
        // Mutação em Lote de Alta Performance Original (Aplica o valor BRUTO em CADA província, ideal para Modo Deus e Desastres Locais)
        for (let i = 0; i < indices.length; i++) {
          const idx = indices[i];
          if (idx >= 0 && idx < targetArray.length) {
            if (operation === "add") targetArray[idx] += value;
            else if (operation === "set") targetArray[idx] = value;
            else if (operation === "subtract") targetArray[idx] = Math.max(0, targetArray[idx] - value); // Proteção contra recursos negativos
          }
        }
      }
      break;
    }
    case "START":
      startClock();
      break;
    case "STOP":
      stopClock();
      break;
  }
};

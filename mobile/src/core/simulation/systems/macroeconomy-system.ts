import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { SpatialGridSystem, MAX_REGIONS } from "../spatial/spatial-grid-system";
import { ArmyPool } from "../../ecs/army-pool";
import { MAX_ARMIES } from "../spatial/spatial-grid-system";

const SIMULATED_DAY_DURATION = 1000;
const BASE_CAPACITY = 200;
const UPKEEP_CONSTANT = 0.01;
const DESERTION_RATE = 0.15;
const MAX_FACTIONS = 256; // Constante global de teto de facções no ECS

export class MacroEconomySystem implements SimulationSystem {
  public readonly id = "macroeconomy_system";
  private spatialGrid: SpatialGridSystem;

  constructor(spatialGrid: SpatialGridSystem) {
    this.spatialGrid = spatialGrid;
  }

  public run(context: TickContext): void {
    const state = context.nextState;
    if (!state.ecs) return;

    const ecs = state.ecs;

    // Relógio Simulado: Isola o Macro-Tick do delta de frames da vida real e aplica o multiplicador (Speed up/Pause)
    ecs.accumulatedSimulatedTime += (context.deltaMs * context.tickScale);

    if (ecs.accumulatedSimulatedTime < SIMULATED_DAY_DURATION) {
      return;
    }

    // Abate a constante consumida pelo ciclo atual (Se o tempo acelerar demais, os dias se acumulam perfeitamente)
    ecs.accumulatedSimulatedTime -= SIMULATED_DAY_DURATION;

    // Passo A: Reset Teto Dinâmico
    for (let i = 0; i < MAX_FACTIONS; i++) {
      ecs.factionManpowerCap[i] = BASE_CAPACITY;
    }

    // Passo B: Geração Geográfica e Fiscal O(N)
    for (let i = 0; i < MAX_REGIONS; i++) {
      const owner = ecs.regionOwner[i];
      if (owner !== -1) {
        ecs.factionManpowerCap[owner] += ecs.regionManpowerCap[i];
        ecs.factionManpowerReserve[owner] += ecs.regionManpowerYield[i];
        ecs.factionGoldBalance[owner] += ecs.regionGoldYield[i];
      }
    }

    // Passo C: Corte da Trava Idle (Protege contra overflows quando o jogo fecha)
    for (let i = 0; i < MAX_FACTIONS; i++) {
      ecs.factionManpowerReserve[i] = Math.min(ecs.factionManpowerReserve[i], ecs.factionManpowerCap[i]);
    }

    // Passo D: Manutenção Militar e Deserção O(A)
    for (let i = 0; i < MAX_ARMIES; i++) {
      const army = ArmyPool.instances[i];
      if (!army.isActive) continue;

      const owner = army.factionIndex;
      
      // O salário é contínuo a cada ciclo diário
      const upkeep = army.manpower * UPKEEP_CONSTANT;
      ecs.factionGoldBalance[owner] -= upkeep;

      // Falência Nacional
      if (ecs.factionGoldBalance[owner] < 0) {
        ecs.factionGoldBalance[owner] = 0; // Trava a dívida matemática infinita

        // Deserção punitiva por falta de pagamento
        const desertionLoss = Math.max(1, Math.floor(army.manpower * DESERTION_RATE));
        army.manpower -= desertionLoss;

        if (army.manpower <= 0) {
          army.isActive = false;
          // Ejeção O(1) da malha física, liberando espaço de movimentação para inimigos
          this.spatialGrid.remove(army._poolIdx, army.stationedIndex);
        }
      }
    }
  }
}

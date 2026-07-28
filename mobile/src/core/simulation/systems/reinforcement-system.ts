import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { SpatialGridSystem } from "../spatial/spatial-grid-system";
import { ArmyPool } from "../../ecs/army-pool";
import { MAX_ARMIES } from "../spatial/spatial-grid-system";

const BASE_REINFORCEMENT_RATE = 5.0; // Taxa de reposição base por tick em território seguro

export class ReinforcementSystem implements SimulationSystem {
  public readonly id = "reinforcement_system";
  private spatialGrid: SpatialGridSystem;

  constructor(spatialGrid: SpatialGridSystem) {
    this.spatialGrid = spatialGrid;
  }

  public run(context: TickContext): void {
    const state = context.nextState;
    if (!state.ecs) return;

    const { regionOwner, regionCaptureProgress, factionManpowerReserve } = state.ecs;

    for (let i = 0; i < MAX_ARMIES; i++) {
      const army = ArmyPool.instances[i];
      
      if (!army.isActive) continue;

      const stationedIndex = army.stationedIndex;
      if (stationedIndex === -1) continue;

      const factionId = army.factionIndex;

      // Restrição Geográfica: O território deve pertencer à facção do exército
      if (regionOwner[stationedIndex] !== factionId) continue;

      // Validação de Tensão Política: O território não pode estar sob disputa de captura
      if (regionCaptureProgress[stationedIndex] > 0) continue;

      // Validação Física (Conflito no Hexágono): O território não pode conter exércitos estrangeiros
      let conflict = false;
      let curr = this.spatialGrid.hexHead[stationedIndex];
      while (curr !== -1) {
        const otherArmy = ArmyPool.instances[curr];
        if (otherArmy.isActive && otherArmy.factionIndex !== factionId) {
          conflict = true;
          break;
        }
        curr = this.spatialGrid.armyNext[curr];
      }

      if (conflict) continue;

      // Matemática do Recrutamento Modular
      if (army.manpower < army.maxManpower) {
        const requested = Math.min(army.maxManpower - army.manpower, BASE_REINFORCEMENT_RATE);
        const availableInReserve = factionManpowerReserve[factionId];

        if (availableInReserve > 0) {
          const applied = Math.min(requested, availableInReserve);
          
          army.manpower += applied;
          factionManpowerReserve[factionId] -= applied;
        }
      }
    }
  }
}

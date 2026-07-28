import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { SpatialGridSystem, MAX_REGIONS } from "../spatial/spatial-grid-system";
import { ArmyPool } from "../../ecs/army-pool";

const BASE_REGEN_RATE = 10.0;
const DISORDER_REGEN_RATE = 1.0;
const CONSUMPTION_RATE = 0.5; // Manpower cost ratio
const ATTRITION_MULTIPLIER = 1.5; // Fator punitivo de morte por déficit

export class LogisticsSystem implements SimulationSystem {
  public readonly id = "logistics_system";
  private spatialGrid: SpatialGridSystem;
  
  // Buffer iterativo (como no CombatSystem)
  private hexArmies = new Int32Array(64);

  constructor(spatialGrid: SpatialGridSystem) {
    this.spatialGrid = spatialGrid;
  }

  public run(context: TickContext): void {
    const state = context.nextState;
    if (!state.ecs) return;

    const { regionSupplyCapacity, regionCurrentSupply, regionCaptureProgress, factionCasualties } = state.ecs;

    for (let i = 0; i < MAX_REGIONS; i++) {
      const cap = regionSupplyCapacity[i];
      if (cap <= 0) continue; // Pode ser oceano ou inválido

      // Regeneração de Suprimentos
      const regenRate = regionCaptureProgress[i] > 0 ? DISORDER_REGEN_RATE : BASE_REGEN_RATE;
      regionCurrentSupply[i] = Math.min(cap, regionCurrentSupply[i] + regenRate);

      const head = this.spatialGrid.hexHead[i];
      if (head === -1) continue; // Sem exércitos, nada consome

      // Exércitos presentes: consumo em O(K)
      let armyCount = 0;
      let curr = head;
      let totalDemand = 0;
      let totalManpower = 0;

      while (curr !== -1 && armyCount < 64) {
        const army = ArmyPool.instances[curr];
        if (army.isActive && army.manpower > 0) {
          this.hexArmies[armyCount++] = curr;
          totalDemand += army.manpower * CONSUMPTION_RATE;
          totalManpower += army.manpower;
        }
        curr = this.spatialGrid.armyNext[curr];
      }

      if (armyCount === 0 || totalDemand <= 0) continue;

      let supply = regionCurrentSupply[i];

      if (supply >= totalDemand) {
        // Bem abastecidos
        regionCurrentSupply[i] -= totalDemand;
      } else {
        // DÉFICIT DE SUPRIMENTOS (Atrição)
        regionCurrentSupply[i] = 0;
        const deficit = totalDemand - supply;
        const totalDamage = deficit * ATTRITION_MULTIPLIER;

        for (let a = 0; a < armyCount; a++) {
          const army = ArmyPool.instances[this.hexArmies[a]];
          if (!army.isActive || army.manpower <= 0) continue;

          // Distribui dano proporcionalmente
          const weight = totalManpower > 0 ? (army.manpower / totalManpower) : 1;
          const damage = totalDamage * weight;
          const dead = Math.floor(damage);

          army.manpower -= dead;

          if (dead > 0) {
            // Contabilizamos baixas logísticas no agregador genérico (ou um array específico de baixas se tivéssemos)
            const myFaction = army.factionIndex;
            factionCasualties[myFaction] += dead;
          }

          // Reciclagem de Mortos de Fome O(1) ANTES do combate
          if (army.manpower <= 0) {
            army.isActive = false;
            this.spatialGrid.remove(army._poolIdx, i);
          }
        }
      }
    }
  }
}

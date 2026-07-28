import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { SpatialGridSystem, MAX_REGIONS } from "../spatial/spatial-grid-system";
import { ArmyPool } from "../../ecs/army-pool";

export const MAX_FACTIONS = 256;

export class CombatSystem implements SimulationSystem {
  public readonly id = "combat_system";
  private spatialGrid: SpatialGridSystem;
  
  // Single-use pre-allocated buffers O(1) resets
  private factionTotalManpower = new Float64Array(MAX_FACTIONS);
  private factionFirepower = new Float64Array(MAX_FACTIONS);
  private factionsPresent = new Int32Array(MAX_FACTIONS);
  private factionCount = 0;
  
  // Army iteration buffer
  private hexArmies = new Int32Array(64); // Max assumed stacking for calculation buffer

  constructor(spatialGrid: SpatialGridSystem) {
    this.spatialGrid = spatialGrid;
  }

  public run(context: TickContext): void {
    const state = context.nextState;
    if (!state.ecs) return;
    
    const factionCasualties = state.ecs.factionCasualties;

    // Iteração atômica O(1) virtual
    for (let i = 0; i < MAX_REGIONS; i++) {
      const head = this.spatialGrid.hexHead[i];
      if (head === -1) continue;
      
      const next = this.spatialGrid.armyNext[head];
      if (next === -1) continue; // Apenas 1 exército, sem combate

      // Temos 2+ exércitos. Vamos extraí-los para o buffer local.
      let armyCount = 0;
      let curr = head;
      while (curr !== -1 && armyCount < 64) {
        this.hexArmies[armyCount++] = curr;
        curr = this.spatialGrid.armyNext[curr];
      }

      // Validar se há facções diferentes e somar status
      this.factionCount = 0;
      
      // Limpeza parcial baseada no contador O(1) para evitar .fill()
      for (let a = 0; a < armyCount; a++) {
        const army = ArmyPool.instances[this.hexArmies[a]];
        if (!army.isActive) continue;

        const faction = army.factionIndex;
        if (faction < 0 || faction >= MAX_FACTIONS) continue;

        let known = false;
        for (let f = 0; f < this.factionCount; f++) {
          if (this.factionsPresent[f] === faction) {
            known = true;
            break;
          }
        }

        if (!known) {
          this.factionsPresent[this.factionCount++] = faction;
          this.factionTotalManpower[faction] = 0;
          this.factionFirepower[faction] = 0;
        }

        this.factionTotalManpower[faction] += army.manpower;
        this.factionFirepower[faction] += (army.manpower * army.quality * army.morale * 0.01);
      }

      if (this.factionCount < 2) {
        continue; // Apenas amigos empilhados, sem combate
      }

      // HÁ COMBATE (Pinning Espacial)
      for (let a = 0; a < armyCount; a++) {
        const army = ArmyPool.instances[this.hexArmies[a]];
        if (army.isActive) {
          army.pathLength = 0;
          army.targetIndex = -1;
        }
      }

      // Distribuição do Dano (Matemática Quadrática de Lanchester Cruzada)
      // O dano recebido por uma facção é a soma do Firepower de todas as OUTRAS facções
      for (let a = 0; a < armyCount; a++) {
        const army = ArmyPool.instances[this.hexArmies[a]];
        if (!army.isActive || army.manpower <= 0) continue;

        const myFaction = army.factionIndex;
        const myFactionManpower = this.factionTotalManpower[myFaction];
        
        let incomingFirepower = 0;
        for (let f = 0; f < this.factionCount; f++) {
          const fac = this.factionsPresent[f];
          if (fac !== myFaction) {
            incomingFirepower += this.factionFirepower[fac];
          }
        }

        // Dano absorvido por este exército proporcional ao seu tamanho na pilha da facção
        const armyWeight = myFactionManpower > 0 ? (army.manpower / myFactionManpower) : 1;
        const damage = incomingFirepower * armyWeight;
        
        // Aplica o dano físico arredondado
        const dead = Math.floor(damage);
        army.manpower -= dead;
        
        if (dead > 0) {
           factionCasualties[myFaction] += dead;
        }

        // Reciclagem O(1) da unidade morta
        if (army.manpower <= 0) {
          army.isActive = false;
          this.spatialGrid.remove(army._poolIdx, i);
        }
      }
    }
  }
}

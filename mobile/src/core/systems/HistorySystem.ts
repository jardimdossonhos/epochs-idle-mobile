import type { EcsState } from "../models/game-state";
import { ArmyPool } from "../ecs/army-pool";

export class HistorySystem {
  private chronicleBuffer: string[] = [];
  
  // Memoria do último estado para delta
  private lastTerritoryCount = 0;
  private lastArmyCount = 0;

  public update(ecs: EcsState, currentTick: number, playerFactionId: number = 1) {
    let territoryCount = 0;
    
    for (let i = 0; i < ecs.regionOwner.length; i++) {
      if (ecs.regionOwner[i] === playerFactionId) {
        territoryCount++;
      }
    }

    let armyCount = 0;
    for (let i = 0; i < ArmyPool.instances.length; i++) {
      const army = ArmyPool.instances[i];
      if (army.isActive && army.factionIndex === playerFactionId) {
        armyCount++;
      }
    }

    // Deltas
    if (this.lastTerritoryCount > 0 && territoryCount > this.lastTerritoryCount) {
      this.chronicleBuffer.push(`[Tique ${currentTick}] Nossas forças expandiram o domínio imperial para ${territoryCount} regiões.`);
    } else if (this.lastTerritoryCount > 0 && territoryCount < this.lastTerritoryCount) {
      this.chronicleBuffer.push(`[Tique ${currentTick}] Alarme: Perdemos território para o inimigo! Regiões restantes: ${territoryCount}.`);
    }

    if (this.lastArmyCount > 0 && armyCount < this.lastArmyCount) {
      this.chronicleBuffer.push(`[Tique ${currentTick}] Tragédia: Um exército imperial foi completamente aniquilado em combate.`);
    }

    // Economia Fome/Falência
    const pGold = ecs.factionResources[playerFactionId * 3];
    const pFood = ecs.factionResources[playerFactionId * 3 + 1];
    if (currentTick % 60 === 0) { // Check mensal
      if (pGold < 5) {
        this.chronicleBuffer.push(`[Tique ${currentTick}] Os cofres do império estão secando. Fisco em colapso.`);
      }
      if (pFood < 5) {
        this.chronicleBuffer.push(`[Tique ${currentTick}] Os celeiros estão vazios. O povo passa fome.`);
      }
    }

    this.lastTerritoryCount = territoryCount;
    this.lastArmyCount = armyCount;
  }

  public getSnapshotAndClear(ecs: EcsState, playerFactionId: number = 1) {
    if (this.chronicleBuffer.length === 0) return null;

    const payload = {
      chronicle: [...this.chronicleBuffer],
      snapshot: {
        treasury: [
          ecs.factionResources[playerFactionId * 3],
          ecs.factionResources[playerFactionId * 3 + 1],
          ecs.factionResources[playerFactionId * 3 + 2]
        ],
        militarySize: this.lastArmyCount,
        territoryCount: this.lastTerritoryCount
      }
    };

    this.chronicleBuffer = [];
    return payload;
  }
}

import type { EcsState } from "../models/game-state";
import { ArmyPool } from "../ecs/army-pool";

export class ConquestSystem {
  public update(ecs: EcsState): void {
    const armies = ArmyPool.instances;
    let conquestHappened = false;

    for (let i = 0; i < armies.length; i++) {
      const a = armies[i];
      if (!a.isActive || a.targetIndex !== -1) continue; // Só exércitos parados podem dominar

      const hexId = a.stationedIndex;
      if (ecs.regionOwner[hexId] === a.factionIndex) continue; // Já é dono

      // Checa se há algum exército inimigo no mesmo hexágono impedindo a ocupação
      let contested = false;
      for (let j = 0; j < armies.length; j++) {
        const b = armies[j];
        if (b.isActive && b.stationedIndex === hexId && b.factionIndex !== a.factionIndex) {
          contested = true;
          break;
        }
      }

      if (!contested) {
        ecs.regionOwner[hexId] = a.factionIndex;
        conquestHappened = true;
      }
    }

    if (conquestHappened) {
      ecs.conquestEpoch++;
    }
  }
}

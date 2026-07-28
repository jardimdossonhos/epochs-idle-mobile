import type { EcsState } from "../models/game-state";
import type { PathfindingGrid } from "../ecs/PathfindingGrid";
import { ArmyPool } from "../ecs/army-pool";

export class VisionSystem {
  private queueBuffer: Int32Array;
  private distanceBuffer: Int32Array;

  constructor(maxRegions: number) {
    this.queueBuffer = new Int32Array(maxRegions);
    this.distanceBuffer = new Int32Array(maxRegions);
  }

  public update(ecs: EcsState, grid: PathfindingGrid, playerFactionId: number = 1): boolean {
    const sources: { index: number; radius: number }[] = [];

    // Cidades/Fazendas do jogador
    for (let i = 0; i < ecs.hexStructures.length; i++) {
      if (ecs.regionOwner[i] === playerFactionId && ecs.hexStructures[i] > 0) {
        sources.push({ index: i, radius: 2 });
      }
    }

    // Exércitos do jogador
    for (let i = 0; i < ArmyPool.instances.length; i++) {
      const army = ArmyPool.instances[i];
      if (army.isActive && army.factionIndex === playerFactionId) {
        sources.push({ index: army.stationedIndex, radius: 1 });
      }
    }

    // A capital também deve ter visão nativa
    // Procuramos a capital (normalmente onde começou, mas garantimos pegando as províncias do dono se não houver exército nem estrutura)
    // Para simplificar, o loop acima já pega as cidades.
    
    // Irradiar visão
    // Observação: Para saber se mudou, precisamos verificar (ou apenas avisar o frontend toda vez que recomputar)
    grid.radiateVision(ecs.visibilityMask as Uint8Array, sources, this.queueBuffer, this.distanceBuffer);

    return true; // Simplificado: assumimos que mudou e o UI precisa atualizar a máscara
  }
}


import type { EcsState } from "../models/game-state";
import { ArmyPool } from "../ecs/army-pool";

export class CombatSystem {
  private centroidX: Float32Array | null = null;
  private centroidY: Float32Array | null = null;

  public setCentroids(cx: Float32Array, cy: Float32Array) {
    this.centroidX = cx;
    this.centroidY = cy;
  }

  public update(ecs: EcsState): void {
    const armies = ArmyPool.instances;
    const len = armies.length;
    
    // Arrays auxiliares internos para o buffer balístico simulâneo
    const damageBuffer = new Float32Array(len).fill(0);

    // Passo 1: Calcular intenção de dano (quem ataca quem)
    for (let i = 0; i < len; i++) {
      const a = armies[i];
      if (!a.isActive || a.targetIndex === -1 || a.pathLength > 0) continue;
      
      // O exército A chegou no targetIndex (ou quer se mover para lá)
      // Procurar exército inimigo no targetIndex
      for (let j = 0; j < len; j++) {
        if (i === j) continue;
        const b = armies[j];
        if (b.isActive && b.stationedIndex === a.targetIndex && b.factionIndex !== a.factionIndex) {
          // Batalha travada!
          const damage = a.manpower * 0.05; // Alpha = 0.05
          damageBuffer[j] += damage;

          // Registrar evento visual
          if (this.centroidX && this.centroidY) {
            const head = ecs.combatEventHead;
            ecs.combatEventX[head] = this.centroidX[b.stationedIndex];
            ecs.combatEventY[head] = this.centroidY[b.stationedIndex];
            ecs.combatEventTs[head] = Date.now();
            ecs.combatEventHead = (head + 1) % 1024;
          }
          break; // Ataca apenas o primeiro exército inimigo encontrado no hexágono
        }
      }
    }

    // Passo 2: Aplicar Dano Simultâneo e Bloqueio
    for (let i = 0; i < len; i++) {
      if (damageBuffer[i] > 0) {
        armies[i].manpower -= damageBuffer[i];
        if (armies[i].manpower <= 0) {
          armies[i].isActive = false; // Destruído
        }
      }
    }

    // Passo 3: Efetivar movimentação se o defensor morreu (ou se não havia defensor)
    for (let i = 0; i < len; i++) {
      const a = armies[i];
      if (!a.isActive || a.targetIndex === -1 || a.pathLength > 0) continue;

      let hasEnemy = false;
      for (let j = 0; j < len; j++) {
        const b = armies[j];
        if (b.isActive && b.stationedIndex === a.targetIndex && b.factionIndex !== a.factionIndex) {
          hasEnemy = true;
          break;
        }
      }

      if (!hasEnemy) {
        a.stationedIndex = a.targetIndex;
        a.targetIndex = -1;
      }
    }
  }
}


import type { EcsState } from "../models/game-state";
import { GameConfig } from "../config/game-config";
import { enqueueCommand } from "../simulation/command-queue";
import { CommandType } from "../types/commands";
import type { PathfindingGrid } from "../ecs/PathfindingGrid";
import { ArmyPool } from "../ecs/army-pool";

export class BotSystem {
  private queueBuffer: Int32Array;
  private distanceBuffer: Int32Array;
  private flowFieldCache: Int32Array;

  constructor(maxRegions: number) {
    this.queueBuffer = new Int32Array(maxRegions);
    this.distanceBuffer = new Int32Array(maxRegions);
    this.flowFieldCache = new Int32Array(maxRegions);
  }

  public update(
    tickCount: number, 
    ecs: EcsState, 
    grid: PathfindingGrid, 
    maxFactions: number
  ): void {
    if (tickCount % 120 !== 0) return; // Bots agem a cada 120 ticks (mais lentos que o jogador)

    const structures = ecs.hexStructures;
    const resources = ecs.factionResources;
    const regionOwner = ecs.regionOwner;

    // FASE TÁTICA: Gerar Flow Field (Fronteiras Inimigas para o Interior) e Mover Tropas
    // Simplificando: geramos um único Flow Field focado em "Qualquer Fronteira" para atacar.
    // Alvos = todos os hexágonos com dono diferente.
    const targets: number[] = [];
    for (let i = 0; i < regionOwner.length; i++) {
      if (regionOwner[i] === 1) { // O jogador é o alvo primordial
        targets.push(i);
      }
    }

    if (targets.length > 0) {
      grid.buildFlowField(targets, this.flowFieldCache, this.queueBuffer, this.distanceBuffer);

      for (let i = 0; i < ArmyPool.instances.length; i++) {
        const army = ArmyPool.instances[i];
        if (army.isActive && army.factionIndex > 1 && army.targetIndex === -1 && army.pathLength === 0) {
          const flowDir = this.flowFieldCache[army.stationedIndex];
          if (flowDir !== -1 && flowDir !== army.stationedIndex) {
            enqueueCommand(ecs, CommandType.MOVE_ARMY, army.factionIndex, i, flowDir);
          }
        }
      }
    }

    // FASE LOGÍSTICA: Construir e Recrutar
    for (let f = 2; f < maxFactions; f++) {
      const offset = f * 3;
      const gold = resources[offset + 0];
      const food = resources[offset + 1];

      // Busca províncias pertencentes a este Bot
      const ownedHexes: number[] = [];
      for (let i = 0; i < regionOwner.length; i++) {
        if (regionOwner[i] === f) {
          ownedHexes.push(i);
        }
      }

      if (ownedHexes.length === 0) continue;

      if (gold >= GameConfig.economy.COST_FARM_GOLD) {
        // Tenta construir fazenda no primeiro hexágono vazio de construções
        for (let i = 0; i < ownedHexes.length; i++) {
          const hex = ownedHexes[i];
          if (structures[hex] === 0) {
            enqueueCommand(ecs, CommandType.BUILD_STRUCTURE, f, hex, 0);
            break;
          }
        }
      }

      if (food >= GameConfig.economy.COST_ARMY_FOOD) {
        // Recruta tropa em uma província
        const spawnHex = ownedHexes[Math.floor(Math.random() * ownedHexes.length)];
        enqueueCommand(ecs, CommandType.RECRUIT_ARMY, f, spawnHex, 0);
      }
    }
  }
}

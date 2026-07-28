import type { EcsState } from "../../models/game-state";
import { CommandType } from "../../types/commands";
import { ArmyPool } from "../../ecs/army-pool";
import { SpatialGridSystem } from "../spatial/spatial-grid-system";
import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { GameConfig } from "../../config/game-config";

export class ActionExecutionSystem implements SimulationSystem {
  public readonly id = "action_execution_system";
  private spatialGrid: SpatialGridSystem;

  constructor(spatialGrid: SpatialGridSystem) {
    this.spatialGrid = spatialGrid;
  }

  public run(context: TickContext): void {
    const ecs = context.nextState.ecs;
    if (!ecs) return;

    this.execute(ecs);
  }

  public execute(ecs: EcsState): void {
    while (ecs.cmdHead !== ecs.cmdTail) {
      const type = ecs.cmdType[ecs.cmdHead];
      const faction = ecs.cmdFaction[ecs.cmdHead];
      const arg0 = ecs.cmdArg0[ecs.cmdHead];
      const arg1 = ecs.cmdArg1[ecs.cmdHead];

      ecs.cmdHead = (ecs.cmdHead + 1) % ecs.cmdType.length;

      switch (type) {
        case CommandType.MOVE_ARMY: {
          const armyIndex = arg0;
          const targetHexId = arg1;

          if (armyIndex < 0 || armyIndex >= ArmyPool.instances.length) break;

          const army = ArmyPool.instances[armyIndex];
          if (!army.isActive) break;
          if (army.factionIndex !== faction) break;

          if (army.stationedIndex === targetHexId) {
            army.targetIndex = -1;
            break;
          }

          army.targetIndex = targetHexId;
          army.pathLength = 0;
          break;
        }

        case CommandType.BUILD_STRUCTURE: {
          const targetHexId = arg0;
          const offset = faction * 3;
          
          if (ecs.factionResources[offset + 0] >= GameConfig.economy.COST_FARM_GOLD) {
            ecs.factionResources[offset + 0] -= GameConfig.economy.COST_FARM_GOLD;
            ecs.hexStructures[targetHexId] = 1; // 1 = Fazenda
          }
          break;
        }

        case CommandType.RECRUIT_ARMY: {
          const targetHexId = arg0;
          const offset = faction * 3;

          if (ecs.factionResources[offset + 1] >= GameConfig.economy.COST_ARMY_FOOD) {
            ecs.factionResources[offset + 1] -= GameConfig.economy.COST_ARMY_FOOD;
            
            for (let i = 0; i < ArmyPool.instances.length; i++) {
              if (!ArmyPool.instances[i].isActive) {
                ArmyPool.instances[i].isActive = true;
                ArmyPool.instances[i].factionIndex = faction;
                ArmyPool.instances[i].stationedIndex = targetHexId;
                ArmyPool.instances[i].targetIndex = -1;
                ArmyPool.instances[i].manpower = 100;
                break;
              }
            }
          }
          break;
        }
      }
    }
  }
}

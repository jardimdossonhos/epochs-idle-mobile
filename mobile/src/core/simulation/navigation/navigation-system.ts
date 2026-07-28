import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { AStarAlgorithm, MAX_REGIONS } from "./astar";
import { PathfindingQueue } from "./pathfinding-queue";
import { ArmyPool } from "../../ecs/army-pool";
import { SpatialGridSystem } from "../spatial/spatial-grid-system";

export class NavigationSystem implements SimulationSystem {
  public readonly id = "navigation";
  
  private astar: AStarAlgorithm;
  public queue: PathfindingQueue;
  private readonly MAX_PATHFINDING_QUERIES_PER_TICK = 10;
  private isInitialized = false;
  private spatialGrid: SpatialGridSystem;

  constructor(spatialGrid: SpatialGridSystem) {
    this.astar = new AStarAlgorithm();
    this.queue = new PathfindingQueue(1000, MAX_REGIONS);
    this.spatialGrid = spatialGrid;
  }

  public run(context: TickContext): void {
    if (!this.isInitialized) {
      this.astar.initialize(context.staticData);
      this.isInitialized = true;
    }

    const state = context.nextState;
    if (!state.ecs) return;
    const ecs = state.ecs;

    for (let i = 0; i < ArmyPool.instances.length; i++) {
      const army = ArmyPool.instances[i];
      
      if (!army.isActive) continue;
      if (army.targetIndex === -1 || army.targetIndex === army.stationedIndex) continue;

      if (army.pathLength === 0) {
        this.queue.enqueue({
          sourceIndex: army.stationedIndex,
          destinationIndex: army.targetIndex,
          armyId: army.id
        });
      }
    }

    const requests = this.queue.dequeue(this.MAX_PATHFINDING_QUERIES_PER_TICK);
    if (requests.length === 0) return;

    for (const request of requests) {
      let path = this.queue.getCachedPath(request.sourceIndex, request.destinationIndex);
      
      if (!path) {
        let factionIndex = -1;
        for (let i = 0; i < ArmyPool.instances.length; i++) {
          if (ArmyPool.instances[i].id === request.armyId) {
            factionIndex = ArmyPool.instances[i].factionIndex;
            break;
          }
        }
        
        path = this.astar.findPathRaw(request.sourceIndex, request.destinationIndex, this.spatialGrid, factionIndex) || undefined;
        if (path) {
          this.queue.cachePath(request.sourceIndex, request.destinationIndex, path);
        }
      }

      if (path) {
        this.injectPathIntoArmy(request.armyId, path);
      }
    }
  }

  private injectPathIntoArmy(armyId: string, path: Int32Array) {
    for (let i = 0; i < ArmyPool.instances.length; i++) {
      const army = ArmyPool.instances[i];
      if (army.isActive && army.id === armyId) {
        const length = Math.min(path.length, 128);
        army.pathLength = length;
        for (let j = 0; j < length; j++) {
          army.currentPath[j] = path[j];
        }
        army.targetIndex = length > 1 ? path[length - 1] : -1;
        break;
      }
    }
  }
}

export function createNavigationSystem(spatialGrid: SpatialGridSystem): NavigationSystem {
  return new NavigationSystem(spatialGrid);
}

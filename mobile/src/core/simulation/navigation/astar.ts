import type { RegionDefinition } from "../../models/world";
import type { StaticWorldData } from "../../models/static-world-data";
import type { RegionId } from "../../models/types";
import { ArmyPool } from "../../ecs/army-pool";
import type { SpatialGridSystem } from "../spatial/spatial-grid-system";

export const MAX_REGIONS = 2000;
const HEX_RADIUS = 20;

export class AStarAlgorithm {
  private idToIndex: Map<RegionId, number> = new Map();
  private indexToId: RegionId[] = new Array(MAX_REGIONS);
  
  private qCoords: Int32Array = new Int32Array(MAX_REGIONS);
  private rCoords: Int32Array = new Int32Array(MAX_REGIONS);
  
  private neighborsGraph: Int32Array = new Int32Array(MAX_REGIONS * 6).fill(-1);
  private weightsGraph: Float32Array = new Float32Array(MAX_REGIONS * 6).fill(0);

  // Epoch logic para reset O(1)
  private visitedEpoch: Int32Array = new Int32Array(MAX_REGIONS);
  private currentEpoch: number = 0;
  
  private gScore: Float32Array = new Float32Array(MAX_REGIONS);
  private fScore: Float32Array = new Float32Array(MAX_REGIONS);
  private cameFrom: Int32Array = new Int32Array(MAX_REGIONS);
  private inOpenSet: Int8Array = new Int8Array(MAX_REGIONS);

  // Flat MinHeap (Fila Logarítmica)
  private heapNodes: Int32Array = new Int32Array(MAX_REGIONS);
  private heapScores: Float32Array = new Float32Array(MAX_REGIONS);
  private heapSize: number = 0;
  
  public getIndex(id: RegionId): number {
    return this.idToIndex.get(id) ?? -1;
  }

  public getId(index: number): RegionId {
    return this.indexToId[index];
  }

  public initialize(staticData: StaticWorldData) {
    this.idToIndex.clear();
    let currentIndex = 0;

    const definitions = staticData.definitions;
    for (const regionId of Object.keys(definitions).sort()) {
      if (currentIndex >= MAX_REGIONS) break;
      this.idToIndex.set(regionId, currentIndex);
      this.indexToId[currentIndex] = regionId;
      currentIndex++;
    }

    const SQRT3_3 = Math.sqrt(3) / 3;
    for (const regionId of Object.keys(definitions)) {
      const idx = this.idToIndex.get(regionId);
      if (idx === undefined) continue;

      const { center } = definitions[regionId];
      const q = Math.round((SQRT3_3 * center.x - (1/3) * center.y) / HEX_RADIUS);
      const r = Math.round(((2/3) * center.y) / HEX_RADIUS);
      this.qCoords[idx] = q;
      this.rCoords[idx] = r;
    }

    const neighborsCount = new Int32Array(MAX_REGIONS).fill(0);

    for (const route of staticData.routes) {
      const fromIdx = this.idToIndex.get(route.from);
      const toIdx = this.idToIndex.get(route.to);
      if (fromIdx === undefined || toIdx === undefined) continue;

      const cFrom = neighborsCount[fromIdx];
      if (cFrom < 6) {
        this.neighborsGraph[fromIdx * 6 + cFrom] = toIdx;
        this.weightsGraph[fromIdx * 6 + cFrom] = route.controlWeight;
        neighborsCount[fromIdx]++;
      }

      const cTo = neighborsCount[toIdx];
      if (cTo < 6) {
        this.neighborsGraph[toIdx * 6 + cTo] = fromIdx;
        this.weightsGraph[toIdx * 6 + cTo] = route.controlWeight;
        neighborsCount[toIdx]++;
      }
    }
  }

  private pushHeap(node: number, score: number) {
    let i = this.heapSize++;
    this.heapNodes[i] = node;
    this.heapScores[i] = score;

    // Bubble Up
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heapScores[i] >= this.heapScores[parent]) break;

      const tmpNode = this.heapNodes[i];
      this.heapNodes[i] = this.heapNodes[parent];
      this.heapNodes[parent] = tmpNode;

      const tmpScore = this.heapScores[i];
      this.heapScores[i] = this.heapScores[parent];
      this.heapScores[parent] = tmpScore;

      i = parent;
    }
  }

  private popHeap(): number {
    const minNode = this.heapNodes[0];
    this.heapSize--;
    
    if (this.heapSize > 0) {
      this.heapNodes[0] = this.heapNodes[this.heapSize];
      this.heapScores[0] = this.heapScores[this.heapSize];

      // Sink Down
      let i = 0;
      while (true) {
        let smallest = i;
        const left = (i << 1) + 1;
        const right = (i << 1) + 2;

        if (left < this.heapSize && this.heapScores[left] < this.heapScores[smallest]) {
          smallest = left;
        }
        if (right < this.heapSize && this.heapScores[right] < this.heapScores[smallest]) {
          smallest = right;
        }

        if (smallest === i) break;

        const tmpNode = this.heapNodes[i];
        this.heapNodes[i] = this.heapNodes[smallest];
        this.heapNodes[smallest] = tmpNode;

        const tmpScore = this.heapScores[i];
        this.heapScores[i] = this.heapScores[smallest];
        this.heapScores[smallest] = tmpScore;

        i = smallest;
      }
    }
    return minNode;
  }

  private heuristic(a: number, b: number): number {
    const q1 = this.qCoords[a];
    const r1 = this.rCoords[a];
    const q2 = this.qCoords[b];
    const r2 = this.rCoords[b];
    
    return (Math.abs(q1 - q2) + Math.abs((q1 + r1) - (q2 + r2)) + Math.abs(r1 - r2)) / 2;
  }

  private getGScore(node: number): number {
    return this.visitedEpoch[node] === this.currentEpoch ? this.gScore[node] : Infinity;
  }

  private getInOpenSet(node: number): number {
    return this.visitedEpoch[node] === this.currentEpoch ? this.inOpenSet[node] : 0;
  }

  public findPathRaw(startIndex: number, goalIndex: number, spatialGrid?: SpatialGridSystem, factionIndex?: number): Int32Array | null {
    if (startIndex === goalIndex) {
      const p = new Int32Array(1);
      p[0] = startIndex;
      return p;
    }
    if (startIndex === -1 || goalIndex === -1) return null;

    // Epoch reset O(1)
    this.currentEpoch++;
    this.heapSize = 0;

    this.visitedEpoch[startIndex] = this.currentEpoch;
    this.gScore[startIndex] = 0;
    this.cameFrom[startIndex] = -1;
    this.inOpenSet[startIndex] = 1;
    
    const initialH = this.heuristic(startIndex, goalIndex);
    this.fScore[startIndex] = initialH;
    
    this.pushHeap(startIndex, initialH);

    let emergencyCounter = 0;

    while (this.heapSize > 0) {
      emergencyCounter++;
      if (emergencyCounter > 5000) break;

      const currentIdx = this.popHeap();

      if (this.visitedEpoch[currentIdx] === this.currentEpoch) {
        this.inOpenSet[currentIdx] = 0;
      }

      if (currentIdx === goalIndex) {
        return this.reconstructPath(currentIdx);
      }

      const offset = currentIdx * 6;
      for (let i = 0; i < 6; i++) {
        const neighbor = this.neighborsGraph[offset + i];
        if (neighbor === -1) break;

        let weight = this.weightsGraph[offset + i];

        // Regras ZoC: Bloqueio Tático
        if (spatialGrid && factionIndex !== undefined) {
          const occupierIdx = spatialGrid.hexHead[neighbor];
          if (occupierIdx !== -1) {
            const occupierFaction = ArmyPool.instances[occupierIdx].factionIndex;
            if (occupierFaction !== factionIndex) {
              if (neighbor !== goalIndex) {
                weight = Infinity;
              }
            }
          }
        }

        const tentativeGScore = this.getGScore(currentIdx) + weight;

        if (tentativeGScore < this.getGScore(neighbor)) {
          this.visitedEpoch[neighbor] = this.currentEpoch;
          this.cameFrom[neighbor] = currentIdx;
          this.gScore[neighbor] = tentativeGScore;
          
          const f = tentativeGScore + this.heuristic(neighbor, goalIndex);
          this.fScore[neighbor] = f;
          
          if (this.getInOpenSet(neighbor) === 0) {
            this.inOpenSet[neighbor] = 1;
            this.pushHeap(neighbor, f);
          }
        }
      }
    }

    return null;
  }

  private reconstructPath(current: number): Int32Array {
    // Descobre o tamanho
    let count = 0;
    let node = current;
    while (this.visitedEpoch[node] === this.currentEpoch && node !== -1) {
      count++;
      node = this.cameFrom[node];
    }
    
    // Alocação final apenas da rota encontrada (Truncando no NavigationSystem se exceder 128)
    const path = new Int32Array(count);
    let i = count - 1;
    node = current;
    while (this.visitedEpoch[node] === this.currentEpoch && node !== -1) {
      path[i] = node;
      node = this.cameFrom[node];
      i--;
    }
    return path;
  }
}


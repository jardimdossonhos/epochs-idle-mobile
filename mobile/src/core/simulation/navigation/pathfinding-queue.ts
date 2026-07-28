export interface PathRequest {
  armyId: string;
  sourceIndex: number;
  destinationIndex: number;
}

export class PathfindingQueue {
  private queue: PathRequest[] = [];
  
  private cache: Map<number, Int32Array> = new Map();
  private maxCacheSize: number;
  private maxRegions: number;

  constructor(maxCacheSize: number, maxRegions: number) {
    this.maxCacheSize = maxCacheSize;
    this.maxRegions = maxRegions;
  }

  public enqueue(request: PathRequest) {
    this.queue.push(request);
  }

  public dequeue(count: number): PathRequest[] {
    return this.queue.splice(0, count);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  private getKey(source: number, destination: number): number {
    return (source * this.maxRegions) + destination;
  }

  public getCachedPath(source: number, destination: number): Int32Array | undefined {
    const key = this.getKey(source, destination);
    if (this.cache.has(key)) {
      const path = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, path);
      return path;
    }
    return undefined;
  }

  public cachePath(source: number, destination: number, path: Int32Array) {
    const key = this.getKey(source, destination);
    
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, path);
  }

  public clearQueue() {
    this.queue = [];
  }
}

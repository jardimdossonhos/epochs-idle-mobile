export interface MetricSamples {
  count: number;
  total: number;
  max: number;
  average: number;
}

export type MetricKey =
  | "rawDeltaMs"
  | "effectiveDeltaMs"
  | "tickDurationMs"
  | "simulationDurationMs"
  | "cloneDurationMs"
  | "serializationDurationMs"
  | "persistenceDurationMs"
  | "frameSimulationDurationMs"
  | "accumulatorMs"
  | "offlineCatchupDurationMs"
  | "ticksProcessed"
  | "budgetExceededCount";

export class RuntimeMetrics {
  private samples: Record<string, number[]> = {};
  private readonly maxSamples = 60; // Keep roughly 1 second of samples at 60fps

  public record(key: MetricKey, value: number): void {
    if (!this.samples[key]) {
      this.samples[key] = [];
    }
    
    this.samples[key].push(value);
    
    if (this.samples[key].length > this.maxSamples) {
      this.samples[key].shift();
    }
  }

  public increment(key: MetricKey, amount = 1): void {
    if (!this.samples[key]) {
      this.samples[key] = [0];
    }
    this.samples[key][0] += amount;
  }

  public getSnapshot(): Record<MetricKey, MetricSamples> {
    const snapshot: any = {};
    
    for (const key of Object.keys(this.samples) as MetricKey[]) {
      const vals = this.samples[key];
      if (vals.length === 0) continue;
      
      const count = vals.length;
      const total = vals.reduce((a, b) => a + b, 0);
      const max = Math.max(...vals);
      const average = total / count;
      
      snapshot[key] = { count, total, max, average };
    }
    
    return snapshot;
  }

  public clear(): void {
    this.samples = {};
  }
}

export const globalMetrics = new RuntimeMetrics();

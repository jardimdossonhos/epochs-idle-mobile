import { GameState } from "../core/models/game-state";
import { TickPipeline } from "../core/simulation/tick-pipeline";
import { globalMetrics } from "../metrics/runtime-metrics";
import { cloneGameStateForSimulation } from "../core/utils/clone-game-state";
import { AutosaveManager } from "../persistence/autosave-manager";
import { EventBus } from "../core/contracts/services";

export interface SimulationEngineConfig {
  timeBudgetMs: number;
  maxTicksPerFrame: number;
  maxOfflineTicks: number;
  onTickCompleted?: (previousTick: number, currentTick: number, events: any[], simNow: number, state: GameState) => void;
}

export class SimulationEngine {
  private pipeline: TickPipeline;
  private autosaveManager: AutosaveManager;
  private eventBus: EventBus;
  private config: SimulationEngineConfig;
  
  private accumulatedMs = 0;
  private simulationLock = false;

  constructor(
    pipeline: TickPipeline,
    autosaveManager: AutosaveManager,
    eventBus: EventBus,
    config: Partial<SimulationEngineConfig> = {}
  ) {
    this.pipeline = pipeline;
    this.autosaveManager = autosaveManager;
    this.eventBus = eventBus;
    this.config = {
      timeBudgetMs: config.timeBudgetMs ?? 8,
      maxTicksPerFrame: config.maxTicksPerFrame ?? 3,
      maxOfflineTicks: config.maxOfflineTicks ?? 200,
    };
  }

  public advanceRealtime(state: GameState, deltaMs: number): GameState {
    if (this.simulationLock || state.meta.paused) {
      return state;
    }

    // Safety Clamp: Never accept more than 1 second of delta in realtime.
    // If the game was paused for 1 hour, it shouldn't hit realtime, but offline progression.
    const safeDeltaMs = Math.min(deltaMs, 1000);
    const speedMultiplier = Math.max(0.1, Math.min(100, state.meta.speedMultiplier));
    const effectiveDelta = safeDeltaMs * speedMultiplier;
    
    globalMetrics.record("rawDeltaMs", deltaMs);
    globalMetrics.record("effectiveDeltaMs", effectiveDelta);

    this.accumulatedMs += effectiveDelta;
    globalMetrics.record("accumulatorMs", this.accumulatedMs);

    const tickDurationMs = Math.max(1, state.meta.tickDurationMs);
    let ticksProcessedThisCycle = 0;
    let progressed = false;
    let currentState = state;
    
    const frameStartMs = performance.now();

    try {
      this.simulationLock = true;

      while (this.accumulatedMs >= tickDurationMs && ticksProcessedThisCycle < this.config.maxTicksPerFrame) {
        // Time Budget Check
        const elapsedSinceFrameStart = performance.now() - frameStartMs;
        if (elapsedSinceFrameStart >= this.config.timeBudgetMs) {
          globalMetrics.increment("budgetExceededCount");
          break; 
        }

        const simNow = currentState.meta.lastUpdatedAt + tickDurationMs;
        const tickStartMs = performance.now();
        
        // --- 1. RUN SIMULATION ---
        const result = this.pipeline.runMutating(currentState, tickDurationMs, simNow);
        
        const tickElapsedMs = performance.now() - tickStartMs;
        globalMetrics.record("tickDurationMs", tickElapsedMs);
        
        currentState = result.state;
        
        // --- 2. EMIT EVENTS ---
        for (const event of result.events) {
          this.eventBus.publish(event);
        }

        if (this.config.onTickCompleted) {
          this.config.onTickCompleted(currentState.meta.tick - 1, currentState.meta.tick, result.events, simNow, currentState);
        }

        progressed = true;
        ticksProcessedThisCycle += 1;
        this.accumulatedMs -= tickDurationMs;
      }

      if (progressed) {
        // Only clone if the state actually progressed.
        // We use the dirty tracking + shallow copy approach inside cloneGameStateForSimulation.
        const cloneStartMs = performance.now();
        
        const ecsBackup = currentState.ecs;
        currentState = cloneGameStateForSimulation(currentState);
        if (ecsBackup) {
          currentState.ecs = ecsBackup;
        }

        globalMetrics.record("cloneDurationMs", performance.now() - cloneStartMs);

        // Notify persistence manager that the state is dirty
        this.autosaveManager.markDirty(currentState);
      }
      
      globalMetrics.record("frameSimulationDurationMs", performance.now() - frameStartMs);
      globalMetrics.increment("ticksProcessed", ticksProcessedThisCycle);

      return currentState;

    } finally {
      this.simulationLock = false;
    }
  }

  public async advanceOffline(state: GameState, elapsedWallClockMs: number): Promise<GameState> {
    if (this.simulationLock || elapsedWallClockMs <= 0 || !state.meta.offlineProgression) {
      return state;
    }

    try {
      this.simulationLock = true;
      const offlineStartMs = performance.now();
      
      // 1. Determine target ticks
      const tickDurationMs = Math.max(1, state.meta.tickDurationMs);
      const targetTicks = Math.floor(elapsedWallClockMs / tickDurationMs);
      
      if (targetTicks <= 0) return state;

      // 2. Perform Aggregate Math (O(1) progression where possible)
      // For now, we simulate resources mathematically, and use batched fallback for the rest
      let currentState = this.applyAggregatedProgression(state, targetTicks, tickDurationMs);
      
      // 3. Batched Fallback with limits
      const totalTicksToSimulate = Math.min(targetTicks, this.config.maxOfflineTicks);
      
      let processedTicks = 0;
      const MAX_OFFLINE_BUDGET_MS = 8; // Tighter budget to prevent dropped frames on low-end devices
      
      while (processedTicks < totalTicksToSimulate) {
        const batchStartMs = performance.now();
        let ticksThisBatch = 0;
        
        while (processedTicks + ticksThisBatch < totalTicksToSimulate) {
          const remaining = totalTicksToSimulate - (processedTicks + ticksThisBatch);
          const coarseStep = remaining > 1000 ? 50 : (remaining > 100 ? 10 : 1);
          const chunk = Math.min(remaining, coarseStep);
          
          const batchResult = this.pipeline.runBatch(
            currentState, 
            chunk, 
            tickDurationMs, 
            currentState.meta.lastUpdatedAt + ((processedTicks + ticksThisBatch) * tickDurationMs),
            { collectEvents: false, coarseStepTicks: chunk }
          );
          currentState = batchResult.state;
          ticksThisBatch += chunk;
          
          if (performance.now() - batchStartMs >= MAX_OFFLINE_BUDGET_MS) {
            break;
          }
        }
        
        processedTicks += ticksThisBatch;
        
        // Yield to the event loop if there are more ticks to process
        if (processedTicks < totalTicksToSimulate) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Restore ECS reference if needed
      const ecsBackup = state.ecs;
      currentState = cloneGameStateForSimulation(currentState);
      if (ecsBackup) currentState.ecs = ecsBackup;

      this.autosaveManager.markDirty(currentState);
      
      globalMetrics.record("offlineCatchupDurationMs", performance.now() - offlineStartMs);
      
      return currentState;

    } finally {
      this.simulationLock = false;
    }
  }

  private applyAggregatedProgression(state: GameState, totalTicks: number, tickDurationMs: number): GameState {
    // TODO: Implement mathematical algebraic resource production:
    // e.g. state.economy.gold += goldPerTick * totalTicks
    // This avoids running `TickPipeline` 10,000 times.
    return state;
  }

  public resetAccumulator(): void {
    this.accumulatedMs = 0;
  }
}

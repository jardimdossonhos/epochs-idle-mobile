import type { DomainEvent } from "../models/events";
import type { GameState } from "../models/game-state";
import type { StaticWorldData } from "../models/static-world-data";
import { cloneGameStateForSimulation } from "../utils/clone-game-state";

export interface TickContext {
  previousState: GameState;
  nextState: GameState;
  staticData: StaticWorldData;
  deltaMs: number;
  tickScale: number;
  now: number;
  events: DomainEvent[];
}

export interface SimulationSystem {
  id: string;
  run(context: TickContext): void;
}

export interface TickResult {
  state: GameState;
  events: DomainEvent[];
}

export interface TickBatchOptions {
  collectEvents?: boolean;
  maxCollectedEvents?: number;
  coarseStepTicks?: number;
}

export class TickPipeline {
  constructor(
    private readonly systems: SimulationSystem[],
    private readonly staticData: StaticWorldData
  ) {}

  run(previousState: GameState, deltaMs: number, now: number): TickResult {
    const nextState = cloneGameStateForSimulation(previousState);
    
    // Bypass de Corrupção: Restaura o ponteiro real do Float64Array destruído pelo clone
    nextState.ecs = previousState.ecs;

    const events = this.runInPlace(nextState, deltaMs, now, 1);

    return {
      state: nextState,
      events
    };
  }

  runBatch(previousState: GameState, tickCount: number, deltaMs: number, startNow: number, options: TickBatchOptions = {}): TickResult {
    const ticks = Math.max(0, Math.trunc(tickCount));
    if (ticks === 0) {
      return {
        state: previousState,
        events: []
      };
    }

    const collectEvents = options.collectEvents ?? false;
    const maxCollectedEvents = Math.max(1, options.maxCollectedEvents ?? 120);
    const coarseStepTicks = Math.max(1, Math.trunc(options.coarseStepTicks ?? 1));
    const nextState = cloneGameStateForSimulation(previousState);
    
    // Bypass de Corrupção: Restaura o ponteiro real do Float64Array destruído pelo clone
    nextState.ecs = previousState.ecs;
    
    const collectedEvents: DomainEvent[] = [];
    let processedTicks = 0;

    while (processedTicks < ticks) {
      const remainingTicks = ticks - processedTicks;
      const tickScale = collectEvents ? 1 : Math.min(coarseStepTicks, remainingTicks);
      const now = startNow + (processedTicks + tickScale) * deltaMs;
      const events = this.runInPlace(nextState, deltaMs * tickScale, now, tickScale);
      processedTicks += tickScale;

      if (!collectEvents || events.length === 0) {
        continue;
      }

      collectedEvents.push(...events);
      if (collectedEvents.length > maxCollectedEvents) {
        collectedEvents.splice(0, collectedEvents.length - maxCollectedEvents);
      }
    }

    return {
      state: nextState,
      events: collectedEvents
    };
  }

  private runInPlace(nextState: GameState, deltaMs: number, now: number, tickScale: number): DomainEvent[] {
    const context: TickContext = {
      previousState: nextState,
      nextState,
      staticData: this.staticData,
      deltaMs,
      tickScale,
      now,
      events: []
    };

    context.nextState.meta.lastUpdatedAt = now;

    for (const system of this.systems) {
      system.run(context);
    }

    context.nextState.meta.tick += tickScale;
    context.nextState.meta.lastUpdatedAt = now;

    return context.events;
  }
}

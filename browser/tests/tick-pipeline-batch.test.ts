import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import type { SimulationSystem } from "../src/core/simulation/tick-pipeline";
import { TickPipeline } from "../src/core/simulation/tick-pipeline";

describe("tick pipeline batch mode", () => {
  it("keeps tick/time progression consistent with coarse offline steps", () => {
    const staticData = createStaticWorldData();
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const startedTick = initial.meta.tick;
    const startedAt = initial.meta.lastUpdatedAt;
    const deltaMs = initial.meta.tickDurationMs;
    const ticksToSimulate = 120;

    let runCount = 0;
    const probeSystem: SimulationSystem = {
      id: "probe",
      run(context) {
        runCount += 1;
        context.nextState.victory.crisisPressure += context.tickScale;
      }
    };

    const pipeline = new TickPipeline([probeSystem], staticData);
    const result = pipeline.runBatch(initial, ticksToSimulate, deltaMs, startedAt, {
      collectEvents: false,
      coarseStepTicks: 6
    });

    expect(result.state.meta.tick).toBe(startedTick + ticksToSimulate);
    expect(result.state.meta.lastUpdatedAt).toBe(startedAt + ticksToSimulate * deltaMs);
    expect(result.state.victory.crisisPressure).toBe(initial.victory.crisisPressure + ticksToSimulate);
    expect(runCount).toBe(20);
  });

  it("ignores coarse stepping when collecting events", () => {
    const staticData = createStaticWorldData();
    const initial = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const deltaMs = initial.meta.tickDurationMs;
    const ticksToSimulate = 20;

    let runCount = 0;
    const probeSystem: SimulationSystem = {
      id: "probe",
      run(context) {
        runCount += 1;
        context.events.push({
          id: `evt_probe_${context.nextState.meta.tick}_${runCount}`,
          type: "probe.tick",
          payload: {
            tickScale: context.tickScale
          },
          occurredAt: context.now
        });
      }
    };

    const pipeline = new TickPipeline([probeSystem], staticData);
    const result = pipeline.runBatch(initial, ticksToSimulate, deltaMs, initial.meta.lastUpdatedAt, {
      collectEvents: true,
      coarseStepTicks: 8
    });

    expect(runCount).toBe(ticksToSimulate);
    expect(result.events).toHaveLength(ticksToSimulate);
    expect(result.events.every((entry) => entry.payload?.tickScale === 1)).toBe(true);
  });
});

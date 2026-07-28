import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { createStaticWorldData } from "../src/application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1 } from "../src/application/boot/generated/world-definitions-v1";
import { createEventChainSystem } from "../src/core/simulation/systems/event-chain-system";
import { TickPipeline } from "../src/core/simulation/tick-pipeline";

describe("event chain system", () => {
  const staticData = createStaticWorldData();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts and progresses an economic crisis chain deterministically", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const system = createEventChainSystem();
    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const pipeline = new TickPipeline([system], staticData);

    let currentState = initialState;
    const started = pipeline.run(currentState, 1000, Date.now());
    currentState = started.state;

    expect(started.events.some((event) => event.type === "event_chain.economic_crisis")).toBe(true);
    expect(Object.keys(currentState.world.eventChains ?? {})).not.toHaveLength(0);

    let stageTwoTriggered = false;
    for (let index = 0; index < 20; index += 1) {
      const result = pipeline.run(currentState, 1000, Date.now() + index * 1000);
      currentState = result.state;
      stageTwoTriggered ||= result.events.some(
        (event) =>
          event.type === "event_chain.economic_crisis" &&
          event.payload.stage === 2 &&
          event.payload.impact === "food_shortage"
      );
    }

    expect(stageTwoTriggered).toBe(true);
  });

  it("persists active chains in game state snapshots", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const system = createEventChainSystem();
    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const pipeline = new TickPipeline([system], staticData);

    const startedState = pipeline.run(initialState, 1000, Date.now()).state;
    const savedSnapshot = structuredClone(startedState);
    const resumedState = pipeline.run(savedSnapshot, 1000, Date.now() + 1000).state;

    expect(Object.keys(startedState.world.eventChains ?? {})).not.toHaveLength(0);
    expect(Object.keys(resumedState.world.eventChains ?? {})).toEqual(
      Object.keys(startedState.world.eventChains ?? {})
    );
  });

  it("can start a holy war chain for a highly cohesive player kingdom", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const system = createEventChainSystem();
    const initialState = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const player = Object.values(initialState.kingdoms).find((kingdom) => kingdom.isPlayer);

    if (!player) {
      throw new Error("Player kingdom not found in initial state.");
    }

    player.religion.cohesion = 0.95;

    const pipeline = new TickPipeline([system], staticData);
    const result = pipeline.run(initialState, 1000, Date.now());

    expect(result.events.some((event) => event.type === "event_chain.holy_war")).toBe(true);
  });
});

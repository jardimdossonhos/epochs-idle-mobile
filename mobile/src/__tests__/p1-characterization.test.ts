jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

import { createStaticWorldData } from '../application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from '../application/boot/generated/world-definitions-v1';
import { createInitialState } from '../application/boot/create-initial-state';
import { createDefaultSimulationSystems } from '../core/simulation/create-default-systems';
import { UtilityNpcDecisionService } from '../infrastructure/npc/utility-npc-decision-service';
import { LocalDiplomacyResolver } from '../infrastructure/diplomacy/local-diplomacy-resolver';
import { LocalWarResolver } from '../infrastructure/war/local-war-resolver';
import { LocalEventBus } from '../infrastructure/runtime/local-event-bus';
import { TickPipeline } from '../core/simulation/tick-pipeline';
import { GameSession } from '../application/game-session';
import { ClockService } from '../core/contracts/services';

class MockClock implements ClockService {
  public currentTime = 100000;
  now() { return this.currentTime; }
  start(onTick: (deltaMs: number, now: number) => void) {}
  stop() {}
}

describe('P1 Temporal Characterization', () => {
  let staticData: any;
  let pipeline: TickPipeline;
  let deps: any;
  let clock: MockClock;

  beforeEach(() => {
    staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
    clock = new MockClock();
    const eventBus = new LocalEventBus();
    const npcDecisionService = new UtilityNpcDecisionService(staticData);
    const diplomacyResolver = new LocalDiplomacyResolver();
    const warResolver = new LocalWarResolver(staticData);

    const systems = createDefaultSimulationSystems({
      staticData,
      orderedDefinitions: WORLD_DEFINITIONS_V1,
      npcDecisionService,
      diplomacyResolver,
      warResolver,
      eventBus
    });

    pipeline = new TickPipeline(systems, staticData);
    
    deps = {
      gameStateRepository: { 
        saveCurrentSync: () => {}, 
        saveCurrent: async () => {}, 
        loadCurrent: async () => null, 
        clearCurrent: async () => {} 
      },
      saveRepository: { 
        saveMetadata: async () => {}, 
        getMetadata: async () => null, 
        listSaves: async () => [],
        listSlots: async () => [],
        loadFromSlot: async () => null
      },
      staticWorldData: staticData,
      clock,
      eventBus,
      systems,
      diplomacyResolver,
      warResolver,
      maxOfflineTicks: 12000
    };
  });

  function getBaseState() {
    const baseState = createInitialState(staticData, 'r_hex_38160', WORLD_DEFINITIONS_V1);
    const pkId = Object.keys(baseState.kingdoms).find(k => k !== 'k_nature') as string;
    
    baseState.kingdoms[pkId].economy.incomePerTick.food = 10;
    baseState.kingdoms[pkId].economy.upkeepPerTick.food = 2;
    baseState.kingdoms[pkId].economy.stock.food = 100;

    baseState.kingdoms[pkId].technology.accumulatedResearch = 0;
    baseState.kingdoms[pkId].economy.budgetPriority.technology = 10;
    
    // Core property adjustments
    baseState.kingdoms[pkId].population.total = 1000;
    baseState.kingdoms[pkId].stability = 50;

    return baseState;
  }

  it('Batch Equivalence: N individual ticks vs 1 batch of N ticks', () => {
    const N = 50;
    const deltaMs = 1000;
    const pkId = Object.keys(getBaseState().kingdoms).find(k => k !== 'k_nature') as string;
    
    let stateA = getBaseState();
    let stateB = getBaseState();

    for (let i = 0; i < N; i++) {
      stateA = pipeline.runMutating(stateA, deltaMs, 10000 + (i * deltaMs)).state;
    }
    
    stateB = pipeline.runBatch(stateB, N, deltaMs, 10000, { coarseStepTicks: N, collectEvents: false }).state;

    const techA = stateA.kingdoms[pkId].technology.accumulatedResearch;
    const techB = stateB.kingdoms[pkId].technology.accumulatedResearch;
    const foodA = stateA.kingdoms[pkId].economy.stock.food;
    const foodB = stateB.kingdoms[pkId].economy.stock.food;
    const popA = stateA.kingdoms[pkId].population.total;
    const popB = stateB.kingdoms[pkId].population.total;
    const stabA = stateA.kingdoms[pkId].stability;
    const stabB = stateB.kingdoms[pkId].stability;
    
    expect(stateA.meta.tick).toBe(stateB.meta.tick); 
    
    console.log(`[TESTE DE BATCH: DIVERGÊNCIA ESTRUTURAL]`);
    console.log(`Ticks simulated: ${N}`);
    console.log(`Food Individual: ${foodA} | Food Batch: ${foodB} | Delta: ${foodA - foodB}`);
    console.log(`Tech Individual: ${techA} | Tech Batch: ${techB} | Delta: ${techA - techB}`);
    console.log(`Pop Individual: ${popA} | Pop Batch: ${popB} | Delta: ${popA - popB}`);
    console.log(`Stability Individual: ${stabA} | Stability Batch: ${stabB} | Delta: ${stabA - stabB}`);
    
    // We just want to demonstrate divergence, no mocks necessary.
    expect(techA).not.toBe(techB);
  });

  it('Offline Progression discards time above max limit (via Bootstrap anchoring)', async () => {
    const session = new GameSession(deps);
    (session as any).pipeline = pipeline; 

    const tickDuration = 1000;
    const initialState = getBaseState();
    const startTick = initialState.meta.tick;
    initialState.meta.tickDurationMs = tickDuration;
    initialState.meta.offlineProgression = true; 
    initialState.meta.lastUpdatedAt = 100000;
    initialState.meta.lastClosedAt = null; 

    const elapsedMs = 20000 * 1000; 
    const now = initialState.meta.lastUpdatedAt + elapsedMs;
    
    clock.currentTime = now;

    await session.bootstrap(initialState);
    
    const finalState = session.getState();
    const metrics = (session as any).runtimeMetrics;
    
    console.log(`[TESTE DE OFFLINE: DESCARTE NA ANCORAGEM]`);
    console.log(`Elapsed Ms: 20000s, Ticks simulated by bootstrap: ${metrics.offlineTicks}`);
    console.log(`Initial Tick: ${startTick} | Final Tick: ${finalState.meta.tick}`);
    
    // A 12000 cap is applied
    expect(metrics.offlineTicks).toBe(12000);
    // State tick reflects what was effectively processed
    expect(finalState.meta.tick).toBe(startTick + 12000);
    // Data is anchored entirely to 'now', structural truncation
    expect(finalState.meta.lastUpdatedAt).toBe(now); 
  });

  it('Online Backlog: Unit test for specific discard branch via artificial injection', () => {
    const session = new GameSession(deps);
    (session as any).pipeline = pipeline;
    
    const state = getBaseState();
    state.meta.tickDurationMs = 1000;
    state.meta.speedMultiplier = 1;
    state.meta.paused = false;
    session['currentState'] = state;
    session['isWorkerReady'] = true; 
    
    const startingAccumulation = 150000;
    session['accumulatedMs'] = startingAccumulation;
    
    session['pumpSimulationQueue']();
    
    console.log(`[TESTE DE BACKLOG ONLINE: INJEÇÃO UNITÁRIA]`);
    console.log(`Starting accumulation injected: ${startingAccumulation}ms`);
    console.log(`Final accumulation after drop limit triggers: ${session['accumulatedMs']}ms`);
    
    expect(session['accumulatedMs']).toBeLessThan(150000);
    expect(session['accumulatedMs']).toBe(1000);
  });
});

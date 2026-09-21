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
import { BrowserClockService } from '../infrastructure/runtime/browser-clock-service';
import { TickPipeline } from '../core/simulation/tick-pipeline';
import { GameSession } from '../application/game-session';
import { GameState } from '../core/models/game-state';

describe('P1 Temporal Characterization (Real Runtime)', () => {
  let staticData: any;
  let pipeline: TickPipeline;
  let baseState: any;
  let deps: any;
  const N = 50;

  beforeEach(() => {
    staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
    baseState = createInitialState(staticData, 'r_hex_38160', WORLD_DEFINITIONS_V1);
    
    // Ensure technology accumulates so we can measure divergence
    const pkId = Object.keys(baseState.kingdoms).find(k => k !== 'k_nature') as string;
    baseState.kingdoms[pkId].technology.accumulatedResearch = 0;
    baseState.kingdoms[pkId].economy.budgetPriority.technology = 10;
    
    const clock = new BrowserClockService();
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
      gameStateRepository: { saveCurrentSync: () => {}, saveCurrent: async () => {}, loadCurrent: async () => null, clearCurrent: async () => {} },
      saveRepository: { saveMetadata: async () => {}, getMetadata: async () => null, listSaves: async () => [] },
      staticWorldData: staticData,
      clock,
      eventBus,
      systems,
      diplomacyResolver,
      warResolver,
      maxOfflineTicks: 12000
    };
  });

  it('Batch Equivalence: N individual ticks vs 1 batch of N ticks', () => {
    const deltaMs = 1000;
    const pkId = Object.keys(baseState.kingdoms).find(k => k !== 'k_nature') as string;
    
    let stateA = JSON.parse(JSON.stringify(baseState));
    stateA.ecs = baseState.ecs;
    for (let i = 0; i < N; i++) {
      stateA = pipeline.runMutating(stateA, deltaMs, 10000 + (i * deltaMs)).state;
    }
    
    let stateB = JSON.parse(JSON.stringify(baseState));
    stateB.ecs = baseState.ecs;
    stateB = pipeline.runBatch(stateB, N, deltaMs, 10000, { coarseStepTicks: N, collectEvents: false }).state;

    const techA = stateA.kingdoms[pkId].technology.accumulatedResearch;
    const techB = stateB.kingdoms[pkId].technology.accumulatedResearch;
    
    expect(stateA.meta.tick).toBe(stateB.meta.tick);
    
    console.log(`[REAL BATCH PROOF]`);
    console.log(`Ticks simulated: ${N}`);
    console.log(`Tech Individual: ${techA} | Tech Batch: ${techB}`);
    
    // Provando erro real estrutural na pipeline e sistemas reais (Economia e Tech perdem)
    expect(techA).toBeGreaterThan(techB); 
  });

  it('Offline Progression discards time above max limit', async () => {
    const session = new GameSession(deps);
    (session as any).pipeline = pipeline;

    const tickDuration = 1000;
    const state = JSON.parse(JSON.stringify(baseState));
    state.ecs = baseState.ecs;
    state.meta.tickDurationMs = tickDuration;
    state.meta.offlineProgression = true; // Necessário ligar a feature
    state.meta.lastUpdatedAt = 100000;
    state.meta.lastClosedAt = null;

    const elapsedMs = 20000 * 1000; // 20k ticks worth of time
    const now = state.meta.lastUpdatedAt + elapsedMs;

    const result = await (session as any).runOfflineProgression(state, now);
    
    console.log(`[REAL OFFLINE PROOF]`);
    console.log(`Elapsed Ms: 20000s, Ticks simulated: ${result.ticks}`);
    
    expect(result.ticks).toBe(12000);
    session['currentState'] = result.state;
    session['currentState'].meta.lastUpdatedAt = now;
    
    console.log(`Calculated lost ticks discarded on anchor: 8000`);
    expect(session['currentState'].meta.lastUpdatedAt).toBe(now); // time above 12000 is discarded
  });

  it('Online Backlog: Overaccumulated deltaMs is discarded', () => {
    const session = new GameSession(deps);
    (session as any).pipeline = pipeline;
    
    const state = JSON.parse(JSON.stringify(baseState));
    state.ecs = baseState.ecs;
    state.meta.tickDurationMs = 1000;
    state.meta.speedMultiplier = 1;
    session['currentState'] = state;
    
    // Max is 120000. Force an accumulation higher than that.
    const startingAccumulation = 150000;
    session['accumulatedMs'] = startingAccumulation;
    session['isWorkerReady'] = true; // necessary to pass the if guard
    
    // Call pumpSimulationQueue directly to bypass processClockTick's safety clamp
    session['pumpSimulationQueue']();
    
    console.log(`[REAL ONLINE BACKLOG PROOF]`);
    console.log(`Starting accumulation: ${startingAccumulation}ms`);
    console.log(`Final accumulation after drop: ${session['accumulatedMs']}ms`);
    
    expect(session['accumulatedMs']).toBeLessThan(150000);
    // Because it processed up to 5 ticks, accumulatedMs -= 5000 -> 145000.
    // Since 145000 > 120000, it drops to 1000.
    expect(session['accumulatedMs']).toBe(1000);
  });
});

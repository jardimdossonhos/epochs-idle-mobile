jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

import { getCalendarDate, isStartOfMonth, isStartOfYear } from '../core/simulation/calendar';
import { GameSession } from '../application/game-session';
import { createStaticWorldData } from '../application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from '../application/boot/generated/world-definitions-v1';
import { createInitialState } from '../application/boot/create-initial-state';
import { TEMPORAL_CONFIG } from '../core/simulation/temporal-config';
import { createDefaultSimulationSystems } from '../core/simulation/create-default-systems';
import { UtilityNpcDecisionService } from '../infrastructure/npc/utility-npc-decision-service';
import { LocalDiplomacyResolver } from '../infrastructure/diplomacy/local-diplomacy-resolver';
import { LocalWarResolver } from '../infrastructure/war/local-war-resolver';
import { LocalEventBus } from '../infrastructure/runtime/local-event-bus';
import { ClockService } from '../core/contracts/services';

class MockClock implements ClockService {
  public currentTime = 100000;
  now() { return this.currentTime; }
  start(onTick: (deltaMs: number, now: number) => void) {}
  stop() {}
}

describe('Temporal Contract Implementation', () => {
  describe('A. Calendar API', () => {
    it('Tick 0 => Year 1, Month 1, Day 1', () => {
      const date = getCalendarDate(0);
      expect(date).toEqual({ year: 1, month: 1, day: 1, dayOfYear: 1 });
      expect(isStartOfMonth(0)).toBe(true);
      expect(isStartOfYear(0)).toBe(true);
    });

    it('Tick 1 => Year 1, Month 1, Day 2', () => {
      const date = getCalendarDate(1);
      expect(date).toEqual({ year: 1, month: 1, day: 2, dayOfYear: 2 });
    });

    it('Tick 29 => Year 1, Month 1, Day 30', () => {
      const date = getCalendarDate(29);
      expect(date).toEqual({ year: 1, month: 1, day: 30, dayOfYear: 30 });
    });

    it('Tick 30 => Year 1, Month 2, Day 1', () => {
      const date = getCalendarDate(30);
      expect(date).toEqual({ year: 1, month: 2, day: 1, dayOfYear: 31 });
      expect(isStartOfMonth(30)).toBe(true);
      expect(isStartOfYear(30)).toBe(false);
    });

    it('Tick 359 => Year 1, Month 12, Day 30', () => {
      const date = getCalendarDate(359);
      expect(date).toEqual({ year: 1, month: 12, day: 30, dayOfYear: 360 });
    });

    it('Tick 360 => Year 2, Month 1, Day 1', () => {
      const date = getCalendarDate(360);
      expect(date).toEqual({ year: 2, month: 1, day: 1, dayOfYear: 1 });
      expect(isStartOfMonth(360)).toBe(true);
      expect(isStartOfYear(360)).toBe(true);
    });
  });

  describe('B & C. Speed Logic & Tick Progression in GameSession', () => {
    let session: GameSession;
    let clock: MockClock;

    beforeEach(() => {
      const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
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

      const deps = {
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
        warResolver
      };

      session = new GameSession(deps as any);
      
      const initialState = createInitialState(staticData, 'r_hex_38160', WORLD_DEFINITIONS_V1);
      // Ensure we don't start paused so processClockTick works naturally
      initialState.meta.paused = false;
      session['currentState'] = initialState;
      session['isWorkerReady'] = true; 
    });

    it('Clamps speed properly: 0.5x -> 1x, 31x -> 30x', () => {
      session.setSpeed(0.5);
      expect(session.getState().meta.speedMultiplier).toBe(1);

      session.setSpeed(31);
      expect(session.getState().meta.speedMultiplier).toBe(30);
      
      // tickDurationMs must remain constant
      expect(session.getState().meta.tickDurationMs).toBe(10_000);
    });

    it('1x Speed: 10,000 real ms -> 1 day (1 tick)', () => {
      session.setSpeed(1);
      const startTick = session.getState().meta.tick;

      // Manually trigger a 10,000ms elapsed time processing
      session['processClockTick'](10_000, clock.now(), false, undefined, false); // no safety clamp for test predictability
      
      // Accumulated ms should have been consumed precisely
      expect(session['accumulatedMs']).toBe(0);
      expect(session.getState().meta.tick).toBe(startTick + 1);
    });

    it('2x Speed: 10,000 real ms -> 2 days (20,000 virtual ms)', () => {
      session.setSpeed(2);
      const startTick = session.getState().meta.tick;

      // 10,000 real ms
      session['processClockTick'](10_000, clock.now(), false, undefined, false);
      
      // Since max ticks per frame is 5, it can easily process 2 ticks
      expect(session['accumulatedMs']).toBe(0);
      expect(session.getState().meta.tick).toBe(startTick + 2);
    });

    it('30x Speed: 10,000 real ms -> 30 days (300,000 virtual ms)', () => {
      session.setSpeed(30);
      const startTick = session.getState().meta.tick;

      // 10,000 real ms * 30x = 300,000 virtual ms = 30 ticks
      // But pumpSimulationQueue processes a max of 5 ticks per synchronous call, then enqueues.
      session['processClockTick'](10_000, clock.now(), false, undefined, false);
      
      // After first synchronous pump, 5 ticks should be processed.
      expect(session.getState().meta.tick).toBe(startTick + 5);
      
      // We manually exhaust the queued pumps (simulate the setTimeout loop)
      while (session['accumulatedMs'] >= 10_000) {
        session['pumpSimulationQueue']();
      }
      
      expect(session['accumulatedMs']).toBe(0);
      expect(session.getState().meta.tick).toBe(startTick + 30);
    });

    it('Tick progression solely consumes accumulatedMs without side effects from render frame', () => {
      session.setSpeed(1);
      const startTick = session.getState().meta.tick;
      
      // 9,999ms elapsed -> no tick
      session['processClockTick'](9_999, clock.now(), false, undefined, false);
      expect(session.getState().meta.tick).toBe(startTick);
      expect(session['accumulatedMs']).toBe(9_999);
      
      // 1 more ms -> exactly 1 tick
      session['processClockTick'](1, clock.now(), false, undefined, false);
      expect(session.getState().meta.tick).toBe(startTick + 1);
      expect(session['accumulatedMs']).toBe(0);
    });
    });

  describe('D. Save Hydration', () => {
    it('Normalizes legacy tickDurationMs and speedMultiplier without corrupting tick', () => {
      const { migrateStateToCurrent } = require('../infrastructure/persistence/save-schema');
      const legacyState = {
        meta: {
          tick: 42,
          tickDurationMs: 1000,
          speedMultiplier: 100
        },
        world: { regions: {} },
        campaign: {}, wars: {}, treaties: {},
        kingdoms: {}
      };

      const hydrated = migrateStateToCurrent(legacyState);
      
      expect(hydrated.meta.tick).toBe(42);
      expect(hydrated.meta.tickDurationMs).toBe(10_000);
      expect(hydrated.meta.speedMultiplier).toBe(30);
    });
  });
});

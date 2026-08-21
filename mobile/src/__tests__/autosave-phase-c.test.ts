jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { GameSession } from "../application/game-session";

describe("Phase C: Autosave and Debounce", () => {
  let session: GameSession;
  let mockClock: any;

  const MOCK_STATE = { 
    meta: { speedMultiplier: 1, tick: 1, paused: false, tickDurationMs: 1000 }, 
    ecs: {},
    world: { religions: {} },
    kingdoms: {},
    events: []
  } as any;

  beforeEach(() => {
    let time = 1000;
    mockClock = {
      now: jest.fn(() => time),
      start: jest.fn(),
      advance: (ms: number) => { time += ms; }
    };

    session = new GameSession({
      gameStateRepository: {
        loadCurrent: jest.fn().mockResolvedValue(null),
        saveCurrent: jest.fn().mockResolvedValue(undefined),
      } as any,
      saveRepository: {
        saveToSlot: jest.fn().mockResolvedValue(undefined),
        listSlots: jest.fn().mockResolvedValue([]),
      } as any,
      commandLogRepository: { latest: jest.fn().mockResolvedValue(null) } as any,
      eventBus: { subscribe: jest.fn(), publish: jest.fn() } as any,
      clock: mockClock as any,
    });
    
    (session as any).monotonicNow = jest.fn(() => mockClock.now());
    (session as any).pipeline = { 
      runMutating: jest.fn().mockReturnValue({ ok: true, events: [], state: MOCK_STATE }) 
    };
    (session as any).recordTickCommands = jest.fn();
    (session as any).checkCivicUnlocks = jest.fn();
    (session as any).timeBudget = { pushSample: jest.fn() };
  });

  it("should boot without SnapshotRepository", async () => {
    await session.bootstrap(MOCK_STATE);
    expect(session["deps"].gameStateRepository.loadCurrent).toHaveBeenCalled();
  });

  it("should respect realtime 60000ms autosave interval regardless of ticks (1x vs 30x)", async () => {
    await session.bootstrap(MOCK_STATE);
    session.start();

    let commitCalls = 0;
    session["doCommitAutosave"] = () => { 
      commitCalls++; 
      session["isSaving"] = false; 
    };

    session["currentState"] = MOCK_STATE;
    session["currentState"].meta.paused = false;
    session["accumulatedMs"] = 1000;
    session["lastAutosaveAt"] = mockClock.now();
    
    session["pumpSimulationQueue"]();
    expect(commitCalls).toBe(0);

    mockClock.advance(60000);
    session["accumulatedMs"] = 60000;
    session["pumpSimulationQueue"]();
    expect(commitCalls).toBe(1);
    
    session["lastAutosaveAt"] = mockClock.now();
    session["accumulatedMs"] = 30000;
    session["currentState"] = { ...MOCK_STATE, meta: { ...MOCK_STATE.meta, speedMultiplier: 30, paused: false } } as any;
    
    mockClock.advance(30000);
    session["pumpSimulationQueue"]();
    expect(commitCalls).toBe(1); // not 60s yet

    mockClock.advance(30000);
    session["accumulatedMs"] = 30000;
    session["pumpSimulationQueue"]();
    expect(commitCalls).toBe(2); 
  });

  it("should debounce autosave (do not overlap)", async () => {
    await session.bootstrap(MOCK_STATE);
    session.start();
    session["currentState"] = MOCK_STATE;
    session["currentState"].meta.paused = false;
    session["accumulatedMs"] = 60000;
    session["lastAutosaveAt"] = mockClock.now();

    let commitCalls = 0;
    session["doCommitAutosave"] = () => { commitCalls++; session["isSaving"] = false; };

    session["isSaving"] = true;
    
    mockClock.advance(60000);
    session["pumpSimulationQueue"]();
    
    expect(commitCalls).toBe(0);
    expect(session["saveQueued"]).toBe(true);

    session["isSaving"] = false;
    if (session["saveQueued"]) {
      session["saveQueued"] = false;
      session["runAutosave"]();
    }
    
    expect(commitCalls).toBe(1);
  });
});
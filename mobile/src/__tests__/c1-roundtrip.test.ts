/**
 * C1.3 — Round-Trip Test Suite for ECS Snapshot
 *
 * Proves that every Category A (canonical) field survives the full cycle:
 *   ECS runtime → buildEcsSnapshot → JSON.stringify → JSON.parse
 *   → fresh EcsState → restoreEcsFromSnapshot → field-by-field comparison
 *
 * Tests all five hex scenarios required by the implementation spec:
 *   1. Virgin hex        — must NOT appear in snapshot
 *   2. Occupied hex      — all fields stored
 *   3. Abandoned hex     — owner=-1 with no residual state, present only if previously modified
 *   4. Abandoned+residual— owner=-1 but has pop/structures (Exodus ghost)
 *   5. Fully-returned    — hex mutated then reset back to virgin values
 */

import { createStaticWorldData } from '../application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from '../application/boot/generated/world-definitions-v1';
import { createInitialState } from '../application/boot/create-initial-state';
import type { EcsState } from '../core/models/game-state';
import {
  buildEcsSnapshot,
  restoreEcsFromSnapshot,
  shouldPersistHex,
  isEcsSnapshot,
  ECS_SNAPSHOT_VERSION,
} from '../infrastructure/persistence/ecs-snapshot';

// Helper to create a fresh ECS initialised to virgin values (mirrors createInitialState logic)
function createFreshEcs(totalEntities: number): EcsState {
  return {
    gold: new Float64Array(totalEntities).fill(0),
    food: new Float64Array(totalEntities).fill(0),
    wood: new Float64Array(totalEntities).fill(0),
    iron: new Float64Array(totalEntities).fill(0),
    faith: new Float64Array(totalEntities).fill(0),
    legitimacy: new Float64Array(totalEntities).fill(0),
    populationTotal: new Float64Array(totalEntities).fill(0),
    populationGrowthRate: new Float64Array(totalEntities).fill(0),
    manpower: new Float64Array(totalEntities).fill(0),
    factionCasualties: new Int32Array(256).fill(0),
    factionManpowerReserve: new Float32Array(256).fill(100),
    accumulatedSimulatedTime: 0,
    conquestEpoch: 0,
    regionManpowerYield: new Float32Array(totalEntities).fill(0.1),
    regionManpowerCap: new Float32Array(totalEntities).fill(50),
    factionManpowerCap: new Float32Array(256).fill(0),
    regionGoldYield: new Float32Array(totalEntities).fill(0.5),
    factionGoldBalance: new Float32Array(256).fill(100),
    cmdHead: 0,
    cmdTail: 0,
    cmdType: new Int32Array(2048),
    cmdFaction: new Int32Array(2048),
    cmdArg0: new Int32Array(2048),
    cmdArg1: new Int32Array(2048),
    regionOwner: new Int32Array(totalEntities).fill(-1),
    regionCaptureProgress: new Float32Array(totalEntities).fill(0),
    regionSupplyCapacity: new Float32Array(totalEntities).fill(1000),
    regionCurrentSupply: new Float32Array(totalEntities).fill(1000),
    factionResources: new Float32Array(256 * 3).fill(100),
    hexStructures: new Int32Array(totalEntities).fill(0),
    combatEventHead: 0,
    combatEventTail: 0,
    combatEventX: new Float32Array(1024),
    combatEventY: new Float32Array(1024),
    combatEventTs: new Float32Array(1024),
    visibilityMask: new Uint8Array(totalEntities).fill(0),
    regionDominantFaith: new Int32Array(totalEntities).fill(0),
    regionDominantShare: new Float32Array(totalEntities).fill(1),
    regionMinorityFaith: new Int32Array(totalEntities).fill(-1),
    regionMinorityShare: new Float32Array(totalEntities).fill(0),
    regionFaithUnrest: new Float32Array(totalEntities).fill(0),
    factionPopulation: new Float32Array(256).fill(0),
    factionRegions: new Int32Array(256).fill(0),
    factionPopulationGrowth: new Float32Array(256).fill(0),
    factionPeasants: new Float32Array(256).fill(0.8),
    factionNobles: new Float32Array(256).fill(0.05),
    factionClergy: new Float32Array(256).fill(0.05),
    factionSoldiers: new Float32Array(256).fill(0.05),
    factionMerchants: new Float32Array(256).fill(0.05),
    factionPopUnrest: new Float32Array(256).fill(0),
  } as unknown as EcsState;
}

describe('C1 — ECS Snapshot (shouldPersistHex)', () => {
  let ecs: EcsState;
  const TOTAL = 1000; // small grid for predicate tests

  beforeEach(() => {
    ecs = createFreshEcs(TOTAL);
  });

  test('virgin hex is NOT persisted', () => {
    // idx=42 has never been touched
    expect(shouldPersistHex(42, ecs)).toBe(false);
  });

  test('hex with owner is persisted', () => {
    (ecs.regionOwner as Int32Array)[10] = 1;
    expect(shouldPersistHex(10, ecs)).toBe(true);
  });

  test('hex abandoned (owner=-1) but with pop is persisted', () => {
    // owner stays -1 (virgin sentinel), but someone was there
    (ecs.populationTotal as Float64Array)[20] = 50;
    expect(shouldPersistHex(20, ecs)).toBe(true);
  });

  test('hex abandoned with structures is persisted', () => {
    (ecs.hexStructures as Int32Array)[30] = 3;
    expect(shouldPersistHex(30, ecs)).toBe(true);
  });

  test('hex reset to fully virgin values is NOT persisted', () => {
    // Simulate: hex was modified then manually restored
    (ecs.regionOwner as Int32Array)[5] = 1;
    expect(shouldPersistHex(5, ecs)).toBe(true);
    // Now fully restored
    (ecs.regionOwner as Int32Array)[5] = -1;
    expect(shouldPersistHex(5, ecs)).toBe(false);
  });

  test('abandoned+residual hex: owner=-1 explicitly present in snapshot', () => {
    // Simulate an Exodus: region abandoned but has leftover pop and structure
    const IDX = 77;
    (ecs.regionOwner as Int32Array)[IDX] = -1;
    (ecs.populationTotal as Float64Array)[IDX] = 50;
    (ecs.hexStructures as Int32Array)[IDX] = 2;

    const snap = buildEcsSnapshot(ecs);
    expect(snap.h[IDX]).toBeDefined();
    expect(snap.h[IDX].o).toBe(-1); // owner MUST be explicitly -1
    expect(snap.h[IDX].p).toBe(50);
    expect(snap.h[IDX].s).toBe(2);
  });
});

describe('C1 — ECS Round-Trip (All Category A fields)', () => {
  let ecs: EcsState;
  let totalEntities: number;

  const CAP = 38160;  // occupied capital
  const WILD = 99999; // abandoned with residual state
  const VIRGIN_IDX = 5000; // never touched

  beforeAll(() => {
    const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
    const state = createInitialState(staticData, 'r_hex_38160', WORLD_DEFINITIONS_V1);
    ecs = state.ecs as EcsState;
    totalEntities = ecs.regionOwner.length;

    // ── Scenario 1: Fully occupied capital with all fields set ──────────────
    (ecs.regionOwner as Int32Array)[CAP]           = 1;
    (ecs.populationTotal as Float64Array)[CAP]      = 140;
    (ecs.populationGrowthRate as Float64Array)[CAP] = 0.23;
    (ecs.gold as Float64Array)[CAP]                 = 999;
    (ecs.food as Float64Array)[CAP]                 = 55;
    (ecs.wood as Float64Array)[CAP]                 = 17;
    (ecs.iron as Float64Array)[CAP]                 = 3;
    (ecs.faith as Float64Array)[CAP]                = 34;
    (ecs.legitimacy as Float64Array)[CAP]           = 34;
    (ecs.manpower as Float64Array)[CAP]             = 12;
    (ecs.regionDominantFaith as Int32Array)[CAP]    = 2;
    (ecs.regionDominantShare as Float32Array)[CAP]  = 0.71;
    (ecs.regionMinorityFaith as Int32Array)[CAP]    = 3;
    (ecs.regionMinorityShare as Float32Array)[CAP]  = 0.29;
    (ecs.regionFaithUnrest as Float32Array)[CAP]    = 0.12;
    (ecs.regionCaptureProgress as Float32Array)[CAP]= 0.45;
    (ecs.regionCurrentSupply as Float32Array)[CAP]  = 17;
    (ecs.hexStructures as Int32Array)[CAP]          = 5;
    (ecs.visibilityMask as Uint8Array)[CAP]         = 1;

    // ── Scenario 2: Abandoned hex with owner=-1 and residual state ──────────
    (ecs.regionOwner as Int32Array)[WILD]           = -1;
    (ecs.populationTotal as Float64Array)[WILD]     = 50;
    (ecs.hexStructures as Int32Array)[WILD]         = 2;

    // ── Faction globals ──────────────────────────────────────────────────────
    (ecs.factionGoldBalance as Float32Array)[1]     = 5000;
    (ecs.factionManpowerReserve as Float32Array)[1] = 777;
    (ecs.factionCasualties as Int32Array)[1]        = 42;
    (ecs.factionResources as Float32Array)[2]       = 333;
    ecs.accumulatedSimulatedTime                    = 12345;
    ecs.conquestEpoch                               = 3;
  });

  let snap: ReturnType<typeof buildEcsSnapshot>;
  let json: string;
  let restored: EcsState;

  test('snapshot has correct schema version', () => {
    snap = buildEcsSnapshot(ecs);
    expect(snap.sv).toBe(ECS_SNAPSHOT_VERSION);
  });

  test('isEcsSnapshot type guard accepts valid snapshot', () => {
    snap = snap ?? buildEcsSnapshot(ecs);
    expect(isEcsSnapshot(snap)).toBe(true);
  });

  test('isEcsSnapshot type guard rejects wrong version', () => {
    expect(isEcsSnapshot({ ...snap, sv: 1 })).toBe(false);
  });

  test('JSON round-trip keeps schema version', () => {
    json = JSON.stringify(snap);
    const parsed = JSON.parse(json);
    expect(isEcsSnapshot(parsed)).toBe(true);
  });

  test('virgin hex is absent from snapshot', () => {
    expect(snap.h[VIRGIN_IDX]).toBeUndefined();
  });

  test('abandoned+residual hex is present with explicit owner=-1', () => {
    expect(snap.h[WILD]).toBeDefined();
    expect(snap.h[WILD].o).toBe(-1);
    expect(snap.h[WILD].p).toBe(50);
    expect(snap.h[WILD].s).toBe(2);
  });

  test('occupied capital is present with all fields', () => {
    expect(snap.h[CAP]).toBeDefined();
    expect(snap.h[CAP].o).toBe(1);
    expect(snap.h[CAP].p).toBe(140);
  });

  describe('restore and field-by-field comparison', () => {
    beforeAll(() => {
      const parsed = JSON.parse(JSON.stringify(snap));
      restored = createFreshEcs(totalEntities);
      restoreEcsFromSnapshot(restored, parsed);
    });

    // ── Category A: Per-hex canonical fields ──────────────────────────────
    test('regionOwner is preserved', () => {
      expect(restored.regionOwner[CAP]).toBe(1);
    });

    test('regionOwner=-1 is preserved for abandoned hex', () => {
      expect(restored.regionOwner[WILD]).toBe(-1);
    });

    test('regionOwner for virgin hex stays -1 (default)', () => {
      expect(restored.regionOwner[VIRGIN_IDX]).toBe(-1);
    });

    test('populationTotal is preserved', () => {
      expect(restored.populationTotal[CAP]).toBe(140);
    });

    test('populationTotal preserved for abandoned hex', () => {
      expect(restored.populationTotal[WILD]).toBe(50);
    });

    test('populationGrowthRate is preserved', () => {
      expect(restored.populationGrowthRate[CAP]).toBeCloseTo(0.23, 5);
    });

    test('gold is preserved', () => {
      expect(restored.gold[CAP]).toBe(999);
    });

    test('food is preserved', () => {
      expect(restored.food[CAP]).toBe(55);
    });

    test('wood is preserved', () => {
      expect(restored.wood[CAP]).toBe(17);
    });

    test('iron is preserved', () => {
      expect(restored.iron[CAP]).toBe(3);
    });

    test('faith is preserved', () => {
      expect(restored.faith[CAP]).toBe(34);
    });

    test('legitimacy is preserved', () => {
      expect(restored.legitimacy[CAP]).toBe(34);
    });

    test('manpower is preserved', () => {
      expect(restored.manpower[CAP]).toBe(12);
    });

    test('regionDominantFaith is preserved', () => {
      expect(restored.regionDominantFaith[CAP]).toBe(2);
    });

    test('regionDominantShare is preserved', () => {
      expect(restored.regionDominantShare[CAP]).toBeCloseTo(0.71, 5);
    });

    test('regionMinorityFaith is preserved', () => {
      expect(restored.regionMinorityFaith[CAP]).toBe(3);
    });

    test('regionMinorityShare is preserved', () => {
      expect(restored.regionMinorityShare[CAP]).toBeCloseTo(0.29, 5);
    });

    test('regionFaithUnrest is preserved', () => {
      expect(restored.regionFaithUnrest[CAP]).toBeCloseTo(0.12, 5);
    });

    test('regionCaptureProgress is preserved', () => {
      expect(restored.regionCaptureProgress[CAP]).toBeCloseTo(0.45, 5);
    });

    test('regionCurrentSupply is preserved', () => {
      expect(restored.regionCurrentSupply[CAP]).toBe(17);
    });

    test('hexStructures is preserved (bitmask)', () => {
      expect(restored.hexStructures[CAP]).toBe(5);
    });

    test('hexStructures preserved for abandoned hex', () => {
      expect(restored.hexStructures[WILD]).toBe(2);
    });

    test('visibilityMask is preserved', () => {
      expect(restored.visibilityMask[CAP]).toBe(1);
    });

    // ── Virgin hex defaults are intact ────────────────────────────────────
    test('virgin hex food stays 0', () => {
      expect(restored.food[VIRGIN_IDX]).toBe(0);
    });

    test('virgin hex regionCurrentSupply stays at 1000 (virgin default)', () => {
      expect(restored.regionCurrentSupply[VIRGIN_IDX]).toBe(1000);
    });

    test('abandoned hex food stays 0 (was not set)', () => {
      expect(restored.food[WILD]).toBe(0);
    });

    // ── Category A: Faction globals ───────────────────────────────────────
    test('factionGoldBalance is preserved', () => {
      expect(restored.factionGoldBalance[1]).toBe(5000);
    });

    test('factionManpowerReserve is preserved', () => {
      expect(restored.factionManpowerReserve[1]).toBe(777);
    });

    test('factionCasualties is preserved', () => {
      expect(restored.factionCasualties[1]).toBe(42);
    });

    test('factionResources is preserved', () => {
      expect(restored.factionResources[2]).toBe(333);
    });

    // ── Category A: Scalars ───────────────────────────────────────────────
    test('accumulatedSimulatedTime is preserved', () => {
      expect(restored.accumulatedSimulatedTime).toBe(12345);
    });

    test('conquestEpoch is preserved', () => {
      expect(restored.conquestEpoch).toBe(3);
    });

    // ── Category C: Transient fields are RESET ────────────────────────────
    test('cmdHead is reset to 0', () => {
      expect(restored.cmdHead).toBe(0);
    });

    test('combatEventHead is reset to 0', () => {
      expect(restored.combatEventHead).toBe(0);
    });
  });

  test('snapshot JSON size is well below 1 MB', () => {
    const sizeBytes = Buffer.byteLength(JSON.stringify(snap), 'utf8');
    const sizeKb = sizeBytes / 1024;
    console.log(`[C1 Benchmark] Snapshot size: ${sizeKb.toFixed(2)} KB`);
    expect(sizeKb).toBeLessThan(1024); // must be < 1 MB
  });
});
describe('C1 - Repository Complete Pipeline', () => {
  it('Roundtrips via MobileGameStateRepository save/load', async () => {
    const { MobileGameStateRepository } = require('../infrastructure/persistence/MobileGameStateRepository');
    const { createVirginEcs } = require('../infrastructure/persistence/ecs-factory');
    
    let storageData = new Map();
    const mockStorage = {
      getString: (key) => storageData.get(key),
      set: (key, val) => storageData.set(key, val),
      delete: (key) => storageData.delete(key),
      getAllKeys: () => Array.from(storageData.keys()),
      contains: (key) => storageData.has(key)
    };

    const repo = new MobileGameStateRepository(mockStorage);

    // Create a mock state
    const state = {
      meta: { schemaVersion: 2, sessionId: 's1', tick: 1, tickDurationMs: 1000, speedMultiplier: 1, paused: false, disastersEnabled: true, createdAt: 100, lastUpdatedAt: 200, lastClosedAt: 300 },
      campaign: { currentStage: 'gameplay' },
      world: { regions: {} },
      kingdoms: {},
      wars: {},
      treaties: {},
      victory: {},
      ecs: createVirginEcs(100)
    };

    // Mutate state
    state.ecs.regionOwner[10] = 5;
    state.ecs.gold[10] = 500;
    
    // Save
    await repo.saveCurrent(state);
    
    // Load
    const loaded = await repo.loadCurrent();
    
    expect(loaded).not.toBeNull();
    expect(loaded.meta.sessionId).toBe('s1');
    expect(loaded.ecs).toBeDefined();
    expect(loaded.ecs.regionOwner[10]).toBe(5);
    expect(loaded.ecs.gold[10]).toBe(500);
    expect(loaded.ecs.regionOwner[11]).toBe(-1); // virgin
    
    // Ensure ecsSnapshot is cleaned up
    expect(loaded.ecsSnapshot).toBeUndefined();
  });
});

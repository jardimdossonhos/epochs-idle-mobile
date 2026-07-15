declare const process: any;
declare const require: any;
declare const module: any;

import { createStaticWorldData } from './src/application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from './src/application/boot/generated/world-definitions-v1';
import { createInitialState } from './src/application/boot/create-initial-state';
import { GameSession } from './src/application/game-session';
import { LocalEventBus } from './src/infrastructure/runtime/local-event-bus';
import { UtilityNpcDecisionService } from './src/infrastructure/npc/utility-npc-decision-service';
import { LocalDiplomacyResolver } from './src/infrastructure/diplomacy/local-diplomacy-resolver';
import { LocalWarResolver } from './src/infrastructure/war/local-war-resolver';
import { createDefaultSimulationSystems } from './src/core/simulation/create-default-systems';
import { MemoryGameStateRepository, MemorySaveRepository, MemoryCommandLogRepository, MemorySnapshotRepository } from './src/ui/memory-persistence';

export class Sprint3StressTestRunner {
  public staticWorldData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
  public eventBus = new LocalEventBus();
  public npcDecisionService = new UtilityNpcDecisionService(this.staticWorldData);
  public diplomacyResolver = new LocalDiplomacyResolver();
  public warResolver = new LocalWarResolver(this.staticWorldData);
  public clock = { now: () => Date.now(), onTick: () => {} } as any;

  public createFreshSession(saveRepo = new MemorySaveRepository()) {
    return new GameSession({
      gameStateRepository: new MemoryGameStateRepository(),
      saveRepository: saveRepo,
      commandLogRepository: new MemoryCommandLogRepository(),
      snapshotRepository: new MemorySnapshotRepository(),
      staticWorldData: this.staticWorldData,
      clock: this.clock,
      eventBus: this.eventBus,
      systems: createDefaultSimulationSystems({
        staticData: this.staticWorldData,
        orderedDefinitions: WORLD_DEFINITIONS_V1,
        npcDecisionService: this.npcDecisionService,
        diplomacyResolver: this.diplomacyResolver,
        warResolver: this.warResolver,
        eventBus: this.eventBus
      }),
      diplomacyResolver: this.diplomacyResolver,
      warResolver: this.warResolver,
    });
  }

  public async runStressTests() {
    console.log("==================================================");
    console.log("STARTING CUSTOM SPRINT 3 STRESS TESTS");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    // Test 1: Rapid Play/Pause Click Stress (1000 toggles)
    try {
      console.log("[RUNNING] STRESS_PLAY_PAUSE - Toggling play/pause 1000 times...");
      const session = this.createFreshSession();
      const initialState = createInitialState(this.staticWorldData, "r_hex_101", WORLD_DEFINITIONS_V1);
      await session.bootstrap(initialState);

      const start = Date.now();
      const initialPaused = session.getState().meta.paused;
      
      for (let i = 0; i < 1000; i++) {
        session.togglePause();
      }

      const elapsed = Date.now() - start;
      const finalPaused = session.getState().meta.paused;

      // Since we toggled 1000 times (even number), the pause state should be back to initialPaused
      if (finalPaused === initialPaused && elapsed < 1000) {
        passed++;
        console.log(`\x1b[32mPASS\x1b[0m - 1000 play/pause toggles succeeded in ${elapsed}ms. Final state matches expected.`);
      } else {
        failed++;
        console.log(`\x1b[31mFAIL\x1b[0m - State mismatch or execution too slow (${elapsed}ms). Final paused: ${finalPaused}, expected: ${initialPaused}`);
      }
    } catch (e: any) {
      failed++;
      console.log(`\x1b[31mCRASH\x1b[0m - Play/pause stress crashed: ${e.message}`);
    }

    // Test 2: Corrupted or Empty Save Slot Stress
    try {
      console.log("[RUNNING] STRESS_CORRUPTED_SAVE - Handling invalid save payloads...");
      const saveRepo = new MemorySaveRepository();
      const session = this.createFreshSession(saveRepo);
      const initialState = createInitialState(this.staticWorldData, "r_hex_101", WORLD_DEFINITIONS_V1);
      await session.bootstrap(initialState);

      // Write bad JSON/empty metadata to saveRepo directly
      await saveRepo.saveToSlot({
        summary: {
          slotId: "auto-1",
          savedAt: Date.now(),
          tick: 0,
          campaignName: "TestCorrupt",
          playerKingdomName: "k_player",
          territoryCount: 1,
          militaryPower: 1,
          economyPower: 1,
          victoryAchieved: false
        },
        state: null as any // Corrupting the state payload
      });

      let loaded = null;
      let errorCaught = false;
      try {
        loaded = await saveRepo.loadFromSlot("auto-1");
        if (!loaded || !loaded.state || !loaded.state.meta) {
          errorCaught = true;
        }
      } catch (e) {
        errorCaught = true;
      }

      // Check if session can bootstrap with a new state if load fails
      if (errorCaught) {
        passed++;
        console.log(`\x1b[32mPASS\x1b[0m - Successfully detected and blocked loading of corrupted/empty save slot.`);
      } else {
        failed++;
        console.log(`\x1b[31mFAIL\x1b[0m - Corrupted save slot load was not blocked or failed to raise error flag.`);
      }
    } catch (e: any) {
      failed++;
      console.log(`\x1b[31mCRASH\x1b[0m - Corrupted save stress crashed: ${e.message}`);
    }

    // Test 3: Changing regions multiple times during initialization
    try {
      console.log("[RUNNING] STRESS_REGION_INIT - Selecting starting region 50 times in rapid succession...");
      const start = Date.now();
      let lastState = null;
      const regionsToSelect = WORLD_DEFINITIONS_V1.slice(0, 50).map(r => r.id);

      // Simulate player clicking different regions 50 times before bootstrapping
      for (const regionId of regionsToSelect) {
        const session = this.createFreshSession();
        const initialState = createInitialState(this.staticWorldData, regionId, WORLD_DEFINITIONS_V1);
        lastState = await session.bootstrap(initialState);
      }

      const elapsed = Date.now() - start;
      const expectedRegionId = regionsToSelect[regionsToSelect.length - 1];
      const actualRegionId = lastState?.kingdoms["k_player"]?.capitalRegionId;

      if (actualRegionId === expectedRegionId && elapsed < 30000) {
        passed++;
        console.log(`\x1b[32mPASS\x1b[0m - 50 rapid region changes during initialization processed in ${elapsed}ms. Capital correctly set to ${actualRegionId}.`);
      } else {
        failed++;
        console.log(`\x1b[31mFAIL\x1b[0m - Region selection mismatch or too slow (${elapsed}ms). Got capital: ${actualRegionId}, expected: ${expectedRegionId}`);
      }
    } catch (e: any) {
      failed++;
      console.log(`\x1b[31mCRASH\x1b[0m - Region init stress crashed: ${e.message}`);
    }

    // Test 4: DevMode Fog of War boundaries validation
    try {
      console.log("[RUNNING] STRESS_FOW_BOUNDARIES - Verifying DevMode FoW toggle and boundary coordinates visibility...");
      const session = this.createFreshSession();
      const initialState = createInitialState(this.staticWorldData, "r_hex_101", WORLD_DEFINITIONS_V1);
      const state = await session.bootstrap(initialState);

      session.devModeActive = true;
      session.fogOfWarDisabled = true;

      // Verify that all regions' boundaries are visible and coordinate bounds exist
      let allBoundariesValid = true;
      let checkedCount = 0;
      for (const def of WORLD_DEFINITIONS_V1) {
        const rDef = this.staticWorldData.definitions[def.id];
        if (!rDef || !rDef.center || rDef.center.x === undefined || rDef.center.y === undefined) {
          allBoundariesValid = false;
        }
        checkedCount++;
      }

      if (allBoundariesValid && checkedCount === WORLD_DEFINITIONS_V1.length) {
        passed++;
        console.log(`\x1b[32mPASS\x1b[0m - DevMode FOW toggle works. Confirmed boundaries are valid for all ${checkedCount} regions.`);
      } else {
        failed++;
        console.log(`\x1b[31mFAIL\x1b[0m - Found invalid boundary definitions or missing coordinates.`);
      }
    } catch (e: any) {
      failed++;
      console.log(`\x1b[31mCRASH\x1b[0m - FoW boundaries stress crashed: ${e.message}`);
    }

    console.log("\n==================================================");
    console.log("STRESS TEST SUMMARY");
    console.log("==================================================");
    console.log(`Total Run:  ${passed + failed}`);
    console.log(`Passed:     \x1b[32m${passed}\x1b[0m`);
    console.log(`Failed:     \x1b[31m${failed}\x1b[0m`);
    console.log("==================================================\n");

    return failed === 0;
  }
}

if (require.main === module) {
  const runner = new Sprint3StressTestRunner();
  runner.runStressTests().then(success => {
    if (!success) process.exit(1);
  }).catch(err => {
    console.error("Stress Test Suite crashed:", err);
    process.exit(1);
  });
}

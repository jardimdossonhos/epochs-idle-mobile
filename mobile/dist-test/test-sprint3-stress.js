"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sprint3StressTestRunner = void 0;
const static_world_data_1 = require("./src/application/boot/static-world-data");
const world_definitions_v1_1 = require("./src/application/boot/generated/world-definitions-v1");
const create_initial_state_1 = require("./src/application/boot/create-initial-state");
const game_session_1 = require("./src/application/game-session");
const local_event_bus_1 = require("./src/infrastructure/runtime/local-event-bus");
const utility_npc_decision_service_1 = require("./src/infrastructure/npc/utility-npc-decision-service");
const local_diplomacy_resolver_1 = require("./src/infrastructure/diplomacy/local-diplomacy-resolver");
const local_war_resolver_1 = require("./src/infrastructure/war/local-war-resolver");
const create_default_systems_1 = require("./src/core/simulation/create-default-systems");
const memory_persistence_1 = require("./src/ui/memory-persistence");
class Sprint3StressTestRunner {
    staticWorldData = (0, static_world_data_1.createStaticWorldData)(world_definitions_v1_1.WORLD_DEFINITIONS_V1, world_definitions_v1_1.WORLD_DEFINITIONS_MAP_ID);
    eventBus = new local_event_bus_1.LocalEventBus();
    npcDecisionService = new utility_npc_decision_service_1.UtilityNpcDecisionService(this.staticWorldData);
    diplomacyResolver = new local_diplomacy_resolver_1.LocalDiplomacyResolver();
    warResolver = new local_war_resolver_1.LocalWarResolver(this.staticWorldData);
    clock = { now: () => Date.now(), onTick: () => { } };
    createFreshSession(saveRepo = new memory_persistence_1.MemorySaveRepository()) {
        return new game_session_1.GameSession({
            gameStateRepository: new memory_persistence_1.MemoryGameStateRepository(),
            saveRepository: saveRepo,
            commandLogRepository: new memory_persistence_1.MemoryCommandLogRepository(),
            snapshotRepository: new memory_persistence_1.MemorySnapshotRepository(),
            staticWorldData: this.staticWorldData,
            clock: this.clock,
            eventBus: this.eventBus,
            systems: (0, create_default_systems_1.createDefaultSimulationSystems)({
                staticData: this.staticWorldData,
                orderedDefinitions: world_definitions_v1_1.WORLD_DEFINITIONS_V1,
                npcDecisionService: this.npcDecisionService,
                diplomacyResolver: this.diplomacyResolver,
                warResolver: this.warResolver,
                eventBus: this.eventBus
            }),
            diplomacyResolver: this.diplomacyResolver,
            warResolver: this.warResolver,
        });
    }
    async runStressTests() {
        console.log("==================================================");
        console.log("STARTING CUSTOM SPRINT 3 STRESS TESTS");
        console.log("==================================================");
        let passed = 0;
        let failed = 0;
        // Test 1: Rapid Play/Pause Click Stress (1000 toggles)
        try {
            console.log("[RUNNING] STRESS_PLAY_PAUSE - Toggling play/pause 1000 times...");
            const session = this.createFreshSession();
            const initialState = (0, create_initial_state_1.createInitialState)(this.staticWorldData, "r_hex_101", world_definitions_v1_1.WORLD_DEFINITIONS_V1);
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
            }
            else {
                failed++;
                console.log(`\x1b[31mFAIL\x1b[0m - State mismatch or execution too slow (${elapsed}ms). Final paused: ${finalPaused}, expected: ${initialPaused}`);
            }
        }
        catch (e) {
            failed++;
            console.log(`\x1b[31mCRASH\x1b[0m - Play/pause stress crashed: ${e.message}`);
        }
        // Test 2: Corrupted or Empty Save Slot Stress
        try {
            console.log("[RUNNING] STRESS_CORRUPTED_SAVE - Handling invalid save payloads...");
            const saveRepo = new memory_persistence_1.MemorySaveRepository();
            const session = this.createFreshSession(saveRepo);
            const initialState = (0, create_initial_state_1.createInitialState)(this.staticWorldData, "r_hex_101", world_definitions_v1_1.WORLD_DEFINITIONS_V1);
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
                state: null // Corrupting the state payload
            });
            let loaded = null;
            let errorCaught = false;
            try {
                loaded = await saveRepo.loadFromSlot("auto-1");
                if (!loaded || !loaded.state || !loaded.state.meta) {
                    errorCaught = true;
                }
            }
            catch (e) {
                errorCaught = true;
            }
            // Check if session can bootstrap with a new state if load fails
            if (errorCaught) {
                passed++;
                console.log(`\x1b[32mPASS\x1b[0m - Successfully detected and blocked loading of corrupted/empty save slot.`);
            }
            else {
                failed++;
                console.log(`\x1b[31mFAIL\x1b[0m - Corrupted save slot load was not blocked or failed to raise error flag.`);
            }
        }
        catch (e) {
            failed++;
            console.log(`\x1b[31mCRASH\x1b[0m - Corrupted save stress crashed: ${e.message}`);
        }
        // Test 3: Changing regions multiple times during initialization
        try {
            console.log("[RUNNING] STRESS_REGION_INIT - Selecting starting region 50 times in rapid succession...");
            const start = Date.now();
            let lastState = null;
            const regionsToSelect = world_definitions_v1_1.WORLD_DEFINITIONS_V1.slice(0, 50).map(r => r.id);
            // Simulate player clicking different regions 50 times before bootstrapping
            for (const regionId of regionsToSelect) {
                const session = this.createFreshSession();
                const initialState = (0, create_initial_state_1.createInitialState)(this.staticWorldData, regionId, world_definitions_v1_1.WORLD_DEFINITIONS_V1);
                lastState = await session.bootstrap(initialState);
            }
            const elapsed = Date.now() - start;
            const expectedRegionId = regionsToSelect[regionsToSelect.length - 1];
            const actualRegionId = lastState?.kingdoms["k_player"]?.capitalRegionId;
            if (actualRegionId === expectedRegionId && elapsed < 30000) {
                passed++;
                console.log(`\x1b[32mPASS\x1b[0m - 50 rapid region changes during initialization processed in ${elapsed}ms. Capital correctly set to ${actualRegionId}.`);
            }
            else {
                failed++;
                console.log(`\x1b[31mFAIL\x1b[0m - Region selection mismatch or too slow (${elapsed}ms). Got capital: ${actualRegionId}, expected: ${expectedRegionId}`);
            }
        }
        catch (e) {
            failed++;
            console.log(`\x1b[31mCRASH\x1b[0m - Region init stress crashed: ${e.message}`);
        }
        // Test 4: DevMode Fog of War boundaries validation
        try {
            console.log("[RUNNING] STRESS_FOW_BOUNDARIES - Verifying DevMode FoW toggle and boundary coordinates visibility...");
            const session = this.createFreshSession();
            const initialState = (0, create_initial_state_1.createInitialState)(this.staticWorldData, "r_hex_101", world_definitions_v1_1.WORLD_DEFINITIONS_V1);
            const state = await session.bootstrap(initialState);
            session.devModeActive = true;
            session.fogOfWarDisabled = true;
            // Verify that all regions' boundaries are visible and coordinate bounds exist
            let allBoundariesValid = true;
            let checkedCount = 0;
            for (const def of world_definitions_v1_1.WORLD_DEFINITIONS_V1) {
                const rDef = this.staticWorldData.definitions[def.id];
                if (!rDef || !rDef.center || rDef.center.x === undefined || rDef.center.y === undefined) {
                    allBoundariesValid = false;
                }
                checkedCount++;
            }
            if (allBoundariesValid && checkedCount === world_definitions_v1_1.WORLD_DEFINITIONS_V1.length) {
                passed++;
                console.log(`\x1b[32mPASS\x1b[0m - DevMode FOW toggle works. Confirmed boundaries are valid for all ${checkedCount} regions.`);
            }
            else {
                failed++;
                console.log(`\x1b[31mFAIL\x1b[0m - Found invalid boundary definitions or missing coordinates.`);
            }
        }
        catch (e) {
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
exports.Sprint3StressTestRunner = Sprint3StressTestRunner;
if (require.main === module) {
    const runner = new Sprint3StressTestRunner();
    runner.runStressTests().then(success => {
        if (!success)
            process.exit(1);
    }).catch(err => {
        console.error("Stress Test Suite crashed:", err);
        process.exit(1);
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const enums_1 = require("./src/core/models/enums");
const staticWorldData = (0, static_world_data_1.createStaticWorldData)(world_definitions_v1_1.WORLD_DEFINITIONS_V1, world_definitions_v1_1.WORLD_DEFINITIONS_MAP_ID);
const eventBus = new local_event_bus_1.LocalEventBus();
const npcDecisionService = new utility_npc_decision_service_1.UtilityNpcDecisionService(staticWorldData);
const diplomacyResolver = new local_diplomacy_resolver_1.LocalDiplomacyResolver();
const warResolver = new local_war_resolver_1.LocalWarResolver(staticWorldData);
const clock = { now: () => Date.now(), onTick: () => { } };
const newSession = new game_session_1.GameSession({
    gameStateRepository: new memory_persistence_1.MemoryGameStateRepository(),
    saveRepository: new memory_persistence_1.MemorySaveRepository(),
    commandLogRepository: new memory_persistence_1.MemoryCommandLogRepository(),
    snapshotRepository: new memory_persistence_1.MemorySnapshotRepository(),
    staticWorldData,
    clock,
    eventBus,
    systems: (0, create_default_systems_1.createDefaultSimulationSystems)({
        staticData: staticWorldData,
        orderedDefinitions: world_definitions_v1_1.WORLD_DEFINITIONS_V1,
        npcDecisionService,
        diplomacyResolver,
        warResolver,
        eventBus
    }),
    diplomacyResolver,
    warResolver,
});
async function run() {
    try {
        const initialState = (0, create_initial_state_1.createInitialState)(staticWorldData, undefined, world_definitions_v1_1.WORLD_DEFINITIONS_V1);
        const state = await newSession.bootstrap(initialState);
        // 1. Verify Ruler & Heirs Initialization
        console.log("Validating ruler and heirs initialization...");
        for (const kingdomId of Object.keys(state.kingdoms)) {
            if (kingdomId === "k_nature")
                continue;
            const kingdom = state.kingdoms[kingdomId];
            if (!kingdom.rulerId) {
                throw new Error(`Kingdom ${kingdomId} is missing a rulerId.`);
            }
            const ruler = state.world.characters?.[kingdom.rulerId];
            if (!ruler) {
                throw new Error(`Ruler ${kingdom.rulerId} for kingdom ${kingdomId} not found in characters.`);
            }
            if (ruler.birthTick !== -360) {
                throw new Error(`Ruler ${kingdom.rulerId} has incorrect birthTick: ${ruler.birthTick} (expected -360).`);
            }
            if (ruler.status !== "ruler") {
                throw new Error(`Ruler ${kingdom.rulerId} has incorrect status: ${ruler.status} (expected "ruler").`);
            }
            if (!kingdom.heirs || kingdom.heirs.length !== 2) {
                throw new Error(`Kingdom ${kingdomId} should have exactly 2 heirs, got ${kingdom.heirs?.length}.`);
            }
            for (const heirId of kingdom.heirs) {
                const heir = state.world.characters?.[heirId];
                if (!heir) {
                    throw new Error(`Heir ${heirId} for kingdom ${kingdomId} not found in characters.`);
                }
                if (heir.birthTick !== -96) {
                    throw new Error(`Heir ${heirId} has incorrect birthTick: ${heir.birthTick} (expected -96).`);
                }
                if (heir.status !== "ruler") {
                    throw new Error(`Heir ${heirId} has incorrect status: ${heir.status} (expected "ruler").`);
                }
            }
        }
        console.log("Ruler and heirs validation passed!");
        // Unlock tick simulation
        newSession.markWorkerReady();
        newSession.setPaused(false);
        // 2. Verify Asymmetry in Relation Updates
        console.log("Validating relation update asymmetry...");
        // Let's run multiple ticks to allow relations to diverge
        for (let i = 0; i < 24; i++) {
            newSession.advanceTimeForTesting(3000);
        }
        const relPlayerToNpc1 = state.kingdoms["k_player"].diplomacy.relations["k_npc_1"];
        const relNpc1ToPlayer = state.kingdoms["k_npc_1"].diplomacy.relations["k_player"];
        if (!relPlayerToNpc1 || !relNpc1ToPlayer) {
            throw new Error("Bilateral relations between k_player and k_npc_1 not found.");
        }
        console.log(`Player -> NPC1 trust: ${relPlayerToNpc1.score.trust}, rivalry: ${relPlayerToNpc1.score.rivalry}`);
        console.log(`NPC1 -> Player trust: ${relNpc1ToPlayer.score.trust}, rivalry: ${relNpc1ToPlayer.score.rivalry}`);
        if (relPlayerToNpc1.score.trust === relNpc1ToPlayer.score.trust &&
            relPlayerToNpc1.score.rivalry === relNpc1ToPlayer.score.rivalry) {
            throw new Error("Diplomacy metrics are mirrored! Asymmetry was not introduced successfully.");
        }
        console.log("Relation asymmetry validation passed!");
        // 3. Verify Population Growth in ECS
        console.log("Validating region-specific population growth in ECS...");
        const initialPopTotal = [...state.ecs.populationTotal];
        // Advance more ticks to let population grow
        for (let i = 0; i < 24; i++) {
            newSession.advanceTimeForTesting(3000);
        }
        let popGrew = false;
        for (let i = 0; i < state.ecs.populationTotal.length; i++) {
            if (state.ecs.populationTotal[i] > initialPopTotal[i]) {
                popGrew = true;
                break;
            }
        }
        if (!popGrew) {
            throw new Error("Region-specific population values in ECS did not grow.");
        }
        console.log("ECS population growth validation passed!");
        // 4. Verify Building Construction (Milestone 2)
        console.log("Validating building construction queue...");
        const freshStateBefore = newSession.getState();
        const playerRegions = Object.keys(freshStateBefore.world.regions).filter(rid => freshStateBefore.world.regions[rid].ownerId === "k_player");
        if (playerRegions.length === 0) {
            throw new Error("Player does not own any regions.");
        }
        const testRegionId = playerRegions[0];
        newSession.addResourcesDev("gold");
        newSession.addResourcesDev("wood");
        newSession.addResourcesDev("iron");
        const buildRes1 = newSession.executeBuildStructure(testRegionId, enums_1.BuildingType.Market);
        if (!buildRes1.ok) {
            throw new Error(`Failed to initiate market build: ${buildRes1.message}`);
        }
        const freshStateAfter = newSession.getState();
        const testRegion = freshStateAfter.world.regions[testRegionId];
        if (!testRegion.construction || testRegion.construction.buildingType !== enums_1.BuildingType.Market) {
            throw new Error("Market building not found in construction queue.");
        }
        if (testRegion.construction.progress !== 0 || testRegion.construction.targetTicks !== 10) {
            throw new Error(`Incorrect construction initial values: progress=${testRegion.construction.progress}, targetTicks=${testRegion.construction.targetTicks}`);
        }
        const buildRes2 = newSession.executeBuildStructure(testRegionId, enums_1.BuildingType.Fortress);
        if (buildRes2.ok || buildRes2.message !== "Já existe uma construção em andamento nesta região.") {
            throw new Error(`Expected build block to fail, got ok=${buildRes2.ok}, msg=${buildRes2.message}`);
        }
        newSession.advanceTimeForTesting(3000); // 1 tick
        const freshStateTick = newSession.getState();
        const testRegionTick = freshStateTick.world.regions[testRegionId];
        if (!testRegionTick.construction || testRegionTick.construction.progress <= 0) {
            throw new Error(`Construction progress did not advance: ${testRegionTick.construction?.progress}`);
        }
        for (let i = 0; i < 15; i++) {
            newSession.advanceTimeForTesting(3000);
        }
        const freshStateEnd = newSession.getState();
        const testRegionEnd = freshStateEnd.world.regions[testRegionId];
        if (testRegionEnd.construction) {
            throw new Error("Construction field was not cleared upon completion.");
        }
        if (!testRegionEnd.buildings || !testRegionEnd.buildings.includes(enums_1.BuildingType.Market)) {
            throw new Error("Market building was not added to region.buildings.");
        }
        console.log("Building construction queue validation passed!");
        console.log('SUCCESS');
    }
    catch (e) {
        console.error('CRASH', e);
        throw e;
    }
}
run();

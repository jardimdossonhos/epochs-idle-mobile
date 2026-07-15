"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultSimulationSystems = createDefaultSimulationSystems;
const administration_system_1 = require("./systems/administration-system");
const council_system_1 = require("./systems/council-system");
const automation_system_1 = require("./systems/automation-system");
const disaster_system_1 = require("./systems/disaster-system");
const event_chain_system_1 = require("./systems/event-chain-system");
const diplomacy_system_1 = require("./systems/diplomacy-system");
const migration_system_1 = require("./systems/migration-system");
const economy_system_1 = require("./systems/economy-system");
const event_log_system_1 = require("./systems/event-log-system");
const military_system_1 = require("./systems/military-system"); // Bypass: Força o recálculo do cache TypeScript
const npc_decision_system_1 = require("./systems/npc-decision-system");
const population_system_1 = require("./systems/population-system");
const religion_system_1 = require("./systems/religion-system");
const technology_system_1 = require("./systems/technology-system");
const victory_system_1 = require("./systems/victory-system");
const war_system_1 = require("./systems/war-system");
const world_activity_system_1 = require("./systems/world-activity-system");
const character_system_1 = require("./systems/character-system");
function createDefaultSimulationSystems(services) {
    return [
        (0, migration_system_1.createMigrationSystem)(services.staticData, services.orderedDefinitions),
        (0, disaster_system_1.createDisasterSystem)(),
        (0, event_chain_system_1.createEventChainSystem)(),
        (0, automation_system_1.createAutomationSystem)(services.orderedDefinitions),
        (0, economy_system_1.createEconomySystem)(),
        (0, population_system_1.createPopulationSystem)(services.orderedDefinitions),
        (0, military_system_1.createMilitarySystem)(services.orderedDefinitions),
        (0, religion_system_1.createReligionSystem)(),
        (0, administration_system_1.createAdministrationSystem)(),
        (0, council_system_1.createCouncilSystem)(),
        (0, technology_system_1.createTechnologySystem)(),
        (0, diplomacy_system_1.createDiplomacySystem)(services.diplomacyResolver),
        (0, npc_decision_system_1.createNpcDecisionSystem)(services.npcDecisionService, services.diplomacyResolver, services.warResolver),
        (0, war_system_1.createWarSystem)(services.warResolver),
        (0, world_activity_system_1.createWorldActivitySystem)(),
        (0, victory_system_1.createVictorySystem)(),
        (0, event_log_system_1.createEventLogSystem)(),
        (0, character_system_1.createCharacterSystem)()
    ];
}

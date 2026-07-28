import type { DiplomacyResolver, INpcDecisionService, WarResolver } from "../contracts/services";
import type { StaticWorldData } from "../models/static-world-data";
import type { RegionDefinition } from "../models/world";
import type { SimulationSystem } from "./tick-pipeline";
import { createAdministrationSystem } from "./systems/administration-system";
import { createCouncilSystem } from "./systems/council-system";
import { createAutomationSystem } from "./systems/automation-system";
import { createDisasterSystem } from "./systems/disaster-system";
import { createEventChainSystem } from "./systems/event-chain-system";
import { createDiplomacySystem } from "./systems/diplomacy-system";
import { createMigrationSystem } from "./systems/migration-system";
import { createEconomySystem } from "./systems/economy-system";
import { createEventLogSystem } from "./systems/event-log-system";
import { createMilitarySystem } from "./systems/military-system"; // Bypass: Força o recálculo do cache TypeScript
import { createNpcDecisionSystem } from "./systems/npc-decision-system";
import { createPopulationSystem } from "./systems/population-system";
import { createReligionSystem } from "./systems/religion-system";
import { createTechnologySystem } from "./systems/technology-system";
import { createVictorySystem } from "./systems/victory-system";
import { createWarSystem } from "./systems/war-system";
import { createWorldActivitySystem } from "./systems/world-activity-system";
import { createCharacterSystem } from "./systems/character-system";

export interface SimulationServices {
  npcDecisionService: INpcDecisionService;
  diplomacyResolver: DiplomacyResolver;
  warResolver: WarResolver;
  eventBus: { publish: (event: any) => void };
  staticData: StaticWorldData;
  orderedDefinitions: RegionDefinition[];
}

export function createDefaultSimulationSystems(services: SimulationServices): SimulationSystem[] {
  return [
    createMigrationSystem(services.staticData, services.orderedDefinitions),
    createDisasterSystem(),
    createEventChainSystem(),
    createAutomationSystem(services.orderedDefinitions),
    createEconomySystem(),
    createPopulationSystem(),
    createMilitarySystem(services.orderedDefinitions),
    createReligionSystem(),
    createAdministrationSystem(),
    createCouncilSystem(),
    createTechnologySystem(),
    createDiplomacySystem(services.diplomacyResolver),
    createNpcDecisionSystem(services.npcDecisionService, services.diplomacyResolver, services.warResolver),
    createWarSystem(services.warResolver),
    createWorldActivitySystem(),
    createVictorySystem(),
    createEventLogSystem(),
    createCharacterSystem()
  ];
}

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
import { createMilitarySystem } from "./systems/military-system";
import { createNpcDecisionSystem } from "./systems/npc-decision-system";
import { createPopulationSystem } from "./systems/population-system";
import { createReligionSystem } from "./systems/religion-system";
import { createTechnologySystem } from "./systems/technology-system";
import { createVictorySystem } from "./systems/victory-system";
import { createWarSystem } from "./systems/war-system";
import { createWorldActivitySystem } from "./systems/world-activity-system";
import { createCharacterSystem } from "./systems/character-system";
import { createNavigationSystem } from "./navigation/navigation-system";
import { SpatialGridSystem } from "./spatial/spatial-grid-system";
import { LogisticsSystem } from "./systems/logistics-system";
import { CombatSystem } from "./systems/combat-system";
import { ConquestSystem } from "./systems/conquest-system";
import { ReinforcementSystem } from "./systems/reinforcement-system";
import { ActionExecutionSystem } from "./systems/action-execution-system";
import { RenderSyncSystem } from "./render/render-sync-system";

export interface SimulationServices {
  npcDecisionService: INpcDecisionService;
  diplomacyResolver: DiplomacyResolver;
  warResolver: WarResolver;
  eventBus: { publish: (event: any) => void };
  staticData: StaticWorldData;
  orderedDefinitions: RegionDefinition[];
}

export function createDefaultSimulationSystems(services: SimulationServices): SimulationSystem[] {
  const spatialGridSystem = new SpatialGridSystem();
  const navigationSystem = createNavigationSystem(spatialGridSystem);
  return [
    new ActionExecutionSystem(spatialGridSystem),
    new ReinforcementSystem(spatialGridSystem),
    createMigrationSystem(services.staticData, services.orderedDefinitions),
    createDisasterSystem(),
    createEventChainSystem(),
    createAutomationSystem(services.orderedDefinitions),
    createEconomySystem(),
    createPopulationSystem(services.orderedDefinitions),
    createMilitarySystem(services.orderedDefinitions),
    createReligionSystem(),
    createAdministrationSystem(),
    createCouncilSystem(),
    createTechnologySystem(),
    createDiplomacySystem(services.diplomacyResolver),
    createNpcDecisionSystem(services.npcDecisionService, services.diplomacyResolver, services.warResolver),
    new RenderSyncSystem(),
    createWarSystem(services.warResolver),
    createWorldActivitySystem(),
    createVictorySystem(),
    createEventLogSystem(),
    createCharacterSystem(),
    navigationSystem,
    new LogisticsSystem(spatialGridSystem),
    new CombatSystem(spatialGridSystem),
    new ConquestSystem(spatialGridSystem)
  ];
}









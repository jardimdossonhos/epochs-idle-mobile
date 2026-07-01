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

const staticWorldData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
const eventBus = new LocalEventBus();
const npcDecisionService = new UtilityNpcDecisionService(staticWorldData);
const diplomacyResolver = new LocalDiplomacyResolver();
const warResolver = new LocalWarResolver(staticWorldData);
const clock = { now: () => Date.now(), onTick: () => {} } as any;

const newSession = new GameSession({
  gameStateRepository: new MemoryGameStateRepository(),
  saveRepository: new MemorySaveRepository(),
  commandLogRepository: new MemoryCommandLogRepository(),
  snapshotRepository: new MemorySnapshotRepository(),
  staticWorldData,
  clock,
  eventBus,
  systems: createDefaultSimulationSystems({
    staticData: staticWorldData,
    orderedDefinitions: WORLD_DEFINITIONS_V1,
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
    const initialState = createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1);
    await newSession.bootstrap(initialState);
    console.log('SUCCESS');
  } catch(e) {
    console.error('CRASH', e);
  }
}
run();

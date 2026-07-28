import { LocalEventBus } from './src/infrastructure/runtime/local-event-bus';
import { UtilityNpcDecisionService } from './src/infrastructure/npc/utility-npc-decision-service';
import { LocalDiplomacyResolver } from './src/infrastructure/diplomacy/local-diplomacy-resolver';
import { LocalWarResolver } from './src/infrastructure/war/local-war-resolver';
import { GameSession } from './src/application/game-session';
import { MobileGameStateRepository, MobileSaveRepository } from './src/infrastructure/persistence/MobileGameStateRepository';

console.log('LocalEventBus:', typeof LocalEventBus);
console.log('UtilityNpcDecisionService:', typeof UtilityNpcDecisionService);
console.log('LocalDiplomacyResolver:', typeof LocalDiplomacyResolver);
console.log('LocalWarResolver:', typeof LocalWarResolver);
console.log('GameSession:', typeof GameSession);
console.log('MobileGameStateRepository:', typeof MobileGameStateRepository);
console.log('MobileSaveRepository:', typeof MobileSaveRepository);

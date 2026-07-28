require('ts-node').register({ transpileOnly: true });
const { LocalEventBus } = require('./src/infrastructure/runtime/local-event-bus');
const { UtilityNpcDecisionService } = require('./src/infrastructure/npc/utility-npc-decision-service');
const { LocalDiplomacyResolver } = require('./src/infrastructure/diplomacy/local-diplomacy-resolver');
const { LocalWarResolver } = require('./src/infrastructure/war/local-war-resolver');
const { GameSession } = require('./src/application/game-session');
const { MobileGameStateRepository, MobileSaveRepository } = require('./src/infrastructure/persistence/MobileGameStateRepository');

console.log('LocalEventBus:', typeof LocalEventBus);
console.log('UtilityNpcDecisionService:', typeof UtilityNpcDecisionService);
console.log('LocalDiplomacyResolver:', typeof LocalDiplomacyResolver);
console.log('LocalWarResolver:', typeof LocalWarResolver);
console.log('GameSession:', typeof GameSession);
console.log('MobileGameStateRepository:', typeof MobileGameStateRepository);
console.log('MobileSaveRepository:', typeof MobileSaveRepository);

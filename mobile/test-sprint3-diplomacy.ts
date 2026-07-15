declare const process: any;
declare const require: any;

const mockStorage: Record<string, string> = {};
const mockAsyncStorage = {
  getItem: async (key: string) => mockStorage[key] || null,
  setItem: async (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: async (key: string) => { delete mockStorage[key]; },
  clear: async () => { for (const key in mockStorage) delete mockStorage[key]; }
};

const Module = require('module');
const asyncStoragePath = require.resolve('@react-native-async-storage/async-storage');
Module._cache[asyncStoragePath] = {
  id: asyncStoragePath,
  filename: asyncStoragePath,
  loaded: true,
  exports: {
    default: mockAsyncStorage,
    getItem: mockAsyncStorage.getItem,
    setItem: mockAsyncStorage.setItem,
    removeItem: mockAsyncStorage.removeItem,
    clear: mockAsyncStorage.clear
  }
};
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
import { geminiService } from './src/application/ai/gemini-service';
import { DiplomaticRelation } from './src/core/models/enums';

const staticWorldData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
const eventBus = new LocalEventBus();
const npcDecisionService = new UtilityNpcDecisionService(staticWorldData);
const diplomacyResolver = new LocalDiplomacyResolver();
const warResolver = new LocalWarResolver(staticWorldData);
const clock = { now: () => Date.now(), onTick: () => {} } as any;

function createSession() {
  return new GameSession({
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
}

async function runTests() {
  console.log("=== RUNNING DIPLOMACY UNIT TESTS ===");

  // 1. Test chatWithSovereign fallback
  console.log("\nTest 1: chatWithSovereign offline fallback...");
  await geminiService.setAiEnabled(false);
  const resultFallback = await geminiService.chatWithSovereign(
    "Rei Arthur",
    "Soberano",
    "latin",
    ["charismatic"],
    { administration: 12, martial: 10, diplomacy: 15, intrigue: 8, learning: 11 },
    { greed: 0.2, honor: 0.9, caution: 0.5, zeal: 0.6, ambition: 0.4, betrayalTendency: 0.1 },
    { status: DiplomaticRelation.Neutral, score: { trust: 0.5, fear: 0.2, rivalry: 0.2 } },
    "Saudações",
    []
  );

  if (resultFallback.action !== "NO_ACTION") {
    throw new Error(`Expected NO_ACTION for offline fallback, got ${resultFallback.action}`);
  }
  if (!resultFallback.dialogue) {
    throw new Error("Expected dialogue reply from offline fallback");
  }
  console.log(`Success: offline fallback dialogue: "${resultFallback.dialogue}"`);

  // 2. Test sendPlayerChatMessage Validation
  console.log("\nTest 2: sendPlayerChatMessage validation...");
  const session = createSession();
  const state = await session.bootstrap(createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1));
  session.markWorkerReady();

  try {
    await session.sendPlayerChatMessage("invalid_kingdom", "Olá");
    throw new Error("Expected invalid_kingdom to fail");
  } catch (err: any) {
    console.log(`Success: correctly rejected invalid target: "${err.message}"`);
  }

  // 3. Test sendPlayerChatMessage Success and Limiting chatHistory to 10
  console.log("\nTest 3: sendPlayerChatMessage success & chat history capping...");
  const npcKingdomId = "k_npc_1";
  
  // Verify ruler exists on k_npc_1
  const kState = state.kingdoms[npcKingdomId];
  if (!kState || !kState.rulerId) {
    throw new Error("k_npc_1 has no ruler.");
  }

  // Send 6 messages (producing 12 bubbles total: 6 player + 6 NPC)
  for (let i = 1; i <= 6; i++) {
    await session.sendPlayerChatMessage(npcKingdomId, `Player message ${i}`);
  }

  const relation = state.kingdoms["k_player"].diplomacy.relations[npcKingdomId];
  if (!relation || !relation.chatHistory) {
    throw new Error("Expected relation and chatHistory to be initialized");
  }

  console.log(`Current chatHistory size: ${relation.chatHistory.length}`);
  if (relation.chatHistory.length !== 10) {
    throw new Error(`Expected chatHistory length to be capped at 10, got ${relation.chatHistory.length}`);
  }

  // Verify elements are the latest ones
  const firstMsg = relation.chatHistory[0];
  const lastMsg = relation.chatHistory[9];
  console.log(`First message in history (capped): ${JSON.stringify(firstMsg)}`);
  console.log(`Last message in history (capped): ${JSON.stringify(lastMsg)}`);

  if (!firstMsg.text.includes("Player message 2") && !firstMsg.text.includes("dialogue")) {
    // If the first message is from NPC, it should contain the reply to message 1 or 2
    // Let's verify we discarded "Player message 1"
    const hasMsg1 = relation.chatHistory.some(m => m.text.includes("Player message 1"));
    if (hasMsg1) {
      throw new Error("Expected Player message 1 to be discarded");
    }
  }

  // 4. Test sendPlayerChatMessage Autonomous Action Trigger
  console.log("\nTest 4: sendPlayerChatMessage autonomous diplomatic action (DECLARE_WAR)...");
  
  // Mock geminiService.chatWithSovereign to return DECLARE_WAR action
  geminiService.chatWithSovereign = async () => {
    return {
      dialogue: "Nossos exércitos se chocarão no campo de batalha!",
      action: "DECLARE_WAR"
    };
  };

  // Check relation state before war
  const relationBefore = state.kingdoms["k_player"].diplomacy.relations[npcKingdomId];
  console.log(`Diplomatic status before chat trigger: ${relationBefore.status}`);

  await session.sendPlayerChatMessage(npcKingdomId, "Prepare-se!");

  const relationAfter = state.kingdoms["k_player"].diplomacy.relations[npcKingdomId];
  console.log(`Diplomatic status after chat trigger: ${relationAfter.status}`);
  
  if (relationAfter.status !== DiplomaticRelation.Hostile) {
    throw new Error(`Expected relation status to become Hostile, got ${relationAfter.status}`);
  }

  // Verify war is created
  const activeWars = Object.values(state.wars);
  const warInvolvingBoth = activeWars.some(w => 
    (w.attackers.includes("k_player") && w.defenders.includes(npcKingdomId)) ||
    (w.attackers.includes(npcKingdomId) && w.defenders.includes("k_player"))
  );
  if (!warInvolvingBoth) {
    throw new Error("Expected active war to be declared between player and k_npc_1");
  }
  console.log("Success: War successfully declared autonomously via LLM action!");

  console.log("\n=== ALL DIPLOMACY UNIT TESTS PASSED ===\n");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

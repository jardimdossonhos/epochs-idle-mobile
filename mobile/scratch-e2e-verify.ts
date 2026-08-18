import { createInitialState } from './src/application/boot/create-initial-state';
import { createStaticWorldData } from './src/application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1 } from './src/application/boot/generated/world-definitions-v1';
import { GameSession } from './src/application/game-session';
import { createDefaultSimulationSystems } from './src/core/simulation/create-default-systems';
import { getRegionIndex } from './src/core/simulation/systems/utils';
import { BuildingType, ResourceType } from './src/core/models/enums';

async function verifyInvariants() {
  const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1);
  const initialState = createInitialState(staticData);
  
  const playerKingdom = Object.values(initialState.kingdoms).find((k: any) => k.isPlayer) as any;
  if (!playerKingdom) throw new Error("No player kingdom");
  
  const capitalRegionId = playerKingdom.capitalRegionId;
  const canonicalIndex = getRegionIndex(capitalRegionId);
  
  console.log(`[BOOTSTRAP] Region ID: ${capitalRegionId}`);
  console.log(`[BOOTSTRAP] Canonical Index: ${canonicalIndex}`);
  
  const bootstrapOwner = initialState.ecs!.regionOwner[canonicalIndex];
  console.log(`[BOOTSTRAP] ecs.regionOwner[${canonicalIndex}] = ${bootstrapOwner} (Expected: 1)`);
  
  const session = new GameSession({
    systems: createDefaultSimulationSystems(),
    staticWorldData: staticData,
    mapId: "v1"
  });
  
  session.bootstrap(initialState);
  const engineState = session.getState();
  
  const engineCapital = engineState.kingdoms[playerKingdom.id].capitalRegionId;
  const engineCanonicalIndex = getRegionIndex(engineCapital);
  console.log(`[ENGINE] Session state capital index: ${engineCanonicalIndex}`);
  
  const engineOwner = engineState.ecs!.regionOwner[engineCanonicalIndex];
  console.log(`[ENGINE] Session state ecs.regionOwner[${engineCanonicalIndex}] = ${engineOwner} (Expected: 1)`);
  
  console.log(`[ENGINE] Advancing time to verify Economy System...`);
  
  session.advanceTimeForTesting(1000);
  
  const advancedState = session.getState();
  const playerEconomy = advancedState.kingdoms[playerKingdom.id].economy;
  const netGold = playerEconomy.netIncomePerTick.gold;
  const netFood = playerEconomy.netIncomePerTick.food;
  
  console.log(`[ECONOMY] Net Gold per Tick: ${netGold} (Expected > 0)`);
  console.log(`[ECONOMY] Net Food per Tick: ${netFood} (Expected > 0)`);
  console.log(`[ECONOMY] Total ECS Stock (Gold): ${(session as any).getKingdomTotalEcsStock(advancedState, playerKingdom.id).gold}`);
  
  console.log(`[CONSTRUCTION] Attempting to build in capital (${capitalRegionId})...`);
  session.enqueueCommand({
    type: "build",
    kingdomId: playerKingdom.id,
    targetId: capitalRegionId,
    targetType: "region",
    payload: { buildingType: BuildingType.Market }
  });
  session.advanceTimeForTesting(1000); // flush command
  
  const finalState = session.getState();
  const buildingsHex = finalState.ecs!.hexStructures[canonicalIndex];
  console.log(`[CONSTRUCTION] ECS hexStructures[${canonicalIndex}] = ${buildingsHex}`);
  // Has building? (1 << BuildingType.Market) => 1 << 0 => 1
  if ((buildingsHex & (1 << BuildingType.Market)) !== 0) {
    console.log(`[CONSTRUCTION] SUCCESS! Building accepted by the Command Pipeline.`);
  } else {
    console.log(`[CONSTRUCTION] FAILED! Building was rejected.`);
  }

  console.log(`[DIPLOMACY] Getting player capital...`);
  const capIndex = (session as any).getKingdomCapitalIndex(playerKingdom);
  console.log(`[DIPLOMACY] Capital Index returned: ${capIndex} (Expected: ${canonicalIndex})`);
}

verifyInvariants().catch(console.error);

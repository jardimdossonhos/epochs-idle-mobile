import { EcsState } from "../../core/models/game-state";

export function createVirginEcs(totalEntities: number): EcsState {
  const MAX_FACTIONS = 256;
  return {
      gold: new Float64Array(totalEntities),
      food: new Float64Array(totalEntities),
      wood: new Float64Array(totalEntities),
      iron: new Float64Array(totalEntities),
      faith: new Float64Array(totalEntities),
      legitimacy: new Float64Array(totalEntities),
      populationTotal: new Float64Array(totalEntities),
      populationGrowthRate: new Float64Array(totalEntities),
      manpower: new Float64Array(totalEntities),
      factionCasualties: new Int32Array(MAX_FACTIONS),
      factionManpowerReserve: new Float32Array(MAX_FACTIONS).fill(100),
      accumulatedSimulatedTime: 0,
      conquestEpoch: 0,
      regionManpowerYield: new Float32Array(totalEntities).fill(0.1),
      regionManpowerCap: new Float32Array(totalEntities).fill(50),
      factionManpowerCap: new Float32Array(MAX_FACTIONS),
      regionGoldYield: new Float32Array(totalEntities).fill(0.5),
      factionGoldBalance: new Float32Array(MAX_FACTIONS).fill(100),
      cmdHead: 0,
      cmdTail: 0,
      cmdType: new Int32Array(2048),
      cmdFaction: new Int32Array(2048),
      cmdArg0: new Int32Array(2048),
      cmdArg1: new Int32Array(2048),
      regionOwner: new Int32Array(totalEntities).fill(-1),
      regionCaptureProgress: new Float32Array(totalEntities),
      regionSupplyCapacity: new Float32Array(totalEntities).fill(1000),
      regionCurrentSupply: new Float32Array(totalEntities).fill(1000),
      factionResources: new Float32Array(MAX_FACTIONS * 3).fill(100),
      hexStructures: new Int32Array(totalEntities),
      combatEventHead: 0,
      combatEventTail: 0,
      combatEventX: new Float32Array(1024),
      combatEventY: new Float32Array(1024),
      combatEventTs: new Float32Array(1024),
      visibilityMask: new Uint8Array(totalEntities),
      regionDominantFaith: new Int32Array(totalEntities),
      regionDominantShare: new Float32Array(totalEntities).fill(1.0),
      regionMinorityFaith: new Int32Array(totalEntities).fill(-1),
      regionMinorityShare: new Float32Array(totalEntities),
      regionFaithUnrest: new Float32Array(totalEntities),
      factionPopulation: new Float32Array(MAX_FACTIONS),
      factionRegions: new Int32Array(MAX_FACTIONS),
      factionPopulationGrowth: new Float32Array(MAX_FACTIONS),
      factionPeasants: new Float32Array(MAX_FACTIONS).fill(0.8),
      factionNobles: new Float32Array(MAX_FACTIONS).fill(0.05),
      factionClergy: new Float32Array(MAX_FACTIONS).fill(0.05),
      factionSoldiers: new Float32Array(MAX_FACTIONS).fill(0.05),
      factionMerchants: new Float32Array(MAX_FACTIONS).fill(0.05),
      factionPopUnrest: new Float32Array(MAX_FACTIONS)
  };
}

export function assertEcsRuntimeIntegrity(ecs: any): boolean {
  if (!ecs) throw new Error("ECS is null or undefined");

  const TOTAL_HEXES = 320000;
  const MAX_FACTIONS = 256;
  const CMD_BUFFER = 2048;
  const COMBAT_BUFFER = 1024;

  const fields = [
    { name: "gold", type: Float64Array, len: TOTAL_HEXES },
    { name: "food", type: Float64Array, len: TOTAL_HEXES },
    { name: "wood", type: Float64Array, len: TOTAL_HEXES },
    { name: "iron", type: Float64Array, len: TOTAL_HEXES },
    { name: "faith", type: Float64Array, len: TOTAL_HEXES },
    { name: "legitimacy", type: Float64Array, len: TOTAL_HEXES },
    { name: "populationTotal", type: Float64Array, len: TOTAL_HEXES },
    { name: "populationGrowthRate", type: Float64Array, len: TOTAL_HEXES },
    { name: "manpower", type: Float64Array, len: TOTAL_HEXES },
    { name: "factionCasualties", type: Int32Array, len: MAX_FACTIONS },
    { name: "factionManpowerReserve", type: Float32Array, len: MAX_FACTIONS },
    { name: "regionManpowerYield", type: Float32Array, len: TOTAL_HEXES },
    { name: "regionManpowerCap", type: Float32Array, len: TOTAL_HEXES },
    { name: "factionManpowerCap", type: Float32Array, len: MAX_FACTIONS },
    { name: "regionGoldYield", type: Float32Array, len: TOTAL_HEXES },
    { name: "factionGoldBalance", type: Float32Array, len: MAX_FACTIONS },
    { name: "cmdType", type: Int32Array, len: CMD_BUFFER },
    { name: "cmdFaction", type: Int32Array, len: CMD_BUFFER },
    { name: "cmdArg0", type: Int32Array, len: CMD_BUFFER },
    { name: "cmdArg1", type: Int32Array, len: CMD_BUFFER },
    { name: "regionOwner", type: Int32Array, len: TOTAL_HEXES },
    { name: "regionCaptureProgress", type: Float32Array, len: TOTAL_HEXES },
    { name: "regionSupplyCapacity", type: Float32Array, len: TOTAL_HEXES },
    { name: "regionCurrentSupply", type: Float32Array, len: TOTAL_HEXES },
    { name: "factionResources", type: Float32Array, len: MAX_FACTIONS * 3 },
    { name: "hexStructures", type: Int32Array, len: TOTAL_HEXES },
    { name: "combatEventX", type: Float32Array, len: COMBAT_BUFFER },
    { name: "combatEventY", type: Float32Array, len: COMBAT_BUFFER },
    { name: "combatEventTs", type: Float32Array, len: COMBAT_BUFFER },
    { name: "visibilityMask", type: Uint8Array, len: TOTAL_HEXES },
    { name: "regionDominantFaith", type: Int32Array, len: TOTAL_HEXES },
    { name: "regionDominantShare", type: Float32Array, len: TOTAL_HEXES },
    { name: "regionMinorityFaith", type: Int32Array, len: TOTAL_HEXES },
    { name: "regionMinorityShare", type: Float32Array, len: TOTAL_HEXES },
    { name: "regionFaithUnrest", type: Float32Array, len: TOTAL_HEXES },
    { name: "factionPopulation", type: Float32Array, len: MAX_FACTIONS },
    { name: "factionRegions", type: Int32Array, len: MAX_FACTIONS },
    { name: "factionPopulationGrowth", type: Float32Array, len: MAX_FACTIONS },
    { name: "factionPeasants", type: Float32Array, len: MAX_FACTIONS },
    { name: "factionNobles", type: Float32Array, len: MAX_FACTIONS },
    { name: "factionClergy", type: Float32Array, len: MAX_FACTIONS },
    { name: "factionSoldiers", type: Float32Array, len: MAX_FACTIONS },
    { name: "factionMerchants", type: Float32Array, len: MAX_FACTIONS },
    { name: "factionPopUnrest", type: Float32Array, len: MAX_FACTIONS }
  ];

  for (const field of fields) {
    const val = ecs[field.name];
    if (!val) {
      throw new Error("ECS integrity fail:  is undefined");
    }
    if (!(val instanceof field.type)) {
      throw new Error("ECS integrity fail:  is not instance of expected type");
    }
    if (typeof val.fill !== "function") {
      throw new Error("ECS integrity fail:  has no .fill method");
    }
    if (val.length !== field.len) {
      throw new Error("ECS integrity fail:  has wrong length (expected , got )");
    }
  }

  return true;
}

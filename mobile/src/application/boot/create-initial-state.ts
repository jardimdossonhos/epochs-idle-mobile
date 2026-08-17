import worldMapData from "../../assets/data/world_map_data.json";
import { createDefaultBudgetPriority, createEmptyStock, type EconomyState } from "../../core/models/economy";
import {
  ArmyPosture,
  AutomationLevel,
  DiplomaticRelation,
  NpcArchetype,
  PopulationClass,
  ReligiousPolicy,
  ResourceType,
  TechnologyDomain,
  VictoryPath
} from "../../core/models/enums";
import type { EcsState, GameState, KingdomState } from "../../core/models/game-state";
import type { NpcBehaviorState } from "../../core/models/npc";
import type { PopulationState } from "../../core/models/population";
import type { StaticWorldData } from "../../core/models/static-world-data";
import type { ReligionId } from "../../core/models/types";
import type { RegionDefinition, RegionState, RegionZone, WorldState } from "../../core/models/world";
import type { WorldReligion } from "../../core/models/religion";


interface KingdomBlueprint {
  id: string;
  name: string;
  adjective: string;
  isPlayer: boolean;
  preferredCapitalRegionId: string;
  archetype?: NpcArchetype;
  strategicGoal?: string;
  color?: string;
}

const KINGDOM_BLUEPRINTS: KingdomBlueprint[] = [
  {
    id: "k_player",
    name: "Primeira Tribo",
    adjective: "Primordial",
    isPlayer: true,
    preferredCapitalRegionId: ""
  },
  {
    id: "k_npc_1",
    name: "Povo de Uruk",
    adjective: "MesopotÃƒÆ’Ã‚Â¢mico",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Expansionist,
    strategicGoal: "dominar_rios",
    color: "#E74C3C"
  },
  {
    id: "k_npc_2",
    name: "Tribos do Nilo",
    adjective: "Egípcio",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Defensive,
    strategicGoal: "proteger_deserto",
    color: "#F39C12"
  },
  {
    id: "k_npc_3",
    name: "Civilização de Harappa",
    adjective: "Indo",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Mercantile,
    strategicGoal: "rotas_comerciais",
    color: "#27AE60"
  },
  {
    id: "k_npc_4",
    name: "Clãs Xia",
    adjective: "Sínico",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Diplomatic,
    strategicGoal: "mandato_do_ceu",
    color: "#9B59B6"
  }
];

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const DEFAULT_RELIGION_BY_ZONE: Record<RegionZone, ReligionId> = {
  europe: "catholicism",
  north_africa: "sunni_islam",
  near_east: "sunni_islam",
  north_america: "tengriism",
  south_america: "tengriism",
  sub_saharan_africa: "sunni_islam",
  central_asia: "tengriism",
  south_asia: "hinduism",
  east_asia: "buddhism",
  oceania: "buddhism"
};

function listReligionIds(staticData: StaticWorldData): ReligionId[] {
  const ids = Object.keys(staticData.religions).sort();
  if (ids.length === 0) {
    return ["catholicism"];
  }
  return ids;
}

function religionByZone(zone: RegionZone, staticData: StaticWorldData): ReligionId {
  const preferred = DEFAULT_RELIGION_BY_ZONE[zone];
  if (staticData.religions[preferred]) {
    return preferred;
  }

  const ids = listReligionIds(staticData);
  return ids[0];
}

function pickDeterministicReligion(
  staticData: StaticWorldData,
  seedKey: string,
  excluded: ReligionId | null = null
): ReligionId {
  const ids = listReligionIds(staticData);
  const usable = ids.filter((id) => id !== excluded);
  const pool = usable.length > 0 ? usable : ids;
  const hash = hashString(seedKey);
  return pool[hash % pool.length];
}

function createBasePopulation(total: number): PopulationState {
  return {
    total,
    groups: {
      [PopulationClass.Peasants]: 0.71,
      [PopulationClass.Nobles]: 0.05,
      [PopulationClass.Clergy]: 0.07,
      [PopulationClass.Soldiers]: 0.09,
      [PopulationClass.Merchants]: 0.08
    },
    growthRatePerTick: 0.00015,
    pressure: {
      taxation: 0.2,
      inequality: 0.25,
      warWeariness: 0,
      famineRisk: 0,
      zeal: 0.3
    },
    unrest: 0.13
  };
}

function createBaseEconomy(): EconomyState {
  const stock = createEmptyStock();
  stock[ResourceType.Gold] = 0;
  stock[ResourceType.Food] = 250;
  stock[ResourceType.Wood] = 100;
  stock[ResourceType.Iron] = 0;
  stock[ResourceType.Faith] = 10;
  stock[ResourceType.Legitimacy] = 10;

  return {
    stock,
    incomePerTick: createEmptyStock(),
    netIncomePerTick: createEmptyStock(),
    upkeepPerTick: createEmptyStock(),
    productionByRegion: {},
    taxPolicy: {
      baseRate: 0.2,
      nobleRelief: 0.1,
      clergyExemption: 0.08,
      tariffRate: 0.12
    },
    budgetPriority: createDefaultBudgetPriority(),
    inflation: 0,
    corruption: 0.08
  };
}

function createNpcBehavior(archetype: NpcArchetype, strategicGoal: string): NpcBehaviorState {
  const personalityByArchetype: Record<NpcArchetype, NpcBehaviorState["personality"]> = {
    [NpcArchetype.Expansionist]: {
      archetype,
      ambition: 0.76,
      caution: 0.36,
      greed: 0.42,
      zeal: 0.45,
      honor: 0.41,
      betrayalTendency: 0.36
    },
    [NpcArchetype.Defensive]: {
      archetype,
      ambition: 0.45,
      caution: 0.72,
      greed: 0.32,
      zeal: 0.38,
      honor: 0.55,
      betrayalTendency: 0.18
    },
    [NpcArchetype.Mercantile]: {
      archetype,
      ambition: 0.54,
      caution: 0.52,
      greed: 0.76,
      zeal: 0.26,
      honor: 0.47,
      betrayalTendency: 0.22
    },
    [NpcArchetype.ReligiousFanatic]: {
      archetype,
      ambition: 0.58,
      caution: 0.34,
      greed: 0.24,
      zeal: 0.84,
      honor: 0.6,
      betrayalTendency: 0.18
    },
    [NpcArchetype.Opportunist]: {
      archetype,
      ambition: 0.66,
      caution: 0.46,
      greed: 0.58,
      zeal: 0.34,
      honor: 0.32,
      betrayalTendency: 0.48
    },
    [NpcArchetype.Treacherous]: {
      archetype,
      ambition: 0.62,
      caution: 0.41,
      greed: 0.6,
      zeal: 0.3,
      honor: 0.22,
      betrayalTendency: 0.74
    },
    [NpcArchetype.Diplomatic]: {
      archetype,
      ambition: 0.52,
      caution: 0.57,
      greed: 0.4,
      zeal: 0.29,
      honor: 0.68,
      betrayalTendency: 0.17
    },
    [NpcArchetype.Revanchist]: {
      archetype,
      ambition: 0.74,
      caution: 0.31,
      greed: 0.36,
      zeal: 0.55,
      honor: 0.44,
      betrayalTendency: 0.39
    }
  };

  return {
    personality: personalityByArchetype[archetype],
    strategicGoal,
    memories: [],
    lastDecisionTick: 0
  };
}

function createKingdom(
  blueprint: KingdomBlueprint,
  capitalRegionId: string,
  ownedRegions: string[],
  stateFaith: ReligionId
): KingdomState {
  const ownedRegionCount = ownedRegions.length;
  const isNature = blueprint.id === "k_nature";
  const populationTotal = isNature ? 0 : 20; // A aurora da humanidade comeÃƒÆ’Ã‚Â§a com uma minÃƒÆ’Ã‚Âºscula tribo de 20 pessoas
  const armyManpower = isNature ? 0 : 5; // Apenas uns poucos caÃƒÆ’Ã‚Â§adores/guerreiros

  return {
    id: blueprint.id,
    name: blueprint.name,
    adjective: blueprint.adjective,
    isPlayer: blueprint.isPlayer,
    color: blueprint.color,
    capitalRegionId,
    heirs: [], // Inicialmente sem herdeiros - serÃ£o gerados quando o monarca for definido
    ownedRegionIds: ownedRegions,
    economy: createBaseEconomy(),
    population: createBasePopulation(populationTotal),
    capabilities: {
      canTraverseWater: false,
      canBuildFleets: false,
      canTradeOverseas: false,
      canColonizeIslands: false,
      hasWrittenLaw: false,
      hasCurrency: false,
    },
    technology: {
      unlocked: isNature ? {} : { fire_mastery: true },
      activeResearchId: isNature ? null : "bone_tools",
      researchGoalId: null,
      accumulatedResearch: 0,
      researchFocus: TechnologyDomain.Administration,
      currentEra: "stone_age" as any,
      unlockedEras: ["stone_age" as any],
      repeatableLevels: {}
    },
    religion: {
      stateFaith,
      policy: ReligiousPolicy.Orthodoxy,
      authority: blueprint.isPlayer ? 0.62 : 0.57,
      cohesion: blueprint.isPlayer ? 0.6 : 0.54,
      conversionPressure: 0.18,
      tolerance: 0.35,
      missionaryBudget: blueprint.isPlayer ? 0.22 : 0.18,
      externalInfluenceIn: {},
      holyWarCooldownUntil: 0
    },
    military: {
      posture: ArmyPosture.Defensive, // Tribos nascentes sÃƒÆ’Ã‚Â£o defensivas
      recruitmentPriority: 0.52,
      offensiveFocus: blueprint.isPlayer ? 0.47 : 0.51,
      targetRegionIds: [],
      armies: isNature ? [] : [
        {
          _poolIdx: -1,
          generation: 0,
          isActive: true,
          factionIndex: blueprint.isPlayer ? 1 : 2,
          id: `${blueprint.id}_army_1`,
          stationedIndex: parseInt(capitalRegionId.replace("r_hex_", ""), 10),
          targetIndex: -1,
          pathLength: 0,
          currentPath: new Int32Array(50),
          maxManpower: armyManpower,
          manpower: armyManpower,
          quality: 0.1,
          morale: 0.5,
          supply: 1
        }
      ],
      reserveManpower: isNature ? 0 : 15,
      militaryTechLevel: 1
    },
    diplomacy: {
      treaties: [],
      relations: {},
      coalitionThreat: 0,
      warExhaustion: 0
    },
    administration: {
      adminCapacity: 95 + ownedRegionCount * 0.45,
      usedCapacity: 55 + ownedRegionCount * 0.3,
      corruption: 0.08,
      policy: {
        regionalAutonomyTarget: 0.34,
        directRuleBias: 0.58,
        assimilationInvestment: 0.3,
        antiCorruptionBudget: 0.2
      },
      regionalControl: ownedRegions.map(regionId => ({ 
        regionId, 
        governorId: undefined,
        localAutonomy: 0.1,
        taxationEfficiency: 0.9,
        integration: 1.0,
        revoltRisk: 0
      } as any)),
      automation: {
        economy: blueprint.isPlayer ? AutomationLevel.Assisted : AutomationLevel.NearlyAutomatic,
        construction: blueprint.isPlayer ? AutomationLevel.Assisted : AutomationLevel.NearlyAutomatic,
        defense: blueprint.isPlayer ? AutomationLevel.Assisted : AutomationLevel.NearlyAutomatic,
        diplomacyReactive: blueprint.isPlayer ? AutomationLevel.Manual : AutomationLevel.Assisted,
        expansion: blueprint.isPlayer ? AutomationLevel.Manual : AutomationLevel.Assisted,
        technology: blueprint.isPlayer ? AutomationLevel.Assisted : AutomationLevel.Assisted
      },
      council: {},
      candidatePool: [],
      activeAdvice: []
    },
    victoryProgress: {
      [VictoryPath.TerritorialDomination]: 0,
      [VictoryPath.DiplomaticHegemony]: 0,
      [VictoryPath.EconomicSupremacy]: 0,
      [VictoryPath.ReligiousSupremacy]: 0,
      [VictoryPath.DynasticLegacy]: 0
    },
    legitimacy: blueprint.isPlayer ? 64 : 58,
    stability: isNature ? 100 : (blueprint.isPlayer ? 60 : 56),
    governmentSystemId: "band",
    hasAscended: false,
    ascensionPostponed: false,
    npc: blueprint.isPlayer || isNature
      ? undefined
      : createNpcBehavior(blueprint.archetype ?? NpcArchetype.Opportunist, blueprint.strategicGoal ?? "equilibrio_regional")
  };
}


const MAP_COLS = 800;
const MAP_ROWS = 400;
const TOTAL_HEXES = 320000;

function getAxialDistance(idx1: number, idx2: number): number {
    const col1 = idx1 % MAP_COLS;
    const row1 = Math.floor(idx1 / MAP_COLS);
    const col2 = idx2 % MAP_COLS;
    const row2 = Math.floor(idx2 / MAP_COLS);
    
    // Axial conversion for staggered odd-r grid
    const q1 = col1 - Math.floor(row1 / 2);
    const r1 = row1;
    const q2 = col2 - Math.floor(row2 / 2);
    const r2 = row2;
    
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

function findValidLandSpawn(biomes: number[], existingSpawns: number[], minDistance: number): number {
    const habitableIndices: number[] = [];
    for (let i = 0; i < TOTAL_HEXES; i++) {
        if (biomes[i] === 1) habitableIndices.push(i);
    }
    
    if (habitableIndices.length === 0) {
        throw new Error("Geração de mundo falhou: Não há nenhuma região habitável (biome === 1) no mapa.");
    }

    // Fisher-Yates shuffle
    for (let i = habitableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [habitableIndices[i], habitableIndices[j]] = [habitableIndices[j], habitableIndices[i]];
    }

    let currentMinDistance = minDistance;
    while (currentMinDistance > 0) {
        for (const idx of habitableIndices) {
            let tooClose = false;
            for (const spawnIdx of existingSpawns) {
                const dist = getAxialDistance(idx, spawnIdx);
                if (dist < currentMinDistance) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) {
                return idx;
            }
        }
        // Fallback progressivo
        currentMinDistance -= 5;
    }

    // Se nem com minDistance 0 (qualquer lugar) achou, é porque o mapa é minúsculo (menor que a qtde de reinos)
    if (habitableIndices.length > existingSpawns.length) {
        // Pega o primeiro que ainda não foi usado
        for (const idx of habitableIndices) {
            if (!existingSpawns.includes(idx)) return idx;
        }
    }

    throw new Error("Geração de mundo falhou: Espaço habitável insuficiente para spawn de todos os reinos.");
}

function getNeighbors(idx: number): number[] {
    const col = idx % MAP_COLS;
    const row = Math.floor(idx / MAP_COLS);
    const isOdd = row % 2 !== 0;
    
    const offsets = isOdd ? [
        [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 0]
    ] : [
        [-1, -1], [0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
    ];
    
    const neighbors: number[] = [];
    for (const [dc, dr] of offsets) {
        let nc = col + dc;
        const nr = row + dr;
        
        if (nr < 0 || nr >= MAP_ROWS) continue;
        
        nc = ((nc % MAP_COLS) + MAP_COLS) % MAP_COLS;
        neighbors.push(nr * MAP_COLS + nc);
    }
    return neighbors;
}

function createSeedRelations(state: GameState): void {
  const ids = Object.keys(state.kingdoms).filter(id => id !== "k_nature").sort();

  for (const id of ids) {
    const kingdom = state.kingdoms[id];

    for (const otherId of ids) {
      if (id === otherId) continue;

      let rivalry = 0.20;
      let trust = 0.45;
      let fear = 0.20;
      let tradeValue = 0.35;
      let borderTension = 0.18;
      let grievance = 0.10;

      // Personalidades e assimetrias diplomáticas distintas por arquétipo
      if (otherId === "k_npc_1") { // Uruk - Expansivo e agressivo
        rivalry = 0.38;
        borderTension = 0.35;
        trust = 0.35;
      } else if (otherId === "k_npc_2") { // Nilo - Defensivo e cauteloso
        trust = 0.55;
        fear = 0.28;
        grievance = 0.08;
      } else if (otherId === "k_npc_3") { // Harappa - Mercantil e aberto
        tradeValue = 0.65;
        trust = 0.58;
        rivalry = 0.12;
      } else if (otherId === "k_npc_4") { // Xia - Hegemônico e solene
        rivalry = 0.32;
        fear = 0.34;
        tradeValue = 0.42;
      }

      if (kingdom.isPlayer) {
        trust += 0.05;
      }

      kingdom.diplomacy.relations[otherId] = {
        withKingdomId: otherId,
        status: DiplomaticRelation.Neutral,
        score: {
          trust: clamp(trust, 0, 1),
          fear: clamp(fear, 0, 1),
          rivalry: clamp(rivalry, 0, 1),
          religiousTension: 0.18,
          borderTension: clamp(borderTension, 0, 1),
          tradeValue: clamp(tradeValue, 0, 1)
        },
        grievance: clamp(grievance, 0, 1),
        allianceStrength: 0,
        actionCooldowns: {}
      };
    }
  }
}

function createSeedRulers(state: GameState): void {
  state.world.characters = state.world.characters || {};
  const ids = Object.keys(state.kingdoms).filter(id => id !== "k_nature").sort();

  for (const kid of ids) {
    const kingdom = state.kingdoms[kid];
    if (kid === "k_player") continue; // O jogador cria ou tem seu soberano gerado no fluxo do menu/onboarding

    const rulerId = `char_${kid}_ruler`;
    kingdom.rulerId = rulerId;
    let cultureId = "latin";
    let title = "Rei";
    let name = "Soberano";

    if (kid === "k_npc_1" || kingdom.name.includes("Uruk")) {
      cultureId = "desert";
      title = "Rei-Sacerdote";
      name = "Gilgamesh de Uruk";
    } else if (kid === "k_npc_2" || kingdom.name.includes("Nilo")) {
      cultureId = "savanna";
      title = "Faraó";
      name = "Menés do Nilo";
    } else if (kid === "k_npc_3" || kingdom.name.includes("Harappa")) {
      cultureId = "vedic";
      title = "Rajá";
      name = "Dravida de Harappa";
    } else if (kid === "k_npc_4" || kingdom.name.includes("Xia")) {
      cultureId = "eastern";
      title = "Imperador";
      name = "Yu, o Grande";
    }

    state.world.characters[rulerId] = {
      id: rulerId,
      name,
      title,
      cultureId,
      gender: "male",
      portraitSeed: kid + "_initial_" + Math.floor(Math.random() * 9000 + 1000),
      birthTick: 0,
      deathTick: null,
      isLegendary: true,
      status: "ruler",
      locationKingdomId: kid,
      employerKingdomId: kid,
      affinity: { institutionalLoyalty: 100, personalAffinity: 100 },
      personalWealth: 500,
      influence: 80,
      memory: [],
      stats: { administration: 6, martial: 6, diplomacy: 6, intrigue: 5, learning: 5 },
      traits: [],
      level: 2,
      experience: 100,
      unspentTalentPoints: 0
    } as any;
  }
}

function createKingdoms(spawnIndices: Record<string, number>, staticData: StaticWorldData): Record<string, KingdomState> {
  const kingdoms: Record<string, KingdomState> = {};
  for (const blueprint of KINGDOM_BLUEPRINTS) {
    const capitalIdx = spawnIndices[blueprint.id];
    // Define capital genérica na falta de JSON gigante
    const capitalRegionId = `r_hex_${capitalIdx}`; 
    // Em vez de varrer arrays, o reino recém nascido tem 1 território só, ele expandirá depois.
    const ownedRegions = [capitalRegionId]; 
    const chosenFaith = pickDeterministicReligion(staticData, blueprint.id);
    kingdoms[blueprint.id] = createKingdom(blueprint, capitalRegionId, ownedRegions, chosenFaith);
  }

  // Natureza
  kingdoms["k_nature"] = createKingdom({
    id: "k_nature",
    name: "Terra Selvagem",
    adjective: "Selvagem",
    isPlayer: false,
    preferredCapitalRegionId: "r_hex_0"
  }, "r_hex_0", [], "tengriism");

  return kingdoms;
}

function createWorldState(staticData: StaticWorldData, now: number): WorldState {
  const dynamicReligions: Record<ReligionId, WorldReligion> = {};
  for (const [id, def] of Object.entries(staticData.religions)) {
    dynamicReligions[id as ReligionId] = {
      id: id as ReligionId,
      name: def.name,
      deityName: def.deityName,
      deityDescription: def.deityDescription,
      color: def.color,
      tenets: [...def.tenets],
      holyCityRegionId: null,
      headOfFaithKingdomId: null,
      founderId: null,
      foundedAt: now,
      parentReligionId: null
    };
  }

  return {
    mapId: staticData.mapId,
    regions: {}, // Removido! Objetos de hexágono substituídos por TypedArrays nativos na ECS
    religions: dynamicReligions,
    faithRegistry: {},
    eventChains: {}
  };
}

export function createInitialState(staticData: StaticWorldData, playerStartRegionId?: string, _ignoredDefs: RegionDefinition[] = []): GameState {
  const now = Date.now();
  
  // 1. Algoritmo Sandbox Spawner (Fairness)
  const biomes = worldMapData.biomes;
  const existingSpawns: number[] = [];
  const spawnIndices: Record<string, number> = {};
  
  for (const blueprint of KINGDOM_BLUEPRINTS) {
      const idx = findValidLandSpawn(biomes, existingSpawns, 30);
      existingSpawns.push(idx);
      spawnIndices[blueprint.id] = idx;
  }

  const kingdoms = createKingdoms(spawnIndices, staticData);
  
  const totalEntities = TOTAL_HEXES;

  const kingdomToFactionId: Record<string, number> = { "k_nature": -1 };
  KINGDOM_BLUEPRINTS.forEach((bp, idx) => {
    kingdomToFactionId[bp.id] = idx + 1;
  });

  const ecsState: EcsState = {
    gold: new Array(totalEntities).fill(0),
    food: new Array(totalEntities).fill(0),
    wood: new Array(totalEntities).fill(0),
    iron: new Array(totalEntities).fill(0),
    faith: new Array(totalEntities).fill(0),
    legitimacy: new Array(totalEntities).fill(0),
    populationTotal: new Array(totalEntities).fill(0),
    populationGrowthRate: new Array(totalEntities).fill(0),
    manpower: new Array(totalEntities).fill(0),
    factionCasualties: new Int32Array(256),
    factionManpowerReserve: new Float32Array(256).fill(100),
    accumulatedSimulatedTime: 0,
    conquestEpoch: 0,
    regionManpowerYield: new Float32Array(totalEntities).fill(0.1),
    regionManpowerCap: new Float32Array(totalEntities).fill(50),
    factionManpowerCap: new Float32Array(256).fill(0),
    regionGoldYield: new Float32Array(totalEntities).fill(0.5),
    factionGoldBalance: new Float32Array(256).fill(100),
    cmdHead: 0,
    cmdTail: 0,
    cmdType: new Int32Array(2048),
    cmdFaction: new Int32Array(2048),
    cmdArg0: new Int32Array(2048),
    cmdArg1: new Int32Array(2048),
    regionOwner: new Int32Array(totalEntities).fill(-1),
    regionCaptureProgress: new Float32Array(totalEntities).fill(0),
    regionSupplyCapacity: new Float32Array(totalEntities).fill(1000),
    regionCurrentSupply: new Float32Array(totalEntities).fill(1000),
    factionResources: new Float32Array(256 * 3).fill(100),
    hexStructures: new Int32Array(totalEntities).fill(0),
    combatEventHead: 0,
    combatEventTail: 0,
    combatEventX: new Float32Array(1024),
    combatEventY: new Float32Array(1024),
    combatEventTs: new Float32Array(1024),
    visibilityMask: new Uint8Array(totalEntities).fill(0),
    regionDominantFaith: new Int32Array(totalEntities).fill(0),
    regionDominantShare: new Float32Array(totalEntities).fill(1),
    regionMinorityFaith: new Int32Array(totalEntities).fill(-1),
    regionMinorityShare: new Float32Array(totalEntities).fill(0),
    regionFaithUnrest: new Float32Array(totalEntities).fill(0),
    factionPopulation: new Float32Array(256).fill(0),
    factionRegions: new Int32Array(256).fill(0),
    factionPopulationGrowth: new Float32Array(256).fill(0),
    factionPeasants: new Float32Array(256).fill(0.8),
    factionNobles: new Float32Array(256).fill(0.05),
    factionClergy: new Float32Array(256).fill(0.05),
    factionSoldiers: new Float32Array(256).fill(0.05),
    factionMerchants: new Float32Array(256).fill(0.05),
    factionPopUnrest: new Float32Array(256).fill(0)
  };

  // 2. Aplicar Spawns na Matriz
  for (const blueprint of KINGDOM_BLUEPRINTS) {
      const factionId = kingdomToFactionId[blueprint.id];
      const capitalIdx = spawnIndices[blueprint.id];
      
      // Conquista a capital e alguns vizinhos
      const cluster = [capitalIdx, ...getNeighbors(capitalIdx)];
      
      for (const idx of cluster) {
          if (biomes[idx] > 0 && ecsState.regionOwner[idx] === -1) {
              ecsState.regionOwner[idx] = factionId;
              ecsState.populationTotal[idx] = 20;
              ecsState.populationGrowthRate[idx] = 0.003;
              ecsState.food[idx] = 250;
              ecsState.wood[idx] = 100;
              ecsState.faith[idx] = 10;
              ecsState.legitimacy[idx] = 10;
          }
      }
  }

  const state: GameState = {
    meta: {
      schemaVersion: 4,
      sessionId: `session_${now}`,
      tick: 0,
      tickDurationMs: 10_000,
      speedMultiplier: 1,
      paused: false,
      disastersEnabled: true,
      createdAt: now,
      lastUpdatedAt: now,
      lastClosedAt: null
    },
    campaign: {
      id: "campaign_dawn_of_man",
      name: "A Aurora da Humanidade",
      mapId: staticData.mapId,
      startDateIso: "0001-01-01",
      victoryTargets: [
        { path: VictoryPath.TerritorialDomination, threshold: 0.55 }
      ]
    },
    world: createWorldState(staticData, now),
    kingdoms,
    wars: {},
    events: [
      {
        id: "evt_seed_campaign_start",
        title: "A Aurora da Civilização",
        details: "A humanidade encontra-se na sua infância. Pequenos grupos começam a dominar a arte da sobrevivência.",
        severity: "info",
        occurredAt: now
      }
    ],
    victory: { achievedPath: null, achievedAt: null, postVictoryMode: false, crisisPressure: 0 },
    randomSeed: now,
    ecs: ecsState
  };

  createSeedRelations(state);
  createSeedRulers(state);

  return state;
}

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
import { createStaticWorldData } from "./static-world-data";

interface KingdomBlueprint {
  id: string;
  name: string;
  adjective: string;
  isPlayer: boolean;
  preferredCapitalRegionId: string;
  archetype?: NpcArchetype;
  strategicGoal?: string;
}

const KINGDOM_BLUEPRINTS: KingdomBlueprint[] = [
  {
    id: "k_player",
    name: "Primeira Tribo",
    adjective: "Primordial",
    isPlayer: true,
    preferredCapitalRegionId: "" // Será injetado dinamicamente via UI no main.ts
  },
  {
    id: "k_npc_1",
    name: "Povo de Uruk",
    adjective: "Mesopotâmico",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Expansionist,
    strategicGoal: "dominar_rios"
  },
  {
    id: "k_npc_2",
    name: "Tribos do Nilo",
    adjective: "Egípcio",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Defensive,
    strategicGoal: "proteger_deserto"
  },
  {
    id: "k_npc_3",
    name: "Civilização de Harappa",
    adjective: "Indo",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Mercantile,
    strategicGoal: "rotas_comerciais"
  },
  {
    id: "k_npc_4",
    name: "Clãs Xia",
    adjective: "Sínico",
    isPlayer: false,
    preferredCapitalRegionId: "",
    archetype: NpcArchetype.Diplomatic,
    strategicGoal: "mandato_do_ceu"
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
  ownedRegionCount: number,
  stateFaith: ReligionId
): KingdomState {
  const isNature = blueprint.id === "k_nature";
  const populationTotal = isNature ? 0 : 20; // A aurora da humanidade começa com uma minúscula tribo de 20 pessoas
  const armyManpower = isNature ? 0 : 5; // Apenas uns poucos caçadores/guerreiros

  return {
    id: blueprint.id,
    name: blueprint.name,
    adjective: blueprint.adjective,
    isPlayer: blueprint.isPlayer,
    capitalRegionId,
    heirs: [], // Inicialmente sem herdeiros - serão gerados quando o monarca for definido
    economy: createBaseEconomy(),
    population: createBasePopulation(populationTotal),
    technology: {
      unlocked: isNature ? [] : ["fire_mastery"], // O fogo é o berço de tudo
      activeResearchId: isNature ? null : "bone_tools",
      researchGoalId: null,
      accumulatedResearch: 0,
      researchFocus: TechnologyDomain.Administration
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
      posture: ArmyPosture.Defensive, // Tribos nascentes são defensivas
      recruitmentPriority: 0.52,
      offensiveFocus: blueprint.isPlayer ? 0.47 : 0.51,
      targetRegionIds: [],
      armies: isNature ? [] : [
        {
          id: `${blueprint.id}_army_1`,
          stationedRegionId: capitalRegionId,
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
      regionalControl: [],
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
    npc: blueprint.isPlayer || isNature
      ? undefined
      : createNpcBehavior(blueprint.archetype ?? NpcArchetype.Opportunist, blueprint.strategicGoal ?? "equilibrio_regional")
  };
}

function toDefinitionMap(definitions: RegionDefinition[]): Record<string, RegionDefinition> {
  return Object.fromEntries(definitions.map((definition) => [definition.id, definition]));
}

function listDefinitionsSorted(staticData: StaticWorldData): RegionDefinition[] {
  return Object.keys(staticData.definitions)
    .sort()
    .map((regionId) => staticData.definitions[regionId]);
}

function assignRegionOwners(
  definitions: RegionDefinition[], 
  playerStartRegionId?: string
): { ownerByRegionId: Record<string, string>, capitalByOwner: Record<string, string> } {
  const ownerByRegionId: Record<string, string> = {};
  const capitalByOwner: Record<string, string> = {};
  const defsById = toDefinitionMap(definitions);

  // 1. O globo inteiro começa pertencendo à natureza absoluta (Vazio populacional)
  for (const definition of definitions) {
    ownerByRegionId[definition.id] = "k_nature";
  }

  // Função interna para criar "Clusters" (Tribos unidas de 2 a 3 hexágonos)
  function spawnCluster(kingdomId: string, centerId: string) {
    const center = defsById[centerId];
    if (!center || center.isWater) return;
    
    ownerByRegionId[centerId] = kingdomId;
    capitalByOwner[kingdomId] = centerId;
    
    let clusterSize = 1;
    const targetSize = 2 + Math.floor(Math.random() * 2); // Nasce dominando de 2 a 3 territórios vizinhos
    
    for (const neighborId of center.neighbors) {
      if (clusterSize >= targetSize) break;
      const nDef = defsById[neighborId];
      if (nDef && !nDef.isWater && ownerByRegionId[neighborId] === "k_nature") {
        ownerByRegionId[neighborId] = kingdomId;
        clusterSize++;
      }
    }
  }
  
  // 2. Alocar a Tribo do Jogador
  let playerStart = playerStartRegionId;
  if (!playerStart) {
    const fallbacks = definitions.filter(d => !d.isWater && d.biome === "temperate");
    playerStart = fallbacks[0]?.id;
  }
  if (playerStart) {
    spawnCluster("k_player", playerStart);
  }

  // 3. Alocar as Antigas Tribos Históricas da IA
  const npcZones = ["near_east", "north_africa", "south_asia", "east_asia"];
  for (let i = 1; i <= 4; i++) {
    const npcId = `k_npc_${i}`;
    const targetZone = npcZones[i - 1];
    const validSpawns = definitions.filter(d => !d.isWater && d.zone === targetZone && ownerByRegionId[d.id] === "k_nature");
    if (validSpawns.length > 0) {
      // Tenta cair pelo centro da região em vez de nas pontas extremas
      const start = validSpawns[Math.floor(validSpawns.length / 2)].id;
      spawnCluster(npcId, start);
    }
  }

  return { ownerByRegionId, capitalByOwner };
}

function buildOwnerIndex(ownerByRegionId: Record<string, string>): Map<string, string[]> {
  const byOwner = new Map<string, string[]>();

  for (const regionId of Object.keys(ownerByRegionId).sort()) {
    const ownerId = ownerByRegionId[regionId];
    const list = byOwner.get(ownerId) ?? [];
    list.push(regionId);
    byOwner.set(ownerId, list);
  }

  return byOwner;
}

function createRegionState(
  definition: RegionDefinition,
  ownerId: string,
  ownerFaith: ReligionId,
  staticData: StaticWorldData
): RegionState {
  const isNature = ownerId === "k_nature";
  const seed = hashString(definition.id);
  const unrest = isNature ? 0 : 0.08 + ((seed % 23) / 100); // A natureza não se revolta
  const autonomy = 0.2 + ((Math.floor(seed / 13) % 22) / 100);
  const devastation = isNature ? 0 : ((Math.floor(seed / 31) % 7) / 100);
  const assimilation = 0.74 + ((Math.floor(seed / 47) % 23) / 100);
  const zoneFaith = religionByZone(definition.zone, staticData);
  const dominantFaith = ownerFaith;
  const dominantShare = clamp(0.57 + ((Math.floor(seed / 71) % 25) / 100), 0.52, 0.86);
  const minorityFaith = zoneFaith === dominantFaith
    ? pickDeterministicReligion(staticData, `${definition.id}:minority`, dominantFaith)
    : zoneFaith;
  const rawMinorityShare = 0.12 + ((Math.floor(seed / 97) % 18) / 100);
  const minorityShare = clamp(Math.min(rawMinorityShare, 0.95 - dominantShare), 0.08, 0.38);
  const faithUnrest = isNature ? 0 : clamp(
    0.05 + minorityShare * 0.42 + (dominantFaith === zoneFaith ? 0 : 0.08) + ((Math.floor(seed / 131) % 6) / 100),
    0,
    1
  );

  return {
    regionId: definition.id,
    ownerId,
    controllerId: ownerId,
    autonomy: round(clamp(autonomy, 0, 1)),
    assimilation: round(clamp(assimilation, 0, 1)),
    unrest: round(clamp(unrest, 0, 1)),
    devastation: round(clamp(devastation, 0, 1)),
    dominantFaith,
    dominantShare: round(clamp(dominantShare, 0, 1)),
    minorityFaith,
    minorityShare: round(clamp(minorityShare, 0, 1)),
    faithUnrest: round(faithUnrest),
    actionCooldowns: {}
  };
}

function createWorldState(
  ownerByRegionId: Record<string, string>,
  staticData: StaticWorldData,
  faithByKingdomId: Record<string, ReligionId>,
  now: number
): WorldState {
  const definitions = toDefinitionMap(listDefinitionsSorted(staticData));
  const regions: Record<string, RegionState> = {};

  for (const regionId of Object.keys(definitions).sort()) {
    const definition = definitions[regionId];
    const ownerId = ownerByRegionId[regionId] ?? "k_nature";
    const ownerFaith = faithByKingdomId[ownerId] ?? religionByZone(definition.zone, staticData);
    regions[regionId] = createRegionState(definition, ownerId, ownerFaith, staticData);
  }

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
    regions,
    religions: dynamicReligions,
    eventChains: {}
  };
}

function createSeedRelations(state: GameState): void {
  const ids = Object.keys(state.kingdoms).filter(id => id !== "k_nature").sort();

  for (const id of ids) {
    const kingdom = state.kingdoms[id];

    for (const otherId of ids) {
      if (id === otherId) {
        continue;
      }

      const rivalryBias = state.kingdoms[otherId].isPlayer && !kingdom.isPlayer ? 0.24 : 0.18;
      const trustBias = kingdom.isPlayer ? 0.5 : 0.42;

      kingdom.diplomacy.relations[otherId] = {
        withKingdomId: otherId,
        status: DiplomaticRelation.Neutral,
        score: {
          trust: trustBias,
          fear: 0.22,
          rivalry: rivalryBias,
          religiousTension: 0.18,
          borderTension: 0.24,
          tradeValue: 0.31
        },
        grievance: 0.1,
        allianceStrength: 0,
        actionCooldowns: {}
      };
    }
  }
}

function createKingdoms(ownerByRegionId: Record<string, string>, capitalByOwner: Record<string, string>, staticData: StaticWorldData): Record<string, KingdomState> {
  const definitionsById = toDefinitionMap(listDefinitionsSorted(staticData));
  const byOwner = buildOwnerIndex(ownerByRegionId);
  const kingdoms: Record<string, KingdomState> = {};

  for (const blueprint of KINGDOM_BLUEPRINTS) {
    const ownedRegions = byOwner.get(blueprint.id) ?? [];
    const capitalRegionId = capitalByOwner[blueprint.id] ?? blueprint.preferredCapitalRegionId;
    const capitalZone = definitionsById[capitalRegionId]?.zone ?? "europe";
    const chosenFaith = religionByZone(capitalZone, staticData);
    kingdoms[blueprint.id] = createKingdom(blueprint, capitalRegionId, ownedRegions.length, chosenFaith);
  }

  // Entidade de contenção global (Terra Selvagem)
  kingdoms["k_nature"] = createKingdom({
    id: "k_nature",
    name: "Terra Selvagem",
    adjective: "Selvagem",
    isPlayer: false,
    preferredCapitalRegionId: "r_hex_0"
  }, "r_hex_0", 0, "tengriism");

  return kingdoms;
}

export function createInitialState(staticData: StaticWorldData = createStaticWorldData(), playerStartRegionId?: string, orderedDefinitions: RegionDefinition[] = []): GameState {
  const now = Date.now();
  const definitions = listDefinitionsSorted(staticData);
  const { ownerByRegionId, capitalByOwner } = assignRegionOwners(definitions, playerStartRegionId);
  const kingdoms = createKingdoms(ownerByRegionId, capitalByOwner, staticData);
  
  const faithByKingdomId = Object.fromEntries(
    Object.keys(kingdoms)
      .sort()
      .map((kingdomId) => [kingdomId, kingdoms[kingdomId].religion.stateFaith] as const)
  );

  const totalEntities = orderedDefinitions.length;

  // FAGULHA VITAL (AURORA DA HUMANIDADE): Preenche 99% das matrizes ECS com ZERO para o terreno vazio
  const ecsState: EcsState = {
    gold: new Array(totalEntities).fill(0),
    food: new Array(totalEntities).fill(0),
    wood: new Array(totalEntities).fill(0),
    iron: new Array(totalEntities).fill(0),
    faith: new Array(totalEntities).fill(0),
    legitimacy: new Array(totalEntities).fill(0),
    populationTotal: new Array(totalEntities).fill(0),
    populationGrowthRate: new Array(totalEntities).fill(0),
    manpower: new Array(totalEntities).fill(0)
  };

  for (let i = 0; i < totalEntities; i++) {
    const def = orderedDefinitions[i];
    const ownerId = ownerByRegionId[def.id] ?? "k_nature";

    if (ownerId !== "k_nature" && !def.isWater) {
      ecsState.populationTotal[i] = 20; // 20 nômades exatos por hexágono capital
      ecsState.populationGrowthRate[i] = 0.003; // Crescimento biológico (rápido no começo para impulsionar a tribo)
      ecsState.food[i] = 250;
      ecsState.wood[i] = 100;
      ecsState.faith[i] = 10;
      ecsState.legitimacy[i] = 10;
    }
  }

  const state: GameState = {
    meta: {
      schemaVersion: 4,
      sessionId: `session_${now}`,
      tick: 0,
      tickDurationMs: 3_000,
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
        { path: VictoryPath.TerritorialDomination, threshold: 0.55 },
        { path: VictoryPath.DiplomaticHegemony, threshold: 0.65 },
        { path: VictoryPath.EconomicSupremacy, threshold: 0.7 },
        { path: VictoryPath.ReligiousSupremacy, threshold: 0.68 },
        { path: VictoryPath.DynasticLegacy, threshold: 0.72 }
      ]
    },
    world: createWorldState(ownerByRegionId, staticData, faithByKingdomId, now),
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
    victory: {
      achievedPath: null,
      achievedAt: null,
      postVictoryMode: false,
      crisisPressure: 0
    },
    randomSeed: now,
    ecs: ecsState
  };

  createSeedRelations(state);

  for (const regionId of Object.keys(state.world.regions).sort()) {
    const region = state.world.regions[regionId];
    region.actionCooldowns = region.actionCooldowns ?? {};
  }

  return state;
}

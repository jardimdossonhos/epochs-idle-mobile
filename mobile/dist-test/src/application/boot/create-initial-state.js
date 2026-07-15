"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialState = createInitialState;
const economy_1 = require("../../core/models/economy");
const enums_1 = require("../../core/models/enums");
const character_1 = require("../../core/models/character");
const culture_generator_1 = require("../../core/simulation/systems/culture-generator");
const KINGDOM_BLUEPRINTS = [
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
        archetype: enums_1.NpcArchetype.Expansionist,
        strategicGoal: "dominar_rios"
    },
    {
        id: "k_npc_2",
        name: "Tribos do Nilo",
        adjective: "Egípcio",
        isPlayer: false,
        preferredCapitalRegionId: "",
        archetype: enums_1.NpcArchetype.Defensive,
        strategicGoal: "proteger_deserto"
    },
    {
        id: "k_npc_3",
        name: "Civilização de Harappa",
        adjective: "Indo",
        isPlayer: false,
        preferredCapitalRegionId: "",
        archetype: enums_1.NpcArchetype.Mercantile,
        strategicGoal: "rotas_comerciais"
    },
    {
        id: "k_npc_4",
        name: "Clãs Xia",
        adjective: "Sínico",
        isPlayer: false,
        preferredCapitalRegionId: "",
        archetype: enums_1.NpcArchetype.Diplomatic,
        strategicGoal: "mandato_do_ceu"
    }
];
function hashString(input) {
    let hash = 0;
    for (let index = 0; index < input.length; index += 1) {
        hash = (Math.imul(hash, 31) + input.charCodeAt(index)) >>> 0;
    }
    return hash >>> 0;
}
function round(value, decimals = 3) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
const DEFAULT_RELIGION_BY_ZONE = {
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
function listReligionIds(staticData) {
    const ids = Object.keys(staticData.religions).sort();
    if (ids.length === 0) {
        return ["catholicism"];
    }
    return ids;
}
function religionByZone(zone, staticData) {
    const preferred = DEFAULT_RELIGION_BY_ZONE[zone];
    if (staticData.religions[preferred]) {
        return preferred;
    }
    const ids = listReligionIds(staticData);
    return ids[0];
}
function pickDeterministicReligion(staticData, seedKey, excluded = null) {
    const ids = listReligionIds(staticData);
    const usable = ids.filter((id) => id !== excluded);
    const pool = usable.length > 0 ? usable : ids;
    const hash = hashString(seedKey);
    return pool[hash % pool.length];
}
function createBasePopulation(total) {
    return {
        total,
        groups: {
            [enums_1.PopulationClass.Peasants]: 0.71,
            [enums_1.PopulationClass.Nobles]: 0.05,
            [enums_1.PopulationClass.Clergy]: 0.07,
            [enums_1.PopulationClass.Soldiers]: 0.09,
            [enums_1.PopulationClass.Merchants]: 0.08
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
function createBaseEconomy() {
    const stock = (0, economy_1.createEmptyStock)();
    stock[enums_1.ResourceType.Gold] = 0;
    stock[enums_1.ResourceType.Food] = 250;
    stock[enums_1.ResourceType.Wood] = 100;
    stock[enums_1.ResourceType.Iron] = 0;
    stock[enums_1.ResourceType.Faith] = 10;
    stock[enums_1.ResourceType.Legitimacy] = 10;
    return {
        stock,
        incomePerTick: (0, economy_1.createEmptyStock)(),
        upkeepPerTick: (0, economy_1.createEmptyStock)(),
        productionByRegion: {},
        taxPolicy: {
            baseRate: 0.2,
            nobleRelief: 0.1,
            clergyExemption: 0.08,
            tariffRate: 0.12
        },
        budgetPriority: (0, economy_1.createDefaultBudgetPriority)(),
        inflation: 0,
        corruption: 0.08
    };
}
function createNpcBehavior(archetype, strategicGoal) {
    const personalityByArchetype = {
        [enums_1.NpcArchetype.Expansionist]: {
            archetype,
            ambition: 0.76,
            caution: 0.36,
            greed: 0.42,
            zeal: 0.45,
            honor: 0.41,
            betrayalTendency: 0.36
        },
        [enums_1.NpcArchetype.Defensive]: {
            archetype,
            ambition: 0.45,
            caution: 0.72,
            greed: 0.32,
            zeal: 0.38,
            honor: 0.55,
            betrayalTendency: 0.18
        },
        [enums_1.NpcArchetype.Mercantile]: {
            archetype,
            ambition: 0.54,
            caution: 0.52,
            greed: 0.76,
            zeal: 0.26,
            honor: 0.47,
            betrayalTendency: 0.22
        },
        [enums_1.NpcArchetype.ReligiousFanatic]: {
            archetype,
            ambition: 0.58,
            caution: 0.34,
            greed: 0.24,
            zeal: 0.84,
            honor: 0.6,
            betrayalTendency: 0.18
        },
        [enums_1.NpcArchetype.Opportunist]: {
            archetype,
            ambition: 0.66,
            caution: 0.46,
            greed: 0.58,
            zeal: 0.34,
            honor: 0.32,
            betrayalTendency: 0.48
        },
        [enums_1.NpcArchetype.Treacherous]: {
            archetype,
            ambition: 0.62,
            caution: 0.41,
            greed: 0.6,
            zeal: 0.3,
            honor: 0.22,
            betrayalTendency: 0.74
        },
        [enums_1.NpcArchetype.Diplomatic]: {
            archetype,
            ambition: 0.52,
            caution: 0.57,
            greed: 0.4,
            zeal: 0.29,
            honor: 0.68,
            betrayalTendency: 0.17
        },
        [enums_1.NpcArchetype.Revanchist]: {
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
function createKingdom(blueprint, capitalRegionId, ownedRegionCount, stateFaith) {
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
            researchFocus: enums_1.TechnologyDomain.Administration
        },
        religion: {
            stateFaith,
            policy: enums_1.ReligiousPolicy.Orthodoxy,
            authority: blueprint.isPlayer ? 0.62 : 0.57,
            cohesion: blueprint.isPlayer ? 0.6 : 0.54,
            conversionPressure: 0.18,
            tolerance: 0.35,
            missionaryBudget: blueprint.isPlayer ? 0.22 : 0.18,
            externalInfluenceIn: {},
            holyWarCooldownUntil: 0
        },
        military: {
            posture: enums_1.ArmyPosture.Defensive, // Tribos nascentes são defensivas
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
                economy: blueprint.isPlayer ? enums_1.AutomationLevel.Assisted : enums_1.AutomationLevel.NearlyAutomatic,
                construction: blueprint.isPlayer ? enums_1.AutomationLevel.Assisted : enums_1.AutomationLevel.NearlyAutomatic,
                defense: blueprint.isPlayer ? enums_1.AutomationLevel.Assisted : enums_1.AutomationLevel.NearlyAutomatic,
                diplomacyReactive: blueprint.isPlayer ? enums_1.AutomationLevel.Manual : enums_1.AutomationLevel.Assisted,
                expansion: blueprint.isPlayer ? enums_1.AutomationLevel.Manual : enums_1.AutomationLevel.Assisted,
                technology: blueprint.isPlayer ? enums_1.AutomationLevel.Assisted : enums_1.AutomationLevel.Assisted
            },
            council: {},
            candidatePool: [],
            activeAdvice: []
        },
        victoryProgress: {
            [enums_1.VictoryPath.TerritorialDomination]: 0,
            [enums_1.VictoryPath.DiplomaticHegemony]: 0,
            [enums_1.VictoryPath.EconomicSupremacy]: 0,
            [enums_1.VictoryPath.ReligiousSupremacy]: 0,
            [enums_1.VictoryPath.DynasticLegacy]: 0
        },
        legitimacy: blueprint.isPlayer ? 64 : 58,
        stability: isNature ? 100 : (blueprint.isPlayer ? 60 : 56),
        npc: blueprint.isPlayer || isNature
            ? undefined
            : createNpcBehavior(blueprint.archetype ?? enums_1.NpcArchetype.Opportunist, blueprint.strategicGoal ?? "equilibrio_regional")
    };
}
function toDefinitionMap(definitions) {
    return Object.fromEntries(definitions.map((definition) => [definition.id, definition]));
}
function listDefinitionsSorted(staticData) {
    return Object.keys(staticData.definitions)
        .sort()
        .map((regionId) => staticData.definitions[regionId]);
}
function assignRegionOwners(definitions, playerStartRegionId) {
    const ownerByRegionId = {};
    const capitalByOwner = {};
    const defsById = toDefinitionMap(definitions);
    // 1. O globo inteiro começa pertencendo à natureza absoluta (Vazio populacional)
    for (const definition of definitions) {
        ownerByRegionId[definition.id] = "k_nature";
    }
    // Função interna para criar "Clusters" (Tribos unidas de 2 a 3 hexágonos)
    function spawnCluster(kingdomId, centerId) {
        const center = defsById[centerId];
        if (!center || center.isWater)
            return;
        ownerByRegionId[centerId] = kingdomId;
        capitalByOwner[kingdomId] = centerId;
        let clusterSize = 1;
        const targetSize = 2 + Math.floor(Math.random() * 2); // Nasce dominando de 2 a 3 territórios vizinhos
        for (const neighborId of center.neighbors) {
            if (clusterSize >= targetSize)
                break;
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
function buildOwnerIndex(ownerByRegionId) {
    const byOwner = new Map();
    for (const regionId of Object.keys(ownerByRegionId).sort()) {
        const ownerId = ownerByRegionId[regionId];
        const list = byOwner.get(ownerId) ?? [];
        list.push(regionId);
        byOwner.set(ownerId, list);
    }
    return byOwner;
}
function createRegionState(definition, ownerId, ownerFaith, staticData) {
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
    const faithUnrest = isNature ? 0 : clamp(0.05 + minorityShare * 0.42 + (dominantFaith === zoneFaith ? 0 : 0.08) + ((Math.floor(seed / 131) % 6) / 100), 0, 1);
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
function createWorldState(ownerByRegionId, staticData, faithByKingdomId, now) {
    const definitions = toDefinitionMap(listDefinitionsSorted(staticData));
    const regions = {};
    for (const regionId of Object.keys(definitions).sort()) {
        const definition = definitions[regionId];
        const ownerId = ownerByRegionId[regionId] ?? "k_nature";
        const ownerFaith = faithByKingdomId[ownerId] ?? religionByZone(definition.zone, staticData);
        regions[regionId] = createRegionState(definition, ownerId, ownerFaith, staticData);
    }
    const dynamicReligions = {};
    for (const [id, def] of Object.entries(staticData.religions)) {
        dynamicReligions[id] = {
            id: id,
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
function createSeedRelations(state) {
    const ids = Object.keys(state.kingdoms).filter(id => id !== "k_nature").sort();
    for (const id of ids) {
        const kingdom = state.kingdoms[id];
        for (const otherId of ids) {
            if (id === otherId) {
                continue;
            }
            const rivalryBias = Math.max(0, (state.kingdoms[otherId].isPlayer && !kingdom.isPlayer ? 0.24 : 0.18) + (Math.random() * 0.1 - 0.05));
            const trustBias = Math.max(0, (kingdom.isPlayer ? 0.5 : 0.42) + (Math.random() * 0.1 - 0.05));
            kingdom.diplomacy.relations[otherId] = {
                withKingdomId: otherId,
                status: enums_1.DiplomaticRelation.Neutral,
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
function createKingdoms(ownerByRegionId, capitalByOwner, staticData) {
    const definitionsById = toDefinitionMap(listDefinitionsSorted(staticData));
    const byOwner = buildOwnerIndex(ownerByRegionId);
    const kingdoms = {};
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
function createInitialCharacter(id, kingdomId, cultureId, birthTick, title, status) {
    const gender = (0, culture_generator_1.getRandomGender)();
    const name = (0, culture_generator_1.generateCulturalName)(cultureId, gender);
    const portraitSeed = (0, culture_generator_1.generatePortraitSeed)();
    const baseStats = {
        administration: Math.floor(Math.random() * 20) + 1,
        martial: Math.floor(Math.random() * 20) + 1,
        diplomacy: Math.floor(Math.random() * 20) + 1,
        intrigue: Math.floor(Math.random() * 20) + 1,
        learning: Math.floor(Math.random() * 20) + 1,
    };
    const trait = character_1.SOVEREIGN_TRAITS[Math.floor(Math.random() * character_1.SOVEREIGN_TRAITS.length)];
    const stats = { ...baseStats };
    if (trait.statModifiers) {
        for (const [stat, mod] of Object.entries(trait.statModifiers)) {
            const currentVal = stats[stat] ?? 10;
            stats[stat] = Math.max(1, Math.min(20, currentVal + mod));
        }
    }
    const traits = title !== "Soberano" ? ["nobre", "herdeiro"] : ["nobre"];
    traits.push(trait.id);
    return {
        id,
        name,
        cultureId,
        portraitSeed,
        gender,
        title,
        isLegendary: false,
        birthTick,
        deathTick: null,
        stats,
        traits,
        status,
        locationKingdomId: kingdomId,
        employerKingdomId: kingdomId,
        affinity: {
            institutionalLoyalty: 90 + Math.floor(Math.random() * 11),
            personalAffinity: 80 + Math.floor(Math.random() * 21),
        },
        personalWealth: 100,
        influence: 50,
        memory: [title === "Soberano" ? `Coroado como Soberano.` : `Nascido na Casa Real.`],
        level: 1,
        experience: 0,
        unspentTalentPoints: 0
    };
}
function createInitialState(staticData, playerStartRegionId, orderedDefinitions = []) {
    const now = Date.now();
    const definitions = listDefinitionsSorted(staticData);
    const { ownerByRegionId, capitalByOwner } = assignRegionOwners(definitions, playerStartRegionId);
    const kingdoms = createKingdoms(ownerByRegionId, capitalByOwner, staticData);
    const faithByKingdomId = Object.fromEntries(Object.keys(kingdoms)
        .sort()
        .map((kingdomId) => [kingdomId, kingdoms[kingdomId].religion.stateFaith]));
    const totalEntities = orderedDefinitions.length;
    // FAGULHA VITAL (AURORA DA HUMANIDADE): Preenche 99% das matrizes ECS com ZERO para o terreno vazio
    const ecsState = {
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
    const state = {
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
                { path: enums_1.VictoryPath.TerritorialDomination, threshold: 0.55 },
                { path: enums_1.VictoryPath.DiplomaticHegemony, threshold: 0.65 },
                { path: enums_1.VictoryPath.EconomicSupremacy, threshold: 0.7 },
                { path: enums_1.VictoryPath.ReligiousSupremacy, threshold: 0.68 },
                { path: enums_1.VictoryPath.DynasticLegacy, threshold: 0.72 }
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
    // Initialize ruler and heirs for each kingdom (except k_nature)
    state.world.characters = {};
    const kingdomCultures = {
        k_player: "latin",
        k_npc_1: "desert",
        k_npc_2: "desert",
        k_npc_3: "vedic",
        k_npc_4: "eastern"
    };
    for (const kingdomId of Object.keys(state.kingdoms)) {
        if (kingdomId === "k_nature")
            continue;
        const kingdom = state.kingdoms[kingdomId];
        const culture = kingdomCultures[kingdomId] || "latin";
        // Create ruler (age ~30, birthTick = -360)
        const rulerId = `ruler_${kingdomId}_${now}`;
        const ruler = createInitialCharacter(rulerId, kingdomId, culture, -360, "Soberano", "ruler");
        state.world.characters[rulerId] = ruler;
        kingdom.rulerId = rulerId;
        // Create heir 1 (age ~8, birthTick = -96)
        const heir1Id = `heir1_${kingdomId}_${now}`;
        const heir1 = createInitialCharacter(heir1Id, kingdomId, culture, -96, "", "ruler");
        heir1.title = heir1.gender === "male" ? "Príncipe" : "Princesa";
        state.world.characters[heir1Id] = heir1;
        // Create heir 2 (age ~8, birthTick = -96)
        const heir2Id = `heir2_${kingdomId}_${now}`;
        const heir2 = createInitialCharacter(heir2Id, kingdomId, culture, -96, "", "ruler");
        heir2.title = heir2.gender === "male" ? "Príncipe" : "Princesa";
        state.world.characters[heir2Id] = heir2;
        kingdom.heirs = [heir1Id, heir2Id];
        if (kingdom.npc) {
            const sovereignTraitId = ruler.traits.find(t => t !== "nobre" && t !== "herdeiro");
            const trait = character_1.SOVEREIGN_TRAITS.find(t => t.id === sovereignTraitId);
            const personality = kingdom.npc.personality;
            const keys = ['ambition', 'caution', 'greed', 'zeal', 'honor', 'betrayalTendency'];
            for (const key of keys) {
                let val = personality[key] + (Math.random() * 0.24 - 0.12);
                if (trait?.npcModifiers) {
                    const mod = trait.npcModifiers[key];
                    if (mod !== undefined) {
                        val += mod;
                    }
                }
                personality[key] = Math.max(0.0, Math.min(1.0, val));
            }
        }
    }
    createSeedRelations(state);
    for (const regionId of Object.keys(state.world.regions).sort()) {
        const region = state.world.regions[regionId];
        region.actionCooldowns = region.actionCooldowns ?? {};
    }
    return state;
}

import type { SaveSnapshot } from "../../core/contracts/game-ports";
import type { Treaty } from "../../core/models/diplomacy";
import { AutomationLevel, TechnologyDomain } from "../../core/models/enums";
import type { GameState } from "../../core/models/game-state";
import { buildTreatyId, buildWarIdFromSides, sortUniqueIds } from "../../core/models/identifiers";
import type { WarId } from "../../core/models/types";
import { generateCulturalName, CultureId } from "../../core/simulation/systems/culture-generator";

export const SAVE_SCHEMA_VERSION = 4;

export interface SaveEnvelope {
  schemaVersion: number;
  storedAt: number;
  snapshot: SaveSnapshot;
}

export interface CurrentStateEnvelope {
  schemaVersion: number;
  storedAt: number;
  state: GameState;
}

export function createCurrentStateEnvelope(state: GameState): CurrentStateEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    state
  };
}

export function toSaveEnvelope(snapshot: SaveSnapshot): SaveEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    snapshot
  };
}

export function isValidEnvelope(input: unknown): input is SaveEnvelope {
  return normalizeSaveEnvelope(input) !== null;
}

export function isValidGameStateShape(input: unknown): input is GameState {
  if (!input || typeof input !== "object") {
    return false;
  }

  const state = input as Partial<GameState>;
  return !!state.meta && !!state.campaign && !!state.world && !!state.kingdoms && !!state.victory;
}

function isKnownSchemaVersion(version: number): boolean {
  return Number.isInteger(version) && version >= 1 && version <= SAVE_SCHEMA_VERSION;
}

function migrateWars(state: GameState): void {
  const remappedWars: Record<WarId, GameState["wars"][string]> = {};
  const warIds = Object.keys(state.wars).sort();

  for (const [index, warId] of warIds.entries()) {
    const war = state.wars[warId];
    const attackers = sortUniqueIds(war.attackers);
    const defenders = sortUniqueIds(war.defenders);
    const stamp = Number.isFinite(war.startedAt) ? war.startedAt : state.meta.createdAt + index;
    const baseId = buildWarIdFromSides(attackers, defenders, stamp);

    let canonicalId = baseId;
    let collisionIndex = 1;
    while (remappedWars[canonicalId]) {
      canonicalId = `${baseId}~${collisionIndex}`;
      collisionIndex += 1;
    }

    remappedWars[canonicalId] = {
      ...war,
      id: canonicalId,
      attackers,
      defenders
    };
  }

  state.wars = remappedWars;
}

function migrateTreaties(state: GameState): void {
  const kingdomIds = Object.keys(state.kingdoms).sort();

  for (const kingdomId of kingdomIds) {
    const kingdom = state.kingdoms[kingdomId];
    const merged = new Map<string, Treaty>();

    for (const treaty of kingdom.diplomacy.treaties) {
      const parties = sortUniqueIds(treaty.parties);
      const signedAt = Number.isFinite(treaty.signedAt) ? treaty.signedAt : 0;
      const canonicalId = buildTreatyId(treaty.type, parties, signedAt);
      const normalized: Treaty = {
        ...treaty,
        id: canonicalId,
        parties,
        signedAt
      };

      const previous = merged.get(canonicalId);
      if (!previous || previous.signedAt <= normalized.signedAt) {
        merged.set(canonicalId, normalized);
      }
    }

    kingdom.diplomacy.treaties = Array.from(merged.values()).sort((left, right) => left.signedAt - right.signedAt);
  }
}

function sanitizeEcsState(ecs: any): void {
  if (!ecs) return;
  const INT_KEYS = new Set(["regionOwner", "factionCasualties", "cmdType", "cmdFaction"]);
  const SCALAR_KEYS = new Set(["accumulatedSimulatedTime", "conquestEpoch", "cmdHead", "cmdTail"]);

  for (const key of Object.keys(ecs)) {
    const data = ecs[key];
    if (data === undefined || data === null) continue;
    if (SCALAR_KEYS.has(key) || typeof data === "number") continue;

    const values = Array.isArray(data) ? data : (typeof data === "object" ? Object.values(data) : []);
    if (INT_KEYS.has(key)) {
      if (!(data instanceof Int32Array)) {
        ecs[key] = new Int32Array(values as number[]);
      }
    } else {
      if (!(data instanceof Float64Array) && !(data instanceof Float32Array)) {
        ecs[key] = new Float64Array(values as number[]);
      }
    }
  }

  // Sanear e restaurar campos do ECS que possam ter sido perdidos em saves truncados legados
  const TOTAL_REGIONS = 10000;
  const TOTAL_FACTIONS = 256;
  if (!ecs.regionOwner) ecs.regionOwner = new Int32Array(TOTAL_REGIONS).fill(-1);
  if (!ecs.regionCaptureProgress) ecs.regionCaptureProgress = new Float32Array(TOTAL_REGIONS);
  if (!ecs.regionSupplyCapacity) ecs.regionSupplyCapacity = new Float32Array(TOTAL_REGIONS);
  if (!ecs.regionCurrentSupply) ecs.regionCurrentSupply = new Float32Array(TOTAL_REGIONS);
  if (!ecs.regionManpowerYield) ecs.regionManpowerYield = new Float32Array(TOTAL_REGIONS);
  if (!ecs.regionManpowerCap) ecs.regionManpowerCap = new Float32Array(TOTAL_REGIONS);
  if (!ecs.regionGoldYield) ecs.regionGoldYield = new Float32Array(TOTAL_REGIONS);
  if (!ecs.factionManpowerCap) ecs.factionManpowerCap = new Float32Array(TOTAL_FACTIONS);
  if (!ecs.factionGoldBalance) ecs.factionGoldBalance = new Float32Array(TOTAL_FACTIONS);
  if (!ecs.factionManpowerReserve) ecs.factionManpowerReserve = new Float32Array(TOTAL_FACTIONS);
  if (!ecs.factionCasualties) ecs.factionCasualties = new Int32Array(TOTAL_FACTIONS);
  if (typeof ecs.accumulatedSimulatedTime !== "number") ecs.accumulatedSimulatedTime = 0;
  if (typeof ecs.conquestEpoch !== "number") ecs.conquestEpoch = 0;
  if (typeof ecs.cmdHead !== "number") ecs.cmdHead = 0;
  if (typeof ecs.cmdTail !== "number") ecs.cmdTail = 0;
}

export function migrateStateToCurrent(state: GameState): GameState {
  const migrated = structuredClone(state);
  migrateWars(migrated);
  migrateTreaties(migrated);

  if (migrated.ecs) {
    sanitizeEcsState(migrated.ecs);
  }

  const worldMutable = migrated.world as GameState["world"] & {
    definitions?: unknown;
    routes?: unknown;
    neighborsByRegionId?: unknown;
  };
  delete worldMutable.definitions;
  delete worldMutable.routes;
  delete worldMutable.neighborsByRegionId;

  if (typeof migrated.world.mapId !== "string" || migrated.world.mapId.length === 0) {
    migrated.world.mapId = migrated.campaign.mapId;
  }

  if (!migrated.world.characters) {
    migrated.world.characters = {};
  }

  for (const kingdomId of Object.keys(migrated.kingdoms).sort()) {
    const kingdom = migrated.kingdoms[kingdomId];
    
    if (!kingdom.rulerId) {
      const rulerId = `char_${kingdomId}_ruler`;
      kingdom.rulerId = rulerId;
      // Generate culture and properties based on kingdom id or name
      let cultureId = 'latin';
      let title = 'Rei';
      let gender: 'male' | 'female' = Math.random() > 0.5 ? 'male' : 'female';
      
      if (kingdomId === 'k_npc_1' || kingdom.name.includes('Uruk')) {
        cultureId = 'desert';
        title = 'Rei-Sacerdote';
      } else if (kingdomId === 'k_npc_2' || kingdom.name.includes('Nilo')) {
        cultureId = 'savanna';
        title = 'Faraó';
      } else if (kingdomId === 'k_npc_3' || kingdom.name.includes('Harappa')) {
        cultureId = 'vedic';
        title = 'Rajá';
      } else if (kingdomId === 'k_npc_4' || kingdom.name.includes('Xia')) {
        cultureId = 'eastern';
        title = 'Imperador';
      }

      migrated.world.characters[rulerId] = {
        id: rulerId,
        name: generateCulturalName(cultureId as CultureId, gender),
        title: title,
        cultureId: cultureId,
        gender: gender,
        portraitSeed: kingdomId + '_' + Math.floor(Math.random() * 1000),
        birthTick: 0,
        deathTick: null,
        isLegendary: false,
        status: 'ruler',
        locationKingdomId: kingdomId,
        employerKingdomId: kingdomId,
        affinity: { institutionalLoyalty: 100, personalAffinity: 100 },
        personalWealth: 100,
        influence: 50,
        memory: [],
        stats: { administration: 5, martial: 5, diplomacy: 5, intrigue: 5, learning: 5 },
        traits: [],
        level: 1,
        experience: 0,
        unspentTalentPoints: 0
      } as any;
    }

    // Safety for newer milestone fields (like administration, diplomacy, economy fields)
    if (!kingdom.economy.taxPolicy) {
      kingdom.economy.taxPolicy = {
        baseRate: 0.20,
        nobleRelief: 0.0,
        clergyExemption: 0.0,
        tariffRate: 0.05
      };
      kingdom.economy.corruption = kingdom.economy.corruption || 0.0;
    }
  }

  // R1 Bugfix: Garante que todos os personagens tenham imagens diferentes mesmo em saves antigos
  if (migrated.world.characters) {
    for (const charId in migrated.world.characters) {
      const char = migrated.world.characters[charId] as any;
      if (!char.cultureId || !char.portraitSeed) {
        let cultureId = 'latin';
        if (char.employerKingdomId === 'k_npc_1') cultureId = 'desert';
        else if (char.employerKingdomId === 'k_npc_2') cultureId = 'savanna';
        else if (char.employerKingdomId === 'k_npc_3') cultureId = 'vedic';
        else if (char.employerKingdomId === 'k_npc_4') cultureId = 'eastern';
        
        char.cultureId = char.cultureId || cultureId;
        char.portraitSeed = char.portraitSeed || (char.id + '_' + Math.floor(Math.random() * 1000));
        char.gender = char.gender || (Math.random() > 0.5 ? 'male' : 'female');
      }
    }
  }

  for (const kingdomId of Object.keys(migrated.kingdoms).sort()) {
    const kingdom = migrated.kingdoms[kingdomId];
    
    if (!kingdom.economy.budgetPriority) {
      kingdom.economy.budgetPriority = { military: 20, economy: 50, religion: 10, administration: 10, technology: 10 };
    } else {
      if (typeof kingdom.economy.budgetPriority.administration !== 'number') kingdom.economy.budgetPriority.administration = 10;
      if (typeof kingdom.economy.budgetPriority.technology !== 'number') kingdom.economy.budgetPriority.technology = 10;
    }

    if (!kingdom.administration) {
      kingdom.administration = {
        adminCapacity: 10,
        usedCapacity: 0,
        corruption: 0,
        policy: { regionalAutonomyTarget: 0.5, directRuleBias: 0.5, assimilationInvestment: 0.1, antiCorruptionBudget: 0.1 },
        regionalControl: [],
        automation: {
          economy: AutomationLevel.Manual, construction: AutomationLevel.Manual, defense: AutomationLevel.Manual, diplomacyReactive: AutomationLevel.Manual, expansion: AutomationLevel.Manual, technology: AutomationLevel.Manual
        },
        council: {},
        candidatePool: [],
        activeAdvice: []
      };
    }

    if (!kingdom.diplomacy) {
      kingdom.diplomacy = {
        relations: {},
        treaties: [],
        coalitionThreat: 0,
        warExhaustion: 0
      };
    }

    if (!kingdom.technology.researchFocus) {
      kingdom.technology.researchFocus = TechnologyDomain.Administration;
    }
    if (typeof kingdom.technology.researchGoalId === "undefined") {
      kingdom.technology.researchGoalId = null;
    }

    for (const relationId of Object.keys(kingdom.diplomacy.relations || {}).sort()) {
      const relation = kingdom.diplomacy.relations[relationId];
      if (!relation.actionCooldowns) {
        relation.actionCooldowns = {};
      }
    }

    if (typeof kingdom.religion.stateFaith !== "string" || kingdom.religion.stateFaith.length === 0) {
      kingdom.religion.stateFaith = "imperial_church";
    }
    if (typeof kingdom.religion.missionaryBudget !== "number") {
      const budgetShare = (kingdom.economy.budgetPriority.religion ?? 10) / 100;
      kingdom.religion.missionaryBudget = Math.max(0, Math.min(1, budgetShare));
    }
    if (!kingdom.religion.externalInfluenceIn || typeof kingdom.religion.externalInfluenceIn !== "object") {
      kingdom.religion.externalInfluenceIn = {};
    }
    if (typeof kingdom.religion.holyWarCooldownUntil !== "number") {
      kingdom.religion.holyWarCooldownUntil = 0;
    }
    if (typeof kingdom.hasAscended !== "boolean") {
      kingdom.hasAscended = false;
    }
    if (typeof kingdom.ascensionPostponed !== "boolean") {
      kingdom.ascensionPostponed = false;
    }
    if (typeof (kingdom as any).governmentSystemId !== "string" || (kingdom as any).governmentSystemId.length === 0) {
      (kingdom as any).governmentSystemId = kingdom.hasAscended === true ? "monarchy" : "band";
    }
  }

  for (const regionId of Object.keys(migrated.world.regions).sort()) {
    const region = migrated.world.regions[regionId];
    delete (region as any).localFaithStrength;
    delete (region as any).dominantFaith;
    delete (region as any).dominantShare;
    delete (region as any).minorityFaith;
    delete (region as any).minorityShare;
    delete (region as any).faithUnrest;

    if (!region.actionCooldowns) {
      region.actionCooldowns = {};
    }
  }

  migrated.meta.schemaVersion = SAVE_SCHEMA_VERSION;
  return migrated;
}

function extractSnapshot(input: unknown): SaveSnapshot | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const snapshot = input as Partial<SaveSnapshot>;
  if (!snapshot.summary || !isValidGameStateShape(snapshot.state)) {
    return null;
  }

  return {
    summary: snapshot.summary,
    state: migrateStateToCurrent(snapshot.state)
  };
}

export function normalizeSaveEnvelope(input: unknown): SaveEnvelope | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const envelope = input as Partial<SaveEnvelope>;
  if (typeof envelope.schemaVersion !== "number" || !isKnownSchemaVersion(envelope.schemaVersion)) {
    return null;
  }

  if (typeof envelope.storedAt !== "number") {
    return null;
  }

  const snapshot = extractSnapshot(envelope.snapshot);
  if (!snapshot) {
    return null;
  }

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: envelope.storedAt,
    snapshot
  };
}

export function normalizeCurrentStateEnvelope(input: unknown): CurrentStateEnvelope | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const envelope = input as Partial<CurrentStateEnvelope>;

  if (typeof envelope.schemaVersion !== "number" || !isKnownSchemaVersion(envelope.schemaVersion)) {
    return null;
  }

  if (typeof envelope.storedAt !== "number" || !isValidGameStateShape(envelope.state)) {
    return null;
  }

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: envelope.storedAt,
    state: migrateStateToCurrent(envelope.state)
  };
}

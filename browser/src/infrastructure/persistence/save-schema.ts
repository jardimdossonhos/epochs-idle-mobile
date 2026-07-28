import type { SaveSnapshot } from "../../core/contracts/game-ports";
import type { Treaty } from "../../core/models/diplomacy";
import { TechnologyDomain } from "../../core/models/enums";
import type { GameState } from "../../core/models/game-state";
import { buildTreatyId, buildWarIdFromSides, sortUniqueIds } from "../../core/models/identifiers";
import type { WarId } from "../../core/models/types";

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

function migrateStateToCurrent(state: GameState): GameState {
  const migrated = structuredClone(state);
  migrateWars(migrated);
  migrateTreaties(migrated);

  if (migrated.ecs) {
    for (const key of Object.keys(migrated.ecs) as Array<keyof typeof migrated.ecs>) {
      const data = migrated.ecs[key];
      if (data && !(data instanceof Float64Array)) {
        migrated.ecs[key] = new Float64Array(Object.values(data));
      }
    }
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

  for (const kingdomId of Object.keys(migrated.kingdoms).sort()) {
    const kingdom = migrated.kingdoms[kingdomId];
    if (!kingdom.technology.researchFocus) {
      kingdom.technology.researchFocus = TechnologyDomain.Administration;
    }
    if (typeof kingdom.technology.researchGoalId === "undefined") {
      kingdom.technology.researchGoalId = null;
    }

    for (const relationId of Object.keys(kingdom.diplomacy.relations).sort()) {
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
  }

  for (const regionId of Object.keys(migrated.world.regions).sort()) {
    const region = migrated.world.regions[regionId] as GameState["world"]["regions"][string] & {
      localFaithStrength?: unknown;
      dominantFaith?: unknown;
      dominantShare?: unknown;
      minorityFaith?: unknown;
      minorityShare?: unknown;
      faithUnrest?: unknown;
    };
    const ownerFaith = migrated.kingdoms[region.ownerId]?.religion.stateFaith ?? "imperial_church";
    const legacyFaithStrength = typeof region.localFaithStrength === "number"
      ? Math.max(0, Math.min(1, region.localFaithStrength))
      : null;

    if (typeof region.dominantFaith !== "string" || region.dominantFaith.length === 0) {
      region.dominantFaith = ownerFaith;
    }
    if (typeof region.dominantShare !== "number") {
      region.dominantShare = legacyFaithStrength ?? 0.7;
    }
    region.dominantShare = Math.max(0.05, Math.min(0.95, region.dominantShare));

    if (typeof region.minorityFaith !== "string" || region.minorityFaith.length === 0) {
      region.minorityFaith = undefined;
      region.minorityShare = undefined;
    } else if (typeof region.minorityShare !== "number" || region.minorityShare <= 0) {
      region.minorityShare = 0.12;
    }

    if (typeof region.minorityShare === "number") {
      region.minorityShare = Math.max(0.02, Math.min(0.45, region.minorityShare));
      if (region.dominantShare + region.minorityShare > 0.98) {
        region.minorityShare = Math.max(0.02, 0.98 - region.dominantShare);
      }
    }

    if (typeof region.faithUnrest !== "number") {
      const minority = typeof region.minorityShare === "number" ? region.minorityShare : 0;
      region.faithUnrest = Math.max(0, Math.min(1, region.unrest * 0.45 + minority * 0.35));
    }
    region.faithUnrest = Math.max(0, Math.min(1, region.faithUnrest));

    delete region.localFaithStrength;

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

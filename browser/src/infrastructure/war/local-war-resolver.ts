import type { WarResolver } from "../../core/contracts/services";
import type { Treaty } from "../../core/models/diplomacy";
import { DiplomaticRelation, TreatyType } from "../../core/models/enums";
import type { GameState, KingdomState, WarFront, WarState } from "../../core/models/game-state";
import { buildTreatyId, sortUniqueIds, buildWarIdFromSides } from "../../core/models/identifiers";
import type { StaticWorldData } from "../../core/models/static-world-data";
import type { KingdomId } from "../../core/models/types";

const PEACE_TREATY_DURATION_MS = 1000 * 60 * 28;
const WAR_DECLARATION_COOLDOWN_MS = 1000 * 60 * 6;
const WAR_TRUCE_COOLDOWN_MS = 1000 * 60 * 12;
const WAR_COOLDOWN_KEY = "war:declaration";
const CONQUEST_THRESHOLD = 34;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getDistance(defs: StaticWorldData["definitions"], regionA: string, regionB: string): number {
  const a = defs[regionA]?.center;
  const b = defs[regionB]?.center;
  if (!a || !b) return Infinity;
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function relationCooldownUntil(state: GameState, leftId: KingdomId, rightId: KingdomId): number {
  const left = state.kingdoms[leftId]?.diplomacy.relations[rightId]?.actionCooldowns?.[WAR_COOLDOWN_KEY] ?? 0;
  const right = state.kingdoms[rightId]?.diplomacy.relations[leftId]?.actionCooldowns?.[WAR_COOLDOWN_KEY] ?? 0;
  return Math.max(left, right);
}

function applyRelationCooldown(state: GameState, leftId: KingdomId, rightId: KingdomId, until: number): void {
  const left = state.kingdoms[leftId]?.diplomacy.relations[rightId];
  const right = state.kingdoms[rightId]?.diplomacy.relations[leftId];

  if (left) {
    left.actionCooldowns = left.actionCooldowns ?? {};
    left.actionCooldowns[WAR_COOLDOWN_KEY] = until;
  }

  if (right) {
    right.actionCooldowns = right.actionCooldowns ?? {};
    right.actionCooldowns[WAR_COOLDOWN_KEY] = until;
  }
}

function militaryPower(kingdom: KingdomState): number {
  return kingdom.military.armies.reduce((total, army) => {
    const qualityFactor = 0.6 + army.quality * 0.4;
    const sustainFactor = 0.55 + army.morale * 0.25 + army.supply * 0.2;
    return total + army.manpower * qualityFactor * sustainFactor;
  }, 0);
}

function participantPower(state: GameState, participants: KingdomId[]): number {
  return participants.reduce((total, participantId) => {
    const kingdom = state.kingdoms[participantId];
    if (!kingdom) {
      return total;
    }

    const power = militaryPower(kingdom) * (1 + kingdom.military.militaryTechLevel * 0.1);
    return total + power;
  }, 0);
}

function activeWarCount(state: GameState, kingdomId: KingdomId): number {
  let total = 0;

  for (const warId of Object.keys(state.wars).sort()) {
    const war = state.wars[warId];
    if (war.attackers.includes(kingdomId) || war.defenders.includes(kingdomId)) {
      total += 1;
    }
  }

  return total;
}

function isAtWar(kingdomId: KingdomId, war: WarState): boolean {
  return war.attackers.includes(kingdomId) || war.defenders.includes(kingdomId);
}

function areInActiveWar(state: GameState, leftId: KingdomId, rightId: KingdomId): boolean {
  for (const warId of Object.keys(state.wars).sort()) {
    const war = state.wars[warId];
    const leftInWar = isAtWar(leftId, war);
    const rightInWar = isAtWar(rightId, war);

    if (leftInWar && rightInWar) {
      return true;
    }
  }

  return false;
}

function hasActivePeaceTreaty(state: GameState, leftId: KingdomId, rightId: KingdomId, now: number): boolean {
  const kingdom = state.kingdoms[leftId];

  if (!kingdom) {
    return false;
  }

  return kingdom.diplomacy.treaties.some(
    (treaty) =>
      treaty.type === TreatyType.Peace &&
      treaty.parties.includes(leftId) &&
      treaty.parties.includes(rightId) &&
      (treaty.expiresAt === null || treaty.expiresAt > now)
  );
}

function setPairStatus(state: GameState, leftId: KingdomId, rightId: KingdomId, status: DiplomaticRelation): void {
  const left = state.kingdoms[leftId];
  const right = state.kingdoms[rightId];

  if (!left || !right) {
    return;
  }

  const leftRelation = left.diplomacy.relations[rightId];
  const rightRelation = right.diplomacy.relations[leftId];

  if (leftRelation) {
    leftRelation.status = status;
  }

  if (rightRelation) {
    rightRelation.status = status;
  }
}

function addTreaty(kingdom: KingdomState, treaty: Treaty): void {
  const existingIndex = kingdom.diplomacy.treaties.findIndex((entry) => entry.id === treaty.id);

  if (existingIndex >= 0) {
    kingdom.diplomacy.treaties[existingIndex] = treaty;
    return;
  }

  kingdom.diplomacy.treaties.push(treaty);
}

function addPeaceTreaty(state: GameState, leftId: KingdomId, rightId: KingdomId, signedAt: number): void {
  const left = state.kingdoms[leftId];
  const right = state.kingdoms[rightId];

  if (!left || !right) {
    return;
  }

  const parties = sortUniqueIds([leftId, rightId]);
  const treaty: Treaty = {
    id: buildTreatyId(TreatyType.Peace, parties, signedAt),
    type: TreatyType.Peace,
    parties,
    signedAt,
    expiresAt: signedAt + PEACE_TREATY_DURATION_MS,
    terms: {
      borderFreeze: true,
      warReparations: 0
    }
  };

  addTreaty(left, treaty);
  addTreaty(right, treaty);
}

function findBorderFrontsMany(
  state: GameState,
  definitions: StaticWorldData["definitions"],
  attackers: string[],
  defenders: string[]
): WarFront[] {
  const fronts: WarFront[] = [];
  const defenderRegionSet = new Set<string>();
  for (const d of defenders) {
    for (const rId of Object.keys(state.world.regions)) {
      if (state.world.regions[rId].ownerId === d) defenderRegionSet.add(rId);
    }
  }
  for (const a of attackers) {
    const attackerRegions = Object.keys(state.world.regions).filter(rId => state.world.regions[rId].ownerId === a);
    for (const rId of attackerRegions) {
      const def = definitions[rId];
      if (!def) continue;
      for (const nId of def.neighbors) {
        if (defenderRegionSet.has(nId)) fronts.push({ regionId: nId, pressureAttackers: 50, pressureDefenders: 50 });
      }
    }
  }
  if (fronts.length > 0) {
    const unique = new Map<string, WarFront>();
    for (const f of fronts) unique.set(f.regionId, f);
    return Array.from(unique.values());
  }
  return findBorderFronts(state, definitions, attackers[0], defenders[0]);
}

function findBorderFronts(
  state: GameState,
  definitions: StaticWorldData["definitions"],
  attackerId: KingdomId,
  defenderId: KingdomId
): WarFront[] {
  const attackerRegions = Object.keys(state.world.regions)
    .sort()
    .filter((regionId) => state.world.regions[regionId].ownerId === attackerId)
    .sort();

  const defenderRegionSet = new Set(
    Object.keys(state.world.regions)
      .sort()
      .filter((regionId) => state.world.regions[regionId].ownerId === defenderId)
  );

  const fronts: WarFront[] = [];

  for (const regionId of attackerRegions) {
    const definition = definitions[regionId];

    if (!definition) {
      continue;
    }

    for (const neighborId of [...definition.neighbors].sort()) {
      if (!defenderRegionSet.has(neighborId)) {
        continue;
      }

      fronts.push({
        regionId: neighborId,
        pressureAttackers: 50,
        pressureDefenders: 50
      });
    }
  }

  if (fronts.length > 0) {
    return fronts;
  }

  const defenderRegions = Object.keys(state.world.regions).filter(r => state.world.regions[r].ownerId === defenderId);
  const attackerCenter = definitions[state.kingdoms[attackerId]?.capitalRegionId]?.center;
  let bestFallback = state.kingdoms[defenderId]?.capitalRegionId ?? state.kingdoms[attackerId].capitalRegionId;
  
  if (attackerCenter && defenderRegions.length > 0) {
      let minDist = Infinity;
      for (const rId of defenderRegions) {
          const dist = getDistance(definitions, state.kingdoms[attackerId].capitalRegionId, rId);
          if (dist < minDist) {
              minDist = dist;
              bestFallback = rId;
          }
      }
  }

  return [
    {
      regionId: bestFallback,
      pressureAttackers: 50,
      pressureDefenders: 50
    }
  ];
}

function reduceArmyForWar(kingdom: KingdomState, intensity: number, war: WarState): void {
  let deadThisTick = 0;
  for (const army of kingdom.military.armies) {
    const supplyPenalty = 1 + (1 - army.supply) * 0.7;
    const attritionRate = (0.0015 + intensity * 0.0018) * supplyPenalty;

    const previousManpower = army.manpower;
    // Removido o piso irrealista de 800. Se a guerra for brutal, o exército pode ser dizimado até sobrar 100 homens.
    army.manpower = Math.max(100, Math.round(army.manpower * (1 - attritionRate)));
    deadThisTick += (previousManpower - army.manpower);

    army.morale = roundTo(clamp(army.morale - 0.003 - intensity * 0.005, 0.25, 1));
    army.supply = roundTo(clamp(army.supply - 0.002 - intensity * 0.004, 0.25, 1));
  }

  if (deadThisTick > 0) {
    war.casualties = war.casualties || {};
    war.casualties[kingdom.id] = (war.casualties[kingdom.id] || 0) + deadThisTick;
  }
}

function applyConquest(
  state: GameState,
  definitions: StaticWorldData["definitions"],
  winners: KingdomId[],
  losers: KingdomId[]
): { regionId: string; previousOwnerId: KingdomId; newOwnerId: KingdomId } | null {
  if (winners.length === 0 || losers.length === 0) {
    return null;
  }

  const winnerId = winners[0];
  const loserSet = new Set(losers);

  const winnerRegions = Object.keys(state.world.regions)
    .sort()
    .filter((regionId) => state.world.regions[regionId].ownerId === winnerId)
    .sort();

  const candidates = new Set<string>();

  for (const winnerRegionId of winnerRegions) {
    const definition = definitions[winnerRegionId];

    if (!definition) {
      continue;
    }

    for (const neighborId of definition.neighbors) {
      const neighborState = state.world.regions[neighborId];
      if (neighborState && loserSet.has(neighborState.ownerId)) {
        candidates.add(neighborId);
      }
    }
  }

  let targetRegionId: string | null = null;

  if (candidates.size > 0) {
    const sortedCandidates = Array.from(candidates).sort((a, b) => {
      const va = definitions[a]?.strategicValue ?? 0;
      const vb = definitions[b]?.strategicValue ?? 0;
      if (vb !== va) {
        return vb - va;
      }
      return a.localeCompare(b);
    });

    targetRegionId = sortedCandidates[0] ?? null;
  } else {
    const loserRegions = Object.keys(state.world.regions).filter(regionId => loserSet.has(state.world.regions[regionId].ownerId));
    let fallback = loserRegions[0];
    let minDistance = Infinity;
    for (const rId of loserRegions) {
        const dist = getDistance(definitions, state.kingdoms[winnerId]?.capitalRegionId, rId);
        if (dist < minDistance) {
            minDistance = dist;
            fallback = rId;
        }
    }
    targetRegionId = fallback ?? null;
  }

  if (!targetRegionId) {
    return null;
  }

  const region = state.world.regions[targetRegionId];
  const previousOwnerId = region.ownerId;

  region.ownerId = winnerId;
  region.controllerId = winnerId;
  region.autonomy = roundTo(clamp(region.autonomy + 0.2, 0, 1));
  region.assimilation = roundTo(clamp(Math.min(region.assimilation, 0.36), 0, 1));
  region.unrest = roundTo(clamp(region.unrest + 0.3, 0, 1));
  region.devastation = roundTo(clamp(region.devastation + 0.12, 0, 1));

  return {
    regionId: targetRegionId,
    previousOwnerId,
    newOwnerId: winnerId
  };
}

export class LocalWarResolver implements WarResolver {
  constructor(private readonly staticWorldData: StaticWorldData) {}

  evaluateWarRisk(attacker: KingdomState, defender: KingdomState, state: GameState): number {
    const now = state.meta.lastUpdatedAt;
    if (hasActivePeaceTreaty(state, attacker.id, defender.id, now) || areInActiveWar(state, attacker.id, defender.id)) {
      return 0;
    }

    if (relationCooldownUntil(state, attacker.id, defender.id) > now) {
      return 0;
    }

  if (getDistance(this.staticWorldData.definitions, attacker.capitalRegionId, defender.capitalRegionId) > 15.0) {
    return 0; // Limite de alcance logístico histórico inicial
  }

    const relation = attacker.diplomacy.relations[defender.id];
    const tension = relation
      ? relation.score.rivalry * 0.34 + relation.score.borderTension * 0.21 + relation.grievance * 0.3 + (1 - relation.score.trust) * 0.15
      : 0.32;

    const attackerPower = Math.max(1, militaryPower(attacker));
    const defenderPower = Math.max(1, militaryPower(defender));
    const ratio = attackerPower / defenderPower;
    const powerFactor = clamp((ratio - 0.85) / 0.9, 0, 1);

    const stabilityFactor = clamp(attacker.stability / 100, 0, 1);
    const exhaustionPenalty = clamp(attacker.diplomacy.warExhaustion * 0.42, 0, 0.4);

    return roundTo(clamp(tension * 0.6 + powerFactor * 0.28 + stabilityFactor * 0.12 - exhaustionPenalty, 0, 1));
  }

  declareWar(state: GameState, attackerId: KingdomId, defenderId: KingdomId): GameState {
    if (attackerId === defenderId || !state.kingdoms[attackerId] || !state.kingdoms[defenderId]) {
      return state;
    }

    if (areInActiveWar(state, attackerId, defenderId)) {
      return state;
    }

    if (activeWarCount(state, attackerId) >= 2 || activeWarCount(state, defenderId) >= 2) {
      return state;
    }

    const now = state.meta.lastUpdatedAt;
    if (hasActivePeaceTreaty(state, attackerId, defenderId, now)) {
      return state;
    }

    if (relationCooldownUntil(state, attackerId, defenderId) > now) {
      return state;
    }

    const attackers = new Set([attackerId]);
    const defenders = new Set([defenderId]);

    // Cascatas de Alianças e Estados Lacaios
    const defenderObj = state.kingdoms[defenderId];
    for (const treaty of defenderObj.diplomacy.treaties) {
        if (treaty.type === TreatyType.Alliance) {
            const ally = treaty.parties.find(p => p !== defenderId);
            if (ally && state.kingdoms[ally] && !areInActiveWar(state, ally, attackerId)) defenders.add(ally);
        }
        if (treaty.type === TreatyType.Vassalage) {
            const overlord = treaty.terms.overlordId as string;
            const vassal = treaty.terms.vassalId as string;
            if (vassal === defenderId && overlord !== attackerId && state.kingdoms[overlord]) defenders.add(overlord);
            if (overlord === defenderId && vassal !== attackerId && state.kingdoms[vassal]) defenders.add(vassal);
        }
    }

    const attackerObj = state.kingdoms[attackerId];
    for (const treaty of attackerObj.diplomacy.treaties) {
        if (treaty.type === TreatyType.Vassalage && treaty.terms.overlordId === attackerId) {
            const vassal = treaty.terms.vassalId as string;
            if (vassal !== defenderId && state.kingdoms[vassal]) attackers.add(vassal);
        }
    }

    const warId = buildWarIdFromSides(Array.from(attackers), Array.from(defenders), state.meta.tick);
    if (state.wars[warId]) {
      return state;
    }

    const fronts = findBorderFrontsMany(state, this.staticWorldData.definitions, Array.from(attackers), Array.from(defenders));

    state.wars[warId] = {
      id: warId,
      attackers: Array.from(attackers),
      defenders: Array.from(defenders),
      warScore: 0,
      startedAt: now,
      fronts,
      casualties: {}
    };

    for (const a of attackers) {
      for (const d of defenders) {
        setPairStatus(state, a, d, DiplomaticRelation.Hostile);
        applyRelationCooldown(state, a, d, now + WAR_DECLARATION_COOLDOWN_MS);
      }
      state.kingdoms[a].diplomacy.warExhaustion = roundTo(clamp(state.kingdoms[a].diplomacy.warExhaustion + 0.02, 0, 1));
    }
    
    for (const d of defenders) {
      state.kingdoms[d].diplomacy.warExhaustion = roundTo(clamp(state.kingdoms[d].diplomacy.warExhaustion + 0.03, 0, 1));
    }

    return state;
  }

  enforcePeace(state: GameState, warId: string): GameState {
    const war = state.wars[warId];

    if (!war) {
      return state;
    }

    const signedAt = state.meta.lastUpdatedAt;

    for (const attackerId of war.attackers) {
      for (const defenderId of war.defenders) {
        setPairStatus(state, attackerId, defenderId, DiplomaticRelation.Truce);
        addPeaceTreaty(state, attackerId, defenderId, signedAt);
        applyRelationCooldown(state, attackerId, defenderId, signedAt + WAR_TRUCE_COOLDOWN_MS);
      }
    }

    for (const kingdomId of [...war.attackers, ...war.defenders]) {
      const kingdom = state.kingdoms[kingdomId];
      kingdom.diplomacy.warExhaustion = roundTo(clamp(kingdom.diplomacy.warExhaustion * 0.72, 0, 1));
    }

    delete state.wars[warId];
    return state;
  }

  resolveTick(state: GameState, now: number): GameState {
    if (state.meta.tick % 12 === 0) {
      this.maybeOpenAutonomousWar(state);
    }

    const warsToPeace: string[] = [];

    for (const warId of Object.keys(state.wars).sort()) {
      const war = state.wars[warId];
      const attackerPower = participantPower(state, war.attackers);
      const defenderPower = participantPower(state, war.defenders);
      const combinedPower = Math.max(1, attackerPower + defenderPower);

      if (attackerPower < 300 || defenderPower < 300) {
        warsToPeace.push(war.id);
        continue;
      }

      const pressureDelta = (attackerPower - defenderPower) / combinedPower;
      war.warScore = roundTo(clamp(war.warScore + pressureDelta * 19, -100, 100));

      for (const front of [...war.fronts].sort((left, right) => left.regionId.localeCompare(right.regionId))) {
        front.pressureAttackers = roundTo(clamp(front.pressureAttackers + pressureDelta * 8, 0, 100));
        front.pressureDefenders = roundTo(clamp(100 - front.pressureAttackers, 0, 100));
      }

      const intensity = clamp(Math.abs(pressureDelta) + 0.25, 0.2, 1);
      const ageTicks = (now - war.startedAt) / Math.max(1, state.meta.tickDurationMs);
      const longWarPressure = clamp((ageTicks - 26) / 38, 0, 1);

      for (const attackerId of war.attackers) {
        const attacker = state.kingdoms[attackerId];
        reduceArmyForWar(attacker, intensity, war);
        attacker.diplomacy.warExhaustion = roundTo(
          clamp(attacker.diplomacy.warExhaustion + 0.003 + intensity * 0.004 + longWarPressure * 0.008, 0, 1)
        );
        attacker.economy.stock.gold = roundTo(Math.max(0, attacker.economy.stock.gold - longWarPressure * (0.22 + intensity * 0.14)));
      }

      for (const defenderId of war.defenders) {
        const defender = state.kingdoms[defenderId];
        reduceArmyForWar(defender, intensity, war);
        defender.diplomacy.warExhaustion = roundTo(
          clamp(defender.diplomacy.warExhaustion + 0.0035 + intensity * 0.004 + longWarPressure * 0.009, 0, 1)
        );
        defender.economy.stock.gold = roundTo(Math.max(0, defender.economy.stock.gold - longWarPressure * (0.24 + intensity * 0.16)));
      }

      if (war.warScore >= CONQUEST_THRESHOLD) {
        applyConquest(state, this.staticWorldData.definitions, war.attackers, war.defenders);
        war.warScore = roundTo(clamp(war.warScore - 24, -100, 100));
      } else if (war.warScore <= -CONQUEST_THRESHOLD) {
        applyConquest(state, this.staticWorldData.definitions, war.defenders, war.attackers);
        war.warScore = roundTo(clamp(war.warScore + 24, -100, 100));
      }

      if (ageTicks > 12 && state.meta.tick % 18 === 0) {
        if (war.warScore >= 0) {
          applyConquest(state, this.staticWorldData.definitions, war.attackers, war.defenders);
          war.warScore = roundTo(clamp(war.warScore - 12, -100, 100));
        } else {
          applyConquest(state, this.staticWorldData.definitions, war.defenders, war.attackers);
          war.warScore = roundTo(clamp(war.warScore + 12, -100, 100));
        }
      }

      if ((ageTicks > 42 && Math.abs(war.warScore) < 12) || this.mustForcePeace(war, state)) {
        warsToPeace.push(war.id);
      }
    }

    for (const warId of warsToPeace) {
      this.enforcePeace(state, warId);
    }

    return state;
  }

  private mustForcePeace(war: WarState, state: GameState): boolean {
    const participants = [...war.attackers, ...war.defenders];
    const exhausted = participants.filter((id) => state.kingdoms[id]?.diplomacy.warExhaustion > 0.9).length;
    return exhausted >= participants.length;
  }

  private maybeOpenAutonomousWar(state: GameState): void {
    const npcKingdomIds = Object.keys(state.kingdoms)
      .sort()
      .filter((kingdomId) => !state.kingdoms[kingdomId].isPlayer);
    let bestCandidate: { attackerId: KingdomId; defenderId: KingdomId; risk: number } | null = null;

    for (let index = 0; index < npcKingdomIds.length; index += 1) {
      for (let inner = index + 1; inner < npcKingdomIds.length; inner += 1) {
        const leftId = npcKingdomIds[index];
        const rightId = npcKingdomIds[inner];
        const left = state.kingdoms[leftId];
        const right = state.kingdoms[rightId];

        for (const [attacker, defender] of [
          [left, right],
          [right, left]
        ] as const) {
          const risk = this.evaluateWarRisk(attacker, defender, state);
          if (risk < 0.2) {
            continue;
          }

          if (!bestCandidate || risk > bestCandidate.risk) {
            bestCandidate = {
              attackerId: attacker.id,
              defenderId: defender.id,
              risk
            };
          }
        }
      }
    }

    if (!bestCandidate) {
      return;
    }

    this.declareWar(state, bestCandidate.attackerId, bestCandidate.defenderId);
  }
}

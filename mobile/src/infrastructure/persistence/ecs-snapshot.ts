/**
 * ECS Snapshot — Sparse Persistence Layer
 *
 * Converts the ECS TypedArrays into a compact sparse record, recording
 * only hexes that diverge from their known virgin state.
 *
 * SCHEMA VERSION: 2
 *
 * Canonical fields (Category A — must persist):
 *   Per-hex:  regionOwner, populationTotal, populationGrowthRate,
 *             gold, food, wood, iron, faith, legitimacy, manpower,
 *             regionDominantFaith, regionDominantShare,
 *             regionMinorityFaith, regionMinorityShare, regionFaithUnrest,
 *             regionCaptureProgress, regionCurrentSupply,
 *             hexStructures, visibilityMask
 *   Faction:  factionGoldBalance, factionManpowerReserve,
 *             factionCasualties, factionResources
 *   Scalars:  accumulatedSimulatedTime, conquestEpoch
 *
 * Derived fields (Category B — reconstructed on load):
 *   regionSupplyCapacity, regionManpowerYield, regionManpowerCap,
 *   regionGoldYield, factionManpowerCap, factionPopulation,
 *   factionRegions, factionPopulationGrowth, factionPeasants,
 *   factionNobles, factionClergy, factionSoldiers, factionMerchants,
 *   factionPopUnrest
 *
 * Transient fields (Category C — reset to zero on load):
 *   cmdHead, cmdTail, cmdType, cmdFaction, cmdArg0, cmdArg1,
 *   combatEventHead, combatEventTail, combatEventX, combatEventY, combatEventTs
 */

import type { EcsState } from '../../core/models/game-state';

/** Schema version. Any save with a different version is rejected on load. */
export const ECS_SNAPSHOT_VERSION = 2;

/**
 * Compact per-hex record. Short keys intentionally reduce JSON size.
 * IMPORTANT: `o` (regionOwner) is ALWAYS written, even when -1,
 * to avoid ambiguity between "never touched" and "abandoned".
 */
export interface HexSnapshot {
  o: number;    // regionOwner        — always present
  p?: number;   // populationTotal
  pg?: number;  // populationGrowthRate
  g?: number;   // gold
  f?: number;   // food
  w?: number;   // wood
  i?: number;   // iron
  fa?: number;  // faith
  l?: number;   // legitimacy
  m?: number;   // manpower
  df?: number;  // regionDominantFaith
  ds?: number;  // regionDominantShare
  mf?: number;  // regionMinorityFaith
  ms?: number;  // regionMinorityShare
  fu?: number;  // regionFaithUnrest
  cp?: number;  // regionCaptureProgress
  cs?: number;  // regionCurrentSupply
  s?: number;   // hexStructures
  v?: number;   // visibilityMask
}

/**
 * Top-level ECS snapshot stored in the save file.
 * `h` contains only hexes that `shouldPersistHex()` returns true for.
 */
export interface EcsSnapshot {
  /** Always == ECS_SNAPSHOT_VERSION. Checked on load; rejects old schemas. */
  sv: number;
  t: number;    // accumulatedSimulatedTime
  ce: number;   // conquestEpoch
  /** Sparse map: only modified hexes. Key is the hex index (integer). */
  h: Record<number, HexSnapshot>;
  /** factionGoldBalance — full array (small: 256 elements) */
  f_gb: number[];
  /** factionManpowerReserve — full array */
  f_mr: number[];
  /** factionCasualties — full array */
  f_c: number[];
  /** factionResources — full array (256 * 3 = 768 elements) */
  f_res: number[];
}

// ─── Virgin State Constants ───────────────────────────────────────────────────
// These match the values set in createInitialState for an untouched hex.
// A hex that matches all these values does NOT need to be stored.

const VIRGIN_OWNER = -1;
const VIRGIN_POP = 0;
const VIRGIN_GROWTH = 0;
const VIRGIN_GOLD = 0;
const VIRGIN_FOOD = 0;
const VIRGIN_WOOD = 0;
const VIRGIN_IRON = 0;
const VIRGIN_FAITH = 0;
const VIRGIN_LEGIT = 0;
const VIRGIN_MANPOWER = 0;
const VIRGIN_DOM_FAITH = 0;
const VIRGIN_DOM_SHARE = 1.0;
const VIRGIN_MIN_FAITH = -1;
const VIRGIN_MIN_SHARE = 0;
const VIRGIN_FAITH_UNREST = 0;
const VIRGIN_CAPTURE_PROG = 0;
const VIRGIN_CURRENT_SUPPLY = 1000;
const VIRGIN_STRUCTURES = 0;
const VIRGIN_VISIBILITY = 0;

/**
 * Returns true if the hex at `idx` must be included in the snapshot.
 *
 * Design: a hex is persisted whenever ANY field diverges from its virgin
 * (initial untouched) value. `regionOwner` is checked first as the most
 * common trigger; the remaining checks handle abandoned/residual cases.
 */
export function shouldPersistHex(idx: number, ecs: EcsState): boolean {
  return (
    ecs.regionOwner[idx] !== VIRGIN_OWNER ||
    ecs.populationTotal[idx] !== VIRGIN_POP ||
    ecs.hexStructures[idx] !== VIRGIN_STRUCTURES ||
    ecs.visibilityMask[idx] !== VIRGIN_VISIBILITY ||
    ecs.gold[idx] !== VIRGIN_GOLD ||
    ecs.food[idx] !== VIRGIN_FOOD ||
    ecs.wood[idx] !== VIRGIN_WOOD ||
    ecs.iron[idx] !== VIRGIN_IRON ||
    ecs.faith[idx] !== VIRGIN_FAITH ||
    ecs.legitimacy[idx] !== VIRGIN_LEGIT ||
    ecs.manpower[idx] !== VIRGIN_MANPOWER ||
    ecs.regionCaptureProgress[idx] !== VIRGIN_CAPTURE_PROG ||
    ecs.regionCurrentSupply[idx] !== VIRGIN_CURRENT_SUPPLY ||
    ecs.regionDominantFaith[idx] !== VIRGIN_DOM_FAITH ||
    ecs.regionDominantShare[idx] !== VIRGIN_DOM_SHARE ||
    ecs.regionMinorityFaith[idx] !== VIRGIN_MIN_FAITH ||
    ecs.regionMinorityShare[idx] !== VIRGIN_MIN_SHARE ||
    ecs.regionFaithUnrest[idx] !== VIRGIN_FAITH_UNREST
  );
}

/**
 * Builds a sparse EcsSnapshot from the live ECS arrays.
 *
 * Complexity: O(K) in the number of non-virgin hexes (K << 320 000 in normal play).
 * The full-length scan to FIND those hexes is O(N), but this is only called
 * during scheduled save events — never in the realtime simulation hot path.
 */
export function buildEcsSnapshot(ecs: EcsState): EcsSnapshot {
  const h: Record<number, HexSnapshot> = {};
  const len = ecs.regionOwner.length;

  for (let idx = 0; idx < len; idx++) {
    if (!shouldPersistHex(idx, ecs)) continue;

    // `o` is ALWAYS written (per contract — see item 1 in user requirements).
    const hex: HexSnapshot = { o: ecs.regionOwner[idx] };

    if (ecs.populationTotal[idx] !== VIRGIN_POP)
      hex.p = ecs.populationTotal[idx];
    if (ecs.populationGrowthRate[idx] !== VIRGIN_GROWTH)
      hex.pg = ecs.populationGrowthRate[idx];
    if (ecs.gold[idx] !== VIRGIN_GOLD)
      hex.g = ecs.gold[idx];
    if (ecs.food[idx] !== VIRGIN_FOOD)
      hex.f = ecs.food[idx];
    if (ecs.wood[idx] !== VIRGIN_WOOD)
      hex.w = ecs.wood[idx];
    if (ecs.iron[idx] !== VIRGIN_IRON)
      hex.i = ecs.iron[idx];
    if (ecs.faith[idx] !== VIRGIN_FAITH)
      hex.fa = ecs.faith[idx];
    if (ecs.legitimacy[idx] !== VIRGIN_LEGIT)
      hex.l = ecs.legitimacy[idx];
    if (ecs.manpower[idx] !== VIRGIN_MANPOWER)
      hex.m = ecs.manpower[idx];
    if (ecs.regionDominantFaith[idx] !== VIRGIN_DOM_FAITH)
      hex.df = ecs.regionDominantFaith[idx];
    if (ecs.regionDominantShare[idx] !== VIRGIN_DOM_SHARE)
      hex.ds = ecs.regionDominantShare[idx];
    if (ecs.regionMinorityFaith[idx] !== VIRGIN_MIN_FAITH)
      hex.mf = ecs.regionMinorityFaith[idx];
    if (ecs.regionMinorityShare[idx] !== VIRGIN_MIN_SHARE)
      hex.ms = ecs.regionMinorityShare[idx];
    if (ecs.regionFaithUnrest[idx] !== VIRGIN_FAITH_UNREST)
      hex.fu = ecs.regionFaithUnrest[idx];
    if (ecs.regionCaptureProgress[idx] !== VIRGIN_CAPTURE_PROG)
      hex.cp = ecs.regionCaptureProgress[idx];
    if (ecs.regionCurrentSupply[idx] !== VIRGIN_CURRENT_SUPPLY)
      hex.cs = ecs.regionCurrentSupply[idx];
    if (ecs.hexStructures[idx] !== VIRGIN_STRUCTURES)
      hex.s = ecs.hexStructures[idx];
    if (ecs.visibilityMask[idx] !== VIRGIN_VISIBILITY)
      hex.v = ecs.visibilityMask[idx];

    h[idx] = hex;
  }

  return {
    sv: ECS_SNAPSHOT_VERSION,
    t: ecs.accumulatedSimulatedTime,
    ce: ecs.conquestEpoch,
    h,
    f_gb: Array.from(ecs.factionGoldBalance),
    f_mr: Array.from(ecs.factionManpowerReserve),
    f_c: Array.from(ecs.factionCasualties),
    f_res: Array.from(ecs.factionResources),
  };
}

/**
 * Restores canonical ECS arrays from a snapshot into a freshly initialised EcsState.
 *
 * The caller is responsible for:
 *  1. Allocating a fresh EcsState via createInitialEcs() (or equivalent).
 *  2. Calling this function to overwrite only the persisted slots.
 *  3. Running derived-field aggregation (factionPopulation, etc.) via the
 *     normal tick pipeline on the first tick after load.
 *
 * Complexity: O(K) — iterates only the saved hexes.
 */
export function restoreEcsFromSnapshot(ecs: EcsState, snap: EcsSnapshot): void {
  ecs.accumulatedSimulatedTime = snap.t;
  ecs.conquestEpoch = snap.ce;

  // Faction arrays (small — 256 / 768 elements)
  const gb = new Float32Array(snap.f_gb);
  const mr = new Float32Array(snap.f_mr);
  const c  = new Int32Array(snap.f_c);
  const res = new Float32Array(snap.f_res);
  (ecs.factionGoldBalance as Float32Array).set(gb.subarray(0, (ecs.factionGoldBalance as Float32Array).length));
  (ecs.factionManpowerReserve as Float32Array).set(mr.subarray(0, (ecs.factionManpowerReserve as Float32Array).length));
  (ecs.factionCasualties as Int32Array).set(c.subarray(0, (ecs.factionCasualties as Int32Array).length));
  (ecs.factionResources as Float32Array).set(res.subarray(0, (ecs.factionResources as Float32Array).length));

  // Sparse hex restoration
  const entries = Object.entries(snap.h);
  for (const [idxStr, hex] of entries) {
    const idx = parseInt(idxStr, 10);
    if (Number.isNaN(idx)) continue;

    // `o` is always present per contract
    (ecs.regionOwner as Int32Array)[idx] = hex.o;

    if (hex.p  !== undefined) (ecs.populationTotal as Float64Array)[idx]      = hex.p;
    if (hex.pg !== undefined) (ecs.populationGrowthRate as Float64Array)[idx] = hex.pg;
    if (hex.g  !== undefined) (ecs.gold as Float64Array)[idx]                 = hex.g;
    if (hex.f  !== undefined) (ecs.food as Float64Array)[idx]                 = hex.f;
    if (hex.w  !== undefined) (ecs.wood as Float64Array)[idx]                 = hex.w;
    if (hex.i  !== undefined) (ecs.iron as Float64Array)[idx]                 = hex.i;
    if (hex.fa !== undefined) (ecs.faith as Float64Array)[idx]                = hex.fa;
    if (hex.l  !== undefined) (ecs.legitimacy as Float64Array)[idx]           = hex.l;
    if (hex.m  !== undefined) (ecs.manpower as Float64Array)[idx]             = hex.m;
    if (hex.df !== undefined) (ecs.regionDominantFaith as Int32Array)[idx]    = hex.df;
    if (hex.ds !== undefined) (ecs.regionDominantShare as Float32Array)[idx]  = hex.ds;
    if (hex.mf !== undefined) (ecs.regionMinorityFaith as Int32Array)[idx]    = hex.mf;
    if (hex.ms !== undefined) (ecs.regionMinorityShare as Float32Array)[idx]  = hex.ms;
    if (hex.fu !== undefined) (ecs.regionFaithUnrest as Float32Array)[idx]    = hex.fu;
    if (hex.cp !== undefined) (ecs.regionCaptureProgress as Float32Array)[idx]= hex.cp;
    if (hex.cs !== undefined) (ecs.regionCurrentSupply as Float32Array)[idx]  = hex.cs;
    if (hex.s  !== undefined) (ecs.hexStructures as Int32Array)[idx]          = hex.s;
    if (hex.v  !== undefined) (ecs.visibilityMask as Uint8Array)[idx]         = hex.v;
  }
}

/**
 * Type guard: checks that a parsed JSON value is a plausibly valid EcsSnapshot.
 * Does NOT verify mathematical consistency — only structural shape.
 */
export function isEcsSnapshot(value: unknown): value is EcsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    s['sv'] === ECS_SNAPSHOT_VERSION &&
    typeof s['t'] === 'number' &&
    typeof s['ce'] === 'number' &&
    typeof s['h'] === 'object' && s['h'] !== null &&
    Array.isArray(s['f_gb']) &&
    Array.isArray(s['f_mr']) &&
    Array.isArray(s['f_c']) &&
    Array.isArray(s['f_res'])
  );
}

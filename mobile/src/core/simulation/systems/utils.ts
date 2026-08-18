import type { GameState, KingdomState } from "../../models/game-state";
import type { KingdomId } from "../../models/types";
import { ResourceType } from "../../models/enums";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function getPlayerKingdom(state: GameState): KingdomState {
  const player = Object.keys(state.kingdoms)
    .sort()
    .map((kingdomId) => state.kingdoms[kingdomId])
    .find((kingdom) => kingdom.isPlayer);

  if (!player) {
    throw new Error("No player kingdom found in game state.");
  }

  return player;
}

export function getOwnedRegionIds(state: GameState, kingdomId: KingdomId): string[] {
  const kingdom = state.kingdoms[kingdomId];
  if (!kingdom) return [];

  if (!kingdom.ownedRegionIds) {
    const regionIds = Object.keys(state.world.regions);
    for (const kid of Object.keys(state.kingdoms)) {
      state.kingdoms[kid].ownedRegionIds = [];
    }

    for (let i = 0; i < regionIds.length; i++) {
      const regionId = regionIds[i];
      const ownerId = state.world.regions[regionId].ownerId;
      if (ownerId && state.kingdoms[ownerId]) {
        state.kingdoms[ownerId].ownedRegionIds!.push(regionId);
      }
    }

    for (const kid of Object.keys(state.kingdoms)) {
      state.kingdoms[kid].ownedRegionIds!.sort();
    }
  }

  return kingdom.ownedRegionIds || [];
}

export function ensureResourceNonNegative(kingdom: KingdomState): void {
  for (const key of Object.values(ResourceType)) {
    if (kingdom.economy.stock[key] < 0) {
      kingdom.economy.stock[key] = 0;
    }
  }
}

export interface EventIdInput {
  prefix: string;
  tick: number;
  systemId: string;
  actorId?: string;
  sequence: number;
}

function sanitizeEventIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function createEventId(input: EventIdInput): string {
  const actorId = sanitizeEventIdPart(input.actorId ?? "none");
  const systemId = sanitizeEventIdPart(input.systemId);
  const sequence = Math.max(0, Math.trunc(input.sequence));
  return `${input.prefix}_${Math.trunc(input.tick)}_${systemId}_${actorId}_${sequence}`;
}

export function getFactionStringId(factionId: number): string | undefined {
  if (factionId === 1) return "k_player";
  if (factionId > 1) return `k_npc_${factionId - 1}`;
  return undefined;
}

export const TOTAL_HEXES = 320000;

/**
 * Converte um ID de região (r_hex_X) para seu índice canônico no array do ECS.
 * Retorna -1 se for inválido, malformado ou estiver fora do limite espacial do ECS.
 */
export function getRegionIndex(regionId: string | undefined | null): number {
  if (!regionId || typeof regionId !== "string") return -1;
  if (!regionId.startsWith("r_hex_")) return -1;
  
  const numStr = regionId.substring(6);
  if (!/^\d+$/.test(numStr)) return -1;
  
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num < 0 || num >= TOTAL_HEXES) return -1;
  
  return num;
}

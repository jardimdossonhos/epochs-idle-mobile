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
  return Object.keys(state.world.regions)
    .sort()
    .filter((regionId) => state.world.regions[regionId].ownerId === kingdomId);
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

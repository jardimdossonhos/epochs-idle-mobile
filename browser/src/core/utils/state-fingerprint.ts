import type { GameState } from "../models/game-state";
import { hashDeterministic } from "./stable-hash";

export interface StateFingerprint {
  tick: number;
  schemaVersion: number;
  campaignId: string;
  mapId: string;
  hash: string;
}

function serializeStateForHash(state: GameState): Record<string, unknown> {
  return {
    meta: {
      schemaVersion: state.meta.schemaVersion,
      tick: state.meta.tick,
      tickDurationMs: state.meta.tickDurationMs
    },
    campaign: state.campaign,
    world: state.world,
    kingdoms: state.kingdoms,
    wars: state.wars,
    victory: state.victory,
    randomSeed: state.randomSeed
  };
}

export function buildStateHash(state: GameState): string {
  return hashDeterministic(serializeStateForHash(state));
}

export function buildStateFingerprint(state: GameState): StateFingerprint {
  return {
    tick: state.meta.tick,
    schemaVersion: state.meta.schemaVersion,
    campaignId: state.campaign.id,
    mapId: state.world.mapId,
    hash: buildStateHash(state)
  };
}

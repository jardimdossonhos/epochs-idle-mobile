import { NpcArchetype } from "./enums";
import type { KingdomId, TimestampMs } from "./types";

export interface NpcPersonality {
  archetype: NpcArchetype;
  ambition: number;
  caution: number;
  greed: number;
  zeal: number;
  honor: number;
  betrayalTendency: number;
}

export interface NpcMemoryEntry {
  otherKingdomId: KingdomId;
  trustDelta: number;
  fearDelta: number;
  grievanceDelta: number;
  note: string;
  happenedAt: TimestampMs;
}

export interface NpcBehaviorState {
  personality: NpcPersonality;
  strategicGoal: string;
  memories: NpcMemoryEntry[];
  lastDecisionTick: number;
}

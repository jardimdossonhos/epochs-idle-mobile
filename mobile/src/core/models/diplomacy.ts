import { DiplomaticRelation, TreatyType } from "./enums";
import type { KingdomId, TreatyId, TimestampMs } from "./types";

export interface Treaty {
  id: TreatyId;
  type: TreatyType;
  parties: KingdomId[];
  signedAt: TimestampMs;
  expiresAt: TimestampMs | null;
  terms: Record<string, number | string | boolean>;
}

export interface RelationScore {
  trust: number;
  fear: number;
  rivalry: number;
  religiousTension: number;
  borderTension: number;
  tradeValue: number;
}

export interface BilateralRelation {
  withKingdomId: KingdomId;
  status: DiplomaticRelation;
  score: RelationScore;
  grievance: number;
  allianceStrength: number;
  actionCooldowns: Record<string, TimestampMs>;
  chatHistory?: Array<{ sender: 'player' | 'npc' | 'narrator'; text: string; timestamp: number }>;
}

export interface DiplomaticProposal {
  id: string;
  senderId: KingdomId;
  treatyType: TreatyType;
  expiresAt: number;
  durationMs?: number | null;
  terms?: Record<string, number | string | boolean>;
}

export interface DiplomacyState {
  treaties: Treaty[];
  relations: Record<KingdomId, BilateralRelation>;
  coalitionThreat: number;
  warExhaustion: number;
  proposals?: DiplomaticProposal[];
}

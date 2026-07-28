import type { EventId, KingdomId, TimestampMs } from "./types";

export interface DomainEvent {
  id: EventId;
  type: string;
  actorKingdomId?: KingdomId;
  targetKingdomId?: KingdomId;
  payload: Record<string, unknown>;
  occurredAt: TimestampMs;
}

export interface EventLogEntry {
  id: EventId;
  title: string;
  details: string;
  severity: "info" | "warning" | "critical";
  occurredAt: TimestampMs;
  groupKey?: string;
  count?: number;
  suggestedAction?: string;
  actorKingdomId?: KingdomId;
  targetKingdomId?: KingdomId;
  regionId?: string;
}

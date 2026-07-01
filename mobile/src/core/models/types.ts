export type TimestampMs = number;
export type TickId = number;

export type KingdomId = string;
export type RegionId = string;
export type ReligionId = string;
export type WarId = string;
export type TreatyId = string;
export type EventId = string;
export type CampaignId = string;

export interface Point2D {
  x: number;
  y: number;
}

export interface NumericRange {
  min: number;
  max: number;
}

export interface ChangeReason {
  code: string;
  description: string;
}

import { ArmyPosture } from "./enums";
import type { RegionId } from "./types";

export interface ArmyStack {
  id: string;
  stationedRegionId: RegionId;
  manpower: number;
  quality: number;
  morale: number;
  supply: number;
}

export interface MilitaryState {
  posture: ArmyPosture;
  recruitmentPriority: number;
  offensiveFocus: number;
  targetRegionIds: RegionId[];
  armies: ArmyStack[];
  reserveManpower: number;
  militaryTechLevel: number;
}

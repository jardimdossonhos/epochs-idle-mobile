import { ArmyPosture } from "./enums";
import type { RegionId } from "./types";

export interface ArmyStack {
  _poolIdx: number;
  generation: number;
  isActive: boolean;
  id: string;
  factionIndex: number;
  stationedIndex: number;
  targetIndex: number;
  currentPath: Int32Array;
  pathLength: number;
  manpower: number;
  maxManpower: number;
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

import { VictoryPath } from "./enums";

export interface VictoryProgress {
  territorialShare: number;
  diplomaticInfluence: number;
  economicPower: number;
  religiousInfluence: number;
  dynasticStability: number;
}

export interface VictoryTarget {
  path: VictoryPath;
  threshold: number;
}

export interface VictoryState {
  achievedPath: VictoryPath | null;
  achievedAt: number | null;
  postVictoryMode: boolean;
  crisisPressure: number;
}

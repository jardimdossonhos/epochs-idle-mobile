import { ReligiousPolicy } from "./enums";
import type { KingdomId, ReligionId, TimestampMs } from "./types";

export interface ReligionTenet {
  id: string;
  name: string;
  description: string;
  cost: number; // Orçamento (100 pontos): Custo positivo debita, negativo (ônus) devolve pontos para o jogador
  effects: { target: string; value: number; type: "additive" | "multiplier" }[];
}

export interface WorldReligion {
  id: ReligionId;
  name: string;
  deityName: string;       // O Deus/Panteão adorado
  deityDescription: string; // Características teológicas
  color: string;
  tenets: string[]; // IDs dos Dogmas escolhidos
  holyCityRegionId: string | null;
  headOfFaithKingdomId: KingdomId | null;
  founderId: KingdomId | null;
  foundedAt: TimestampMs;
  parentReligionId: ReligionId | null; // Para Cismas e Heresias
}

export interface ReligionState {
  stateFaith: ReligionId;
  policy: ReligiousPolicy;
  authority: number;
  cohesion: number;
  conversionPressure: number;
  tolerance: number;
  missionaryBudget: number;
  externalInfluenceIn: Partial<Record<KingdomId, number>>;
  holyWarCooldownUntil: TimestampMs;
}

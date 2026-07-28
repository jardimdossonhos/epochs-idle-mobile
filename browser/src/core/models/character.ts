import type { KingdomId, TickId } from "./types";

export interface CharacterStats {
  administration: number;
  martial: number;
  diplomacy: number;
  intrigue: number;
  learning: number;
}

export interface CharacterAffinity {
  institutionalLoyalty: number; // 0 a 100 (Respeito pela coroa)
  personalAffinity: number;     // -100 a 100 (Amor/Ódio pelo líder atual)
}

export type CharacterStatus = "wanderer" | "minister" | "ruler" | "prisoner" | "dead";

export interface Character {
  id: string;
  historicalId?: string; // Usado para identificar lendas únicas (ex: "josias_michel")
  name: string;
  title?: string;
  isLegendary: boolean;
  birthTick: TickId;
  deathTick: TickId | null;
  stats: CharacterStats;
  traits: string[]; // Modificadores de performance
  status: CharacterStatus;
  locationKingdomId: KingdomId | null;
  employerKingdomId: KingdomId | null;
  affinity: CharacterAffinity;
  personalWealth: number; // Ouro pessoal (não atrelado ao Tesouro do Estado)
  influence: number;      // Capital Político (Moeda usada para manobras, golpes e favores)
  memory: string[]; // Log narrativo das aventuras do personagem
}
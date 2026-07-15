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
  cultureId?: string;
  portraitSeed?: string;
  gender?: 'male' | 'female';
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
  level: number;
  experience: number;
  unspentTalentPoints: number;
}

export interface SovereignTrait {
  id: string;
  name: string;
  description: string;
  statModifiers?: Partial<CharacterStats>;
  npcModifiers?: {
    ambition?: number;
    caution?: number;
    greed?: number;
    zeal?: number;
    honor?: number;
    betrayalTendency?: number;
  };
}

export const SOVEREIGN_TRAITS: SovereignTrait[] = [
  { id: "militarist", name: "Militarista", description: "+2 Marciais, busca expansão militar", statModifiers: { martial: 2, diplomacy: -1 }, npcModifiers: { ambition: 0.15, caution: -0.1 } },
  { id: "pacifist", name: "Pacifista", description: "+2 Diplomacia, evita conflitos", statModifiers: { diplomacy: 2, martial: -1 }, npcModifiers: { ambition: -0.15, caution: 0.15, honor: 0.1 } },
  { id: "greedy", name: "Ganancioso", description: "+2 Administração, foca em ouro e comércio", statModifiers: { administration: 2, diplomacy: -1 }, npcModifiers: { greed: 0.2, honor: -0.1 } },
  { id: "zealous", name: "Zeloso", description: "+2 Aprendizado/Fé, intolerante com outras religiões", statModifiers: { learning: 2 }, npcModifiers: { zeal: 0.25, honor: 0.05 } },
  { id: "charismatic", name: "Carismático", description: "+2 Diplomacia, melhora relações", statModifiers: { diplomacy: 2 }, npcModifiers: { honor: 0.1 } },
  { id: "crafty", name: "Astuto", description: "+2 Intriga, propenso a traições", statModifiers: { intrigue: 2 }, npcModifiers: { betrayalTendency: 0.25, honor: -0.15 } },
  { id: "cautious", name: "Cauteloso", description: "+2 Administração, evita riscos", statModifiers: { administration: 2, martial: -1 }, npcModifiers: { caution: 0.2, ambition: -0.1 } },
  { id: "just", name: "Justo", description: "+1 Diplomacia, +1 Administração", statModifiers: { diplomacy: 1, administration: 1 }, npcModifiers: { honor: 0.2, betrayalTendency: -0.15 } }
];
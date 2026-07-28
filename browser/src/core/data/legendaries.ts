import { CharacterStats } from "../models/character";

export interface LegendaryTemplate {
  historicalId: string;
  name: string;
  title: string;
  stats: CharacterStats;
  traits: string[];
  description: string;
}

export const FAMILY_TRIBUTE_LEGENDARIES: LegendaryTemplate[] = [
  {
    historicalId: "josias_michel",
    name: "Josias Michel",
    title: "o Arquiteto de Mundos",
    stats: { administration: 10, martial: 5, diplomacy: 7, intrigue: 6, learning: 10 },
    traits: ["visionary", "creator"],
    description: "Uma figura mítica que dizem ter moldado as próprias leis da física e da magia. Possui conhecimento absoluto sobre as engrenagens do universo."
  },
  {
    historicalId: "jonathas_michel",
    name: "Jonathas Michel",
    title: "o Estrategista",
    stats: { administration: 6, martial: 10, diplomacy: 5, intrigue: 8, learning: 7 },
    traits: ["tactician", "unyielding"],
    description: "Irmão do Arquiteto. Um mestre das táticas militares e da guerra psicológica. Exércitos liderados por ele raramente conhecem a derrota."
  },
  {
    historicalId: "joao_michel",
    name: "João Michel",
    title: "o Patriarca",
    stats: { administration: 9, martial: 6, diplomacy: 9, intrigue: 4, learning: 8 },
    traits: ["wise", "just"],
    description: "O pai da dinastia. Respeitado em todas as nações por sua sabedoria e senso inabalável de justiça. Sua presença estabiliza qualquer reino."
  },
  {
    historicalId: "donizeti_bueno",
    name: "Donizeti Bueno",
    title: "a Matriarca",
    stats: { administration: 8, martial: 3, diplomacy: 10, intrigue: 7, learning: 9 },
    traits: ["compassionate", "beloved"],
    description: "A mãe da dinastia. Onde ela caminha, conflitos cessam. Sua habilidade de acalmar corações e curar feridas políticas é lendária."
  },
  {
    historicalId: "lene_melo",
    name: "Lene Melo",
    title: "a Conselheira Leal",
    stats: { administration: 8, martial: 4, diplomacy: 9, intrigue: 9, learning: 7 },
    traits: ["loyal", "perceptive"],
    description: "A companheira leal do Arquiteto. Seus olhos veem através das mentiras mais profundas e sua lealdade é um escudo impenetrável contra traições."
  },
  {
    historicalId: "josiane_michel",
    name: "Josiane Michel",
    title: "a Voz Carismática",
    stats: { administration: 7, martial: 3, diplomacy: 10, intrigue: 8, learning: 6 },
    traits: ["charismatic", "silver_tongue"],
    description: "Irmã mais nova. Suas palavras movem multidões e encantam monarcas. Capaz de desarmar guerras inteiras apenas com a doçura do discurso."
  },
  {
    historicalId: "cristiane_michel",
    name: "Cristiane Michel",
    title: "a Mão Pragmática",
    stats: { administration: 10, martial: 7, diplomacy: 6, intrigue: 5, learning: 8 },
    traits: ["pragmatic", "efficient"],
    description: "Irmã mais velha. Uma administradora e contadora formidável. Quando ela assume as finanças, tesouros secos transbordam em ouro em questão de meses."
  },
  {
    historicalId: "lucia_michel",
    name: "Lúcia de Melo Michel",
    title: "a Herdeira do Amanhã",
    stats: { administration: 5, martial: 3, diplomacy: 8, intrigue: 5, learning: 10 },
    traits: ["prodigy", "pure_heart"],
    description: "A adorável herdeira da dinastia. Jovem, mas detentora de um potencial e inteligência que encantam e assustam até os maiores sábios da corte."
  }
];
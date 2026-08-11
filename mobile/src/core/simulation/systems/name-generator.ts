import { BiomeType } from "../../models/enums";
import type { RegionDefinition } from "../../models/world";

// Hash puro e determinístico para ancorar o nome
export function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

// Bancos de Nomes por Bioma (Arrays pequenas para custo zero de memória)
const BIOME_LEXICON: Record<BiomeType, { prefixes: string[]; suffixes: string[] }> = {
  [BiomeType.Ocean]: {
    prefixes: ["Mar", "Oceano", "Golfo", "Estreito", "Baía", "Águas", "Profundeza"],
    suffixes: ["Sombrio", "Azul", "Sem Fim", "Tempestuoso", "da Névoa", "Cristalino"]
  },
  [BiomeType.Desert]: {
    prefixes: ["Dunas", "Deserto", "Ermo", "Sertão", "Vale Seco", "Areias"],
    suffixes: ["Escaldante", "do Sol", "Sem Fim", "Rubro", "da Morte", "Sussurrante"]
  },
  [BiomeType.Tundra]: {
    prefixes: ["Geada", "Tundra", "Planalto", "Desfiladeiro", "Campos Gélidos", "Pico"],
    suffixes: ["Branco", "do Inverno", "Uivante", "Gelado", "Esquecido", "da Noite"]
  },
  [BiomeType.Temperate]: {
    prefixes: ["Vale", "Planície", "Bosque", "Colina", "Campos", "Prado", "Floresta"],
    suffixes: ["Verdejante", "Sereno", "Fértil", "dos Ventos", "Largo", "Brumoso"]
  },
  [BiomeType.Tropical]: {
    prefixes: ["Selva", "Mata", "Pantanal", "Mangue", "Estuário", "Floresta Densa"],
    suffixes: ["Úmida", "Profunda", "Sombria", "Esmeralda", "das Sombras", "Ressonante"]
  }
};

const ZONE_FLAVOR: Record<string, string> = {
  "europe": "do Ocidente",
  "north_africa": "Magrebino",
  "near_east": "do Levante",
  "north_america": "do Novo Mundo",
  "south_america": "Austral",
  "sub_saharan_africa": "do Sul",
  "central_asia": "das Estepes",
  "south_asia": "Oriental",
  "east_asia": "do Extremo",
  "oceania": "Insular"
};

/**
 * Retorna o nome da região.
 * - Se a região possuir um nome oficial e histórico (que NÃO comece com "Setor "), retorna esse nome.
 * - Caso contrário, utiliza o ID numérico da região (ex: r_hex_38212) como SEMENTE (Seed)
 *   para pescar matematicamente um prefixo e sufixo coerentes com seu bioma.
 */
export function getRegionName(definition: RegionDefinition | undefined): string {
  // 1. Bypass para regiões históricas que já tenham um nome lindo salvo
  if (definition && definition.name && !definition.name.startsWith("Setor ")) {
    return definition.name;
  }

  // Fallback seguro caso passe algo nulo
  if (!definition) return "Terra Desconhecida";

  // 2. Extração da semente determinística (O "Lazy Generation")
  const seed = hashString(definition.id);

  // 3. Resgata o dicionário do bioma
  const lexicon = BIOME_LEXICON[definition.biome] || BIOME_LEXICON[BiomeType.Temperate]; // Fallback de segurança
  
  // 4. Seleção matemática ancorada na Semente
  // O uso do '%' garante que nunca sairemos do limite do array
  const prefixIndex = seed % lexicon.prefixes.length;
  // Embaralhamos a semente dividindo por 7 para o sufixo não ser atrelado linearmente ao prefixo
  const suffixIndex = Math.floor(seed / 7) % lexicon.suffixes.length;

  const prefix = lexicon.prefixes[prefixIndex];
  const suffix = lexicon.suffixes[suffixIndex];
  
  // 5. Adicionamos um flavor regional a cada ~3 regiões (semente par ou específica) para enriquecer a lore
  if (seed % 3 === 0 && ZONE_FLAVOR[definition.zone]) {
    return `${prefix} ${ZONE_FLAVOR[definition.zone]}`;
  }

  // 6. Retorna a composição gerada a custo quase zero de CPU
  return `${prefix} ${suffix}`;
}

export const FACTION_TYPES = ["Irmandade", "Culto", "Legião", "Ordem", "Exército", "Aliança", "Rebeldes", "Vanguarda"];
export const BIOME_FACTION_SUFFIX: Record<BiomeType, string[]> = {
  [BiomeType.Ocean]: ["das Marés", "do Abismo", "da Costa", "do Horizonte", "dos Mares", "das Ilhas"],
  [BiomeType.Desert]: ["das Areias", "do Sol", "da Sede", "Vermelha", "Escaldante", "das Dunas"],
  [BiomeType.Tundra]: ["do Gelo", "da Nevasca", "do Inverno", "dos Lobos", "do Frio", "da Tundra"],
  [BiomeType.Temperate]: ["dos Bosques", "do Vale", "Verde", "dos Campos", "da Terra", "da Colina"],
  [BiomeType.Tropical]: ["da Selva", "das Sombras", "do Pântano", "Verde-Escuro", "das Árvores", "da Chuva"]
};

export function getFactionName(regionId: string, biome: BiomeType): string {
    const seed = hashString(regionId);
    const type = FACTION_TYPES[seed % FACTION_TYPES.length];
    const suffixList = BIOME_FACTION_SUFFIX[biome] || BIOME_FACTION_SUFFIX[BiomeType.Temperate];
    const suffix = suffixList[(seed >> 4) % suffixList.length];
    return `${type} ${suffix}`;
}

import { FAMILY_TRIBUTE_LEGENDARIES } from "../../data/legendaries";
import { hashString } from "./name-generator";
import { mulberry32 } from "./prng";

export type TraitEffectType = "goldIncome_mult" | "unrest_flat" | "militaryUpkeep_mult" | "legitimacy_flat";

export interface TraitEffect {
  type: TraitEffectType;
  value: number;
}

export interface ProceduralTrait {
  id: string;
  name: string;
  effect: TraitEffect;
}

export const ALL_PROCEDURAL_TRAITS: ProceduralTrait[] = [
  { id: "corrupt", name: "Corrupto", effect: { type: "goldIncome_mult", value: -0.05 } },
  { id: "charismatic", name: "Carismático", effect: { type: "unrest_flat", value: -0.05 } },
  { id: "strict", name: "Rigoroso", effect: { type: "unrest_flat", value: 0.05 } },
  { id: "economist", name: "Economista", effect: { type: "goldIncome_mult", value: 0.05 } },
  { id: "tactician", name: "Tático", effect: { type: "militaryUpkeep_mult", value: -0.10 } },
  { id: "incompetent", name: "Incompetente", effect: { type: "goldIncome_mult", value: -0.10 } },
  { id: "noble", name: "Nobre", effect: { type: "legitimacy_flat", value: 0.05 } },
  { id: "despised", name: "Desprezado", effect: { type: "legitimacy_flat", value: -0.05 } }
];

export interface CharacterIdentity {
  name: string;
  portraitSeed: string;
  traits: ProceduralTrait[];
  isLegendary: boolean;
}

const FIRST_NAMES = ["Amon", "Ptah", "Ramses", "Taharqa", "Cleopatra", "Nefertiti", "Gilgamesh", "Sargon", "Hammurabi", "Ashur", "Cyrus", "Darius", "Xerxes", "Alexander", "Ptolemy"];
const LAST_NAMES = ["Hotep", "Moses", "Ankh", "Uruk", "Akkad", "Babylon", "Nineveh", "Persia", "Macedon", "Pella"];

export function getCharacterIdentity(id: string, cultureId: string = "default"): CharacterIdentity {
  const legendary = FAMILY_TRIBUTE_LEGENDARIES.find((l) => l.historicalId === id);
  if (legendary) {
    // Override lendário
    return {
      name: legendary.name,
      portraitSeed: legendary.historicalId,
      traits: [], // Lendários podem não ter modifiers procedurais, ou podemos mapear seus traits para efeitos
      isLegendary: true
    };
  }

  const seed = hashString(id);
  const prng = mulberry32(seed);

  const firstNameIndex = Math.floor(prng() * FIRST_NAMES.length);
  const lastNameIndex = Math.floor(prng() * LAST_NAMES.length);
  const name = `${FIRST_NAMES[firstNameIndex]} ${LAST_NAMES[lastNameIndex]}`;

  const trait1Index = Math.floor(prng() * ALL_PROCEDURAL_TRAITS.length);
  let trait2Index = Math.floor(prng() * ALL_PROCEDURAL_TRAITS.length);

  // Evitar duplicatas simples
  if (trait1Index === trait2Index) {
    trait2Index = (trait2Index + 1) % ALL_PROCEDURAL_TRAITS.length;
  }

  const portraitSeed = `${cultureId}_${seed}`;

  return {
    name,
    portraitSeed,
    traits: [ALL_PROCEDURAL_TRAITS[trait1Index], ALL_PROCEDURAL_TRAITS[trait2Index]],
    isLegendary: false
  };
}

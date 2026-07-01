export type CultureId = 'nordic' | 'latin' | 'eastern' | 'desert' | 'celtic' | 'slavic' | 'savanna' | 'indigenous' | 'vedic';
export type Gender = 'male' | 'female';

const CULTURES = {
  nordic: {
    male: ["Agnar", "Bjorn", "Einar", "Erik", "Floki", "Gunnar", "Hakon", "Ivar", "Leif", "Olaf", "Ragnar", "Sigurd", "Sven", "Thorin", "Ulrik", "Vidar", "Yngvi"],
    female: ["Astrid", "Bodhil", "Freya", "Gudrun", "Helga", "Ingrid", "Lagertha", "Sigrid", "Torunn", "Sif", "Eira", "Nanna", "Valkyrie", "Gunhild", "Liv"],
    titles: ["o Bravo", "Machado-de-Gelo", "Pele-de-Lobo", "Lobo-do-Mar", "Sangue-Frio", "o Navegador", "Escudo-de-Ferro"]
  },
  latin: {
    male: ["Aurelius", "Cassius", "Decimus", "Flavius", "Gaius", "Julius", "Lucius", "Marius", "Octavius", "Quintus", "Tiberius", "Valerius", "Vitus", "Marcus", "Antonius"],
    female: ["Aurelia", "Cassia", "Cornelia", "Flavia", "Julia", "Lucia", "Octavia", "Tiberia", "Valeria", "Vita", "Antonia", "Livia", "Drusilla", "Sabina"],
    titles: ["o Justo", "o Invencível", "Pater Patriae", "o Augusto", "Águia Dourada", "o Sábio", "o Magnífico"]
  },
  eastern: {
    male: ["Akira", "Batu", "Chen", "Daisuke", "Ghenghis", "Haruto", "Hideyoshi", "Jian", "Kazuki", "Li", "Minamoto", "Nobunaga", "Ryu", "Shen", "Takeshi", "Wei", "Zhang"],
    female: ["Aiko", "Chiyo", "Emi", "Hana", "Hua", "Kaori", "Li", "Mei", "Natsuki", "Sakura", "Xiu", "Yuki", "Ying", "Bao", "Ling"],
    titles: ["Dragão Celestial", "Lâmina Oculta", "o Sábio do Leste", "Mestre das Sombras", "Vento Cortante", "Espírito Calmo"]
  },
  desert: {
    male: ["Amir", "Bashir", "Faris", "Habib", "Hakim", "Ibrahim", "Jafar", "Kadir", "Mahmoud", "Nadir", "Omar", "Rashid", "Salim", "Tariq", "Zayed"],
    female: ["Aisha", "Fatima", "Halima", "Jamila", "Khadija", "Layla", "Mariam", "Nadia", "Rabia", "Safiya", "Yasmin", "Zahra", "Amina"],
    titles: ["Lâmina do Deserto", "Senhor das Areias", "o Observador de Estrelas", "Falcão Dourado", "Filho do Sol", "Sábio das Dunas"]
  },
  celtic: {
    male: ["Aidan", "Bran", "Cormac", "Declan", "Ewan", "Finn", "Gareth", "Liam", "Niall", "Oisin", "Ronan", "Sean", "Tadgh", "Angus"],
    female: ["Aine", "Brighid", "Ciara", "Deirdre", "Enya", "Fiona", "Maeve", "Niamh", "Orla", "Roisin", "Saoirse", "Siobhan", "Tara"],
    titles: ["o Selvagem", "Coração-de-Carvalho", "o Bardo", "Espírito da Floresta", "Filho das Sombras"]
  },
  slavic: {
    male: ["Boris", "Dmitri", "Igor", "Ivan", "Maxim", "Mikhail", "Nikolai", "Oleg", "Sergei", "Stanislav", "Vladimir", "Yaroslav", "Yuri"],
    female: ["Anya", "Bogdana", "Daria", "Elena", "Irina", "Katarina", "Ludmila", "Mariya", "Natasha", "Olga", "Svetlana", "Tanya", "Zoya"],
    titles: ["o Urso", "Sangue-de-Neve", "o Implacável", "Braço-de-Ferro", "o Czar"]
  },
  savanna: {
    male: ["Adekambi", "Chidi", "Dayo", "Emeka", "Femi", "Idris", "Jomo", "Kofi", "Kwame", "Makena", "Nnamdi", "Obi", "Tariq", "Zuberi"],
    female: ["Abeni", "Bosede", "Chidinma", "Dalila", "Fatou", "Halima", "Imani", "Jamila", "Kesi", "Nia", "Olamide", "Safiya", "Zola"],
    titles: ["Leão da Savana", "o Guardião", "Lança de Ébano", "Sol Nascente", "Senhor dos Animais"]
  },
  indigenous: {
    male: ["Acalan", "Coatl", "Itzcoatl", "Kuauhtli", "Mahuika", "Nekalli", "Tariakuri", "Tenoch", "Tupac", "Yaotl", "Zolin"],
    female: ["Atzi", "Citlali", "Ixchel", "Metzi", "Nenetl", "Quetzalli", "Tayanna", "Xitlali", "Yaretzi", "Zeltzin", "Nayeli"],
    titles: ["Águia Guerreira", "Sangue de Pantera", "Espírito da Terra", "Olho da Tempestade"]
  },
  vedic: {
    male: ["Aarav", "Arjun", "Dev", "Hari", "Indra", "Karan", "Krishna", "Mohan", "Narayan", "Pranav", "Ravi", "Sanjay", "Vikram", "Yash"],
    female: ["Aditi", "Ananya", "Devi", "Gita", "Indira", "Kavya", "Lakshmi", "Maya", "Neha", "Pooja", "Riya", "Sita", "Tara"],
    titles: ["o Iluminado", "Mente Pura", "Lótus Dourado", "o Místico", "Braço Sagrado"]
  }
};

export const DEFAULT_CULTURES: CultureId[] = ['nordic', 'latin', 'eastern', 'desert', 'celtic', 'slavic', 'savanna', 'indigenous', 'vedic'];

export function getRandomCulture(): CultureId {
  return DEFAULT_CULTURES[Math.floor(Math.random() * DEFAULT_CULTURES.length)];
}

export function getRandomGender(): Gender {
  return Math.random() > 0.5 ? 'male' : 'female';
}

export function generateCulturalName(cultureId: CultureId, gender: Gender): string {
  const cultureData = CULTURES[cultureId] || CULTURES['latin'];
  const nameList = cultureData[gender];
  const titleList = cultureData.titles;

  const name = nameList[Math.floor(Math.random() * nameList.length)];
  const useTitle = Math.random() > 0.5;

  if (useTitle) {
    const title = titleList[Math.floor(Math.random() * titleList.length)];
    return `${name} ${title}`;
  } else {
    // Generate a surname instead (just another random name for now, or prefix)
    const surname = nameList[Math.floor(Math.random() * nameList.length)];
    if (name === surname) return `${name} ${titleList[0]}`; // fallback
    return `${name} ${cultureId === 'nordic' ? surname + 'son' : cultureId === 'desert' ? 'ibn ' + surname : surname}`;
  }
}

export function generatePortraitSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

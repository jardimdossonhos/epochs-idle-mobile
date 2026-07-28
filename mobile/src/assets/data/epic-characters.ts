export interface EpicCharacter {
  id: string;
  name: string;
  gender: 'male' | 'female';
  cultureId: string;
  portraitId: string; // ID da imagem fixa que ele usará
  tags: string[]; // Etiqueta para o sistema de eventos reconhecê-los
  bonusStats?: {
    martial: number;
    diplomacy: number;
    stewardship: number;
  };
}

// O Grande Panteão de Heróis do Jogo
export const EPIC_CHARACTERS: Record<string, EpicCharacter> = {
  // --- FUNDADORES (Lista do Diretor) ---
  'epic_josias_michel': { 
    id: 'epic_josias_michel', name: 'Josias Michel', gender: 'male', cultureId: 'latin', portraitId: 'epic_josias', tags: ['founder', 'legendary'],
    bonusStats: { martial: 8, diplomacy: 5, stewardship: 6 } 
  },
  'epic_jonathas_michel': { 
    id: 'epic_jonathas_michel', name: 'Jonathas Michel', gender: 'male', cultureId: 'latin', portraitId: 'epic_jonathas', tags: ['founder'],
    bonusStats: { martial: 5, diplomacy: 8, stewardship: 4 } 
  },
  'epic_joao_michel': { 
    id: 'epic_joao_michel', name: 'João Michel', gender: 'male', cultureId: 'latin', portraitId: 'epic_joao', tags: ['founder'],
    bonusStats: { martial: 6, diplomacy: 6, stewardship: 8 } 
  },
  'epic_deni_bueno': { 
    id: 'epic_deni_bueno', name: 'Deni Bueno', gender: 'female', cultureId: 'latin', portraitId: 'epic_deni', tags: ['founder'],
    bonusStats: { martial: 4, diplomacy: 9, stewardship: 7 } 
  },
  'epic_cristiane_michel': { 
    id: 'epic_cristiane_michel', name: 'Cristiane Michel', gender: 'female', cultureId: 'latin', portraitId: 'epic_cristiane', tags: ['founder'],
    bonusStats: { martial: 3, diplomacy: 7, stewardship: 9 } 
  },
  'epic_josiane_michel': { 
    id: 'epic_josiane_michel', name: 'Josiane Michel', gender: 'female', cultureId: 'latin', portraitId: 'epic_josiane', tags: ['founder'],
    bonusStats: { martial: 7, diplomacy: 4, stewardship: 6 } 
  },
  'epic_leni_melo': { 
    id: 'epic_leni_melo', name: 'Leni Melo', gender: 'female', cultureId: 'latin', portraitId: 'epic_leni', tags: ['founder'],
    bonusStats: { martial: 5, diplomacy: 6, stewardship: 8 } 
  },
  'epic_lucia_michel': { 
    id: 'epic_lucia_michel', name: 'Lúcia Michel', gender: 'female', cultureId: 'latin', portraitId: 'epic_lucia', tags: ['founder', 'legendary'],
    bonusStats: { martial: 2, diplomacy: 10, stewardship: 9 } 
  },

  // --- HERÓIS HISTÓRICOS (Culturas do Jogo) ---
  'epic_sun_tzu': { 
    id: 'epic_sun_tzu', name: 'Sun Tzu', gender: 'male', cultureId: 'sinic', portraitId: 'epic_sun_tzu', tags: ['historical', 'tactician'],
    bonusStats: { martial: 10, diplomacy: 3, stewardship: 4 } 
  },
  'epic_fu_hao': { 
    id: 'epic_fu_hao', name: 'Fu Hao', gender: 'female', cultureId: 'sinic', portraitId: 'epic_fu_hao', tags: ['historical', 'warrior_queen'],
    bonusStats: { martial: 9, diplomacy: 5, stewardship: 5 } 
  },
  'epic_ramses': { 
    id: 'epic_ramses', name: 'Ramsés, o Grande', gender: 'male', cultureId: 'egyptian', portraitId: 'epic_ramses', tags: ['historical', 'builder'],
    bonusStats: { martial: 7, diplomacy: 6, stewardship: 10 } 
  },
  'epic_nefertiti': { 
    id: 'epic_nefertiti', name: 'Nefertiti', gender: 'female', cultureId: 'egyptian', portraitId: 'epic_nefertiti', tags: ['historical', 'charismatic'],
    bonusStats: { martial: 2, diplomacy: 10, stewardship: 6 } 
  },
  'epic_saraswati': { 
    id: 'epic_saraswati', name: 'Saraswati', gender: 'female', cultureId: 'harappa', portraitId: 'epic_saraswati', tags: ['historical', 'scholar'],
    bonusStats: { martial: 1, diplomacy: 8, stewardship: 9 } 
  }
};

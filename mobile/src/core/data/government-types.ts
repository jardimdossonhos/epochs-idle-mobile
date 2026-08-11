export type GovernmentEra = 'tribal' | 'state';

export interface GovernmentModifiers {
  /** Multiplicador geral na arrecadação fiscal/ouro (ex: 1.15 para +15%) */
  incomeMultiplier: number;
  /** Multiplicador na velocidade de pesquisa tecnológica (ex: 1.15 para +15%) */
  researchSpeedMultiplier: number;
  /** Multiplicador no crescimento populacional (ex: 1.10 para +10%) */
  populationGrowthMultiplier: number;
  /** Bônus aditivo na estabilidade base (ex: 15) */
  stabilityBonus: number;
  /** Bônus aditivo na legitimidade base (ex: 10) */
  legitimacyBonus: number;
  /** Modificador na capacidade administrativa (ex: +25 de cap) */
  adminCapacityBonus: number;
  /** Fator na resistência contra corrupção (positivo reduz corrupção, negativo aumenta risco) */
  corruptionResistance: number;
  /** Multiplicador de teto de recrutamento militar */
  manpowerCapMultiplier: number;
  /** Multiplicador de custo de manutenção militar */
  armyUpkeepMultiplier: number;
}

export interface GovernmentTypeDefinition {
  id: string; // Ex: 'band', 'tribal_council', 'chiefdom', 'monarchy'
  name: string;
  description: string;
  era: GovernmentEra;

  modifiers: GovernmentModifiers;

  prerequisites: {
    minPopulation?: number;
    minYear?: number;
    requiredTechIds?: string[];
  };

  transitionCost: {
    gold: number;
    stabilityPenalty: number;
  };

  /**
   * Custo em Legitimidade para adotar ou re-adotar este regime.
   * Mínimo 100 para qualquer governo não-origem. band=0 (ponto de partida).
   * Escalona com a complexidade: tribal ~100-120, estatal ~200+.
   */
  legitimacyCost: number;
}

export const DEFAULT_GOVERNMENT_MODIFIERS: GovernmentModifiers = {
  incomeMultiplier: 1.0,
  researchSpeedMultiplier: 1.0,
  populationGrowthMultiplier: 1.0,
  stabilityBonus: 0,
  legitimacyBonus: 0,
  adminCapacityBonus: 0,
  corruptionResistance: 0,
  manpowerCapMultiplier: 1.0,
  armyUpkeepMultiplier: 1.0,
};

export const GOVERNMENT_REGISTRY: Record<string, GovernmentTypeDefinition> = {
  band: {
    id: 'band',
    name: 'Bando Nômade',
    description: 'Pequeno grupo de caçadores-coletores unidos por laços de parentesco e instinto de sobrevivência.',
    era: 'tribal',
    modifiers: {
      incomeMultiplier: 1.0,
      researchSpeedMultiplier: 0.90,
      populationGrowthMultiplier: 1.10,
      stabilityBonus: 10,
      legitimacyBonus: 0,
      adminCapacityBonus: 0,
      corruptionResistance: 0.10,
      manpowerCapMultiplier: 1.15,
      armyUpkeepMultiplier: 0.90,
    },
    prerequisites: {
      minPopulation: 0,
    },
    transitionCost: {
      gold: 0,
      stabilityPenalty: 0,
    },
    legitimacyCost: 0,
  },
  tribal_council: {
    id: 'tribal_council',
    name: 'Conselho Tribal',
    description: 'Assembleia de anciãos e chefes de clã que deliberam sobre caça, guerra e rituais sagrados.',
    era: 'tribal',
    modifiers: {
      incomeMultiplier: 1.05,
      researchSpeedMultiplier: 0.95,
      populationGrowthMultiplier: 1.05,
      stabilityBonus: 15,
      legitimacyBonus: 5,
      adminCapacityBonus: 5,
      corruptionResistance: 0.05,
      manpowerCapMultiplier: 1.10,
      armyUpkeepMultiplier: 0.95,
    },
    prerequisites: {
      minPopulation: 200,
    },
    transitionCost: {
      gold: 40,
      stabilityPenalty: 10,
    },
    legitimacyCost: 100,
  },
  chiefdom: {
    id: 'chiefdom',
    name: 'Cacicado',
    description: 'Liderança centralizada em um chefe guerreiro reverenciado por sua força martial e carisma.',
    era: 'tribal',
    modifiers: {
      incomeMultiplier: 1.10,
      researchSpeedMultiplier: 1.0,
      populationGrowthMultiplier: 1.0,
      stabilityBonus: 5,
      legitimacyBonus: 10,
      adminCapacityBonus: 10,
      corruptionResistance: 0.0,
      manpowerCapMultiplier: 1.20,
      armyUpkeepMultiplier: 1.0,
    },
    prerequisites: {
      minPopulation: 800,
      requiredTechIds: ['hunting_parties'],
    },
    transitionCost: {
      gold: 80,
      stabilityPenalty: 12,
    },
    legitimacyCost: 120,
  },
  monarchy: {
    id: 'monarchy',
    name: 'Monarquia Imperial',
    description: 'Estado centralizado e hierárquico regido por um soberano coroado por direito e tradição.',
    era: 'state',
    modifiers: {
      incomeMultiplier: 1.15,
      researchSpeedMultiplier: 1.15,
      populationGrowthMultiplier: 0.95,
      stabilityBonus: 0,
      legitimacyBonus: 15,
      adminCapacityBonus: 25,
      corruptionResistance: -0.05,
      manpowerCapMultiplier: 1.0,
      armyUpkeepMultiplier: 0.95,
    },
    prerequisites: {
      minPopulation: 1000,
      minYear: 2,
      requiredTechIds: ['sedentism'],
    },
    transitionCost: {
      gold: 150,
      stabilityPenalty: 15,
    },
    legitimacyCost: 200,
  },
};

/**
 * Returns a government definition by its ID, falling back to 'band'.
 */
export function getGovernmentDefinition(id?: string): GovernmentTypeDefinition {
  if (id && GOVERNMENT_REGISTRY[id]) {
    return GOVERNMENT_REGISTRY[id];
  }
  return GOVERNMENT_REGISTRY.band;
}

/**
 * Returns the calculated modifiers for a given government system ID.
 */
export function getGovernmentModifiers(id?: string): GovernmentModifiers {
  return getGovernmentDefinition(id).modifiers;
}

/**
 * Checks if a specific government system is unlocked for a kingdom.
 */
export function isGovernmentUnlocked(kingdom: { population?: { total: number }; technology?: { unlocked: Record<string, boolean> } }, def: GovernmentTypeDefinition, currentYear: number = 1): boolean {
  const pop = kingdom.population?.total ?? 0;
  if (def.prerequisites.minPopulation && pop < def.prerequisites.minPopulation) {
    return false;
  }
  if (def.prerequisites.minYear && currentYear < def.prerequisites.minYear) {
    return false;
  }
  if (def.prerequisites.requiredTechIds && def.prerequisites.requiredTechIds.length > 0) {
    const unlocked = kingdom.technology?.unlocked ?? {};
    for (const req of def.prerequisites.requiredTechIds) {
      if (!unlocked[req]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Returns all government systems available/unlocked for a kingdom.
 */
export function getUnlockedGovernments(kingdom: { population?: { total: number }; technology?: { unlocked: Record<string, boolean> } }, currentYear: number = 1): GovernmentTypeDefinition[] {
  return Object.values(GOVERNMENT_REGISTRY).filter((def) => isGovernmentUnlocked(kingdom, def, currentYear));
}

/**
 * Returns the legitimacy cost for adopting a given government.
 * Safe fallback to 0 if the definition is missing.
 */
export function getGovernmentLegitimacyCost(id: string): number {
  return GOVERNMENT_REGISTRY[id]?.legitimacyCost ?? 0;
}

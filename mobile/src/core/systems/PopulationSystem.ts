﻿﻿﻿﻿﻿﻿﻿import type { PopulationComponent } from "../components/PopulationComponent";
import type { EcsModifiers } from "../models/technology";

// Capacidade base de suporte natural por bioma (sem tecnologia)
// 0: Oceano, 1: Deserto, 2: Tundra, 3: Temperado, 4: Tropical
const BASE_BIOME_CAPACITY = [0, 50, 20, 250, 150];

/**
 * O PopulationSystem é responsável por calcular o crescimento (ou declínio)
 * da população para cada entidade ao longo do tempo.
 * Ele roda dentro do Worker para não impactar a performance da UI.
 */
export class PopulationSystem {
  update(
    deltaTimeSeconds: number, 
    population: PopulationComponent, 
    entities: readonly number[],
    activeModifiers: EcsModifiers | null,
    biome: Uint8Array
  ): void {
    const capacityModifiers = activeModifiers?.["population.carrying_capacity_multiplier"];
    const growthModifiers = activeModifiers?.["population.growth_rate_multiplier"];

    for (const entityId of entities) {
      const currentPop = population.total[entityId];
      if (currentPop <= 0) continue;

      const baseGrowthRate = population.growthRate[entityId];
      const techGrowthMult = growthModifiers ? growthModifiers[entityId] : 0;
      const finalGrowthRate = baseGrowthRate * (1 + techGrowthMult);

      const entityBiome = biome[entityId];
      const baseCap = BASE_BIOME_CAPACITY[entityBiome] || 0;
      
      if (baseCap === 0) {
        // Se for oceano ou abismo absoluto, a população definha e morre velozmente
        population.total[entityId] = Math.max(0, currentPop - (currentPop * 0.05 * deltaTimeSeconds));
        continue;
      }

      const techCapMult = capacityModifiers ? capacityModifiers[entityId] : 0;
      const carryingCapacity = baseCap * (1 + techCapMult);

      // Modelo Logístico (Curva em S de Verhulst):
      // limitFactor se aproxima de 0 conforme a população chega no limite.
      // Se a população ultrapassar o teto (por imigração), o fator fica negativo (Fome/Morte Natural).
      const limitFactor = 1 - (currentPop / carryingCapacity);
      
      let growth = 0;
      if (limitFactor < 0) {
        // Fome: A população morre a uma taxa acelerada quando acima do limite.
        growth = currentPop * (finalGrowthRate * 2.5) * limitFactor * deltaTimeSeconds;
      } else {
        growth = currentPop * finalGrowthRate * limitFactor * deltaTimeSeconds;
      }
      population.total[entityId] = Math.max(1, currentPop + growth); // Garante que a tribo não seja extinta por fome, mantendo 1 sobrevivente.
    }
  }
}
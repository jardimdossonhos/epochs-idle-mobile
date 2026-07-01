import type { EconomyComponent } from "../components/EconomyComponent";
import type { PopulationComponent } from "../components/PopulationComponent";
import type { EcsModifiers } from "../models/technology";

export class EconomySystem {
  update(deltaTime: number, economy: EconomyComponent, population: PopulationComponent, activeEntities: number[], activeModifiers: EcsModifiers | null): void {
    const gold = economy.gold;
    const food = economy.food;
    const wood = economy.wood;
    const iron = economy.iron;

    const foodProductionModifiers = activeModifiers?.["economy.food_production_multiplier"];
    const taxIncomeModifiers = activeModifiers?.["economy.tax_income_multiplier"];

    for (let i = 0; i < activeEntities.length; i += 1) {
      const entityId = activeEntities[i];
      
      // A força de trabalho é o motor absoluto da economia
      const pop = population.total[entityId] || 0;
      
      const foodMultiplier = foodProductionModifiers?.[entityId] ?? 0;
      const taxMultiplier = taxIncomeModifiers?.[entityId] ?? 0;

      // Taxas per capita (extremamente lentas para forçar o pacing Idle)
      const baseFoodGain = (pop * 0.005) + 0.02; // +0.02 base da natureza selvagem
      const baseGoldGain = pop * 0.0005;

      const gainFood = baseFoodGain * (1 + foodMultiplier);
      const gainGold = baseGoldGain * (1 + taxMultiplier);
      const gainWood = (pop * 0.001) + 0.01;
      const gainIron = (pop * 0.0001);

      gold[entityId] += gainGold * deltaTime;
      food[entityId] += gainFood * deltaTime;
      wood[entityId] += gainWood * deltaTime;
      iron[entityId] += gainIron * deltaTime;
    }
  }
}

import type { MilitaryComponent } from "../components/MilitaryComponent";
import type { PopulationComponent } from "../components/PopulationComponent";
import type { EcsModifiers } from "../models/technology";

const BASE_MANPOWER_RATIO = 0.025; // 2.5% da população se torna soldado por padrão

/**
 * O MilitarySystem é responsável por calcular o manpower (soldados) disponível
 * em cada região, com base na população total e modificadores.
 */
export class MilitarySystem {
  update(
    _deltaTimeSeconds: number,
    military: MilitaryComponent,
    population: PopulationComponent,
    entities: readonly number[],
    activeModifiers: EcsModifiers | null
  ): void {
    const manpowerModifiers = activeModifiers?.["military.manpower_modifier"];

    for (const entityId of entities) {
      const currentPop = population.total[entityId];
      const techManpowerMult = manpowerModifiers ? manpowerModifiers[entityId] : 0;
      
      military.manpower[entityId] = Math.floor(currentPop * BASE_MANPOWER_RATIO * (1 + techManpowerMult));
    }
  }
}
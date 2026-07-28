import type { SimulationSystem, TickContext } from "../tick-pipeline";
import type { RegionDefinition } from "../../models/world";

export function createMilitarySystem(orderedDefinitions: RegionDefinition[]): SimulationSystem {
  return {
    id: "military_system",
    run: (context: TickContext) => {
      const state = context.nextState;
      
      // A logística militar não precisa rodar a cada milissegundo. 
      // Rodamos a cada 4 ciclos (representando "meses" de campanha) para poupar CPU.
      if (state.meta.tick % 4 !== 0) return;

      // 1. Mapeia o limite de Manpower real da Malha Geográfica do Worker (ECS) para os impérios
      const ecsManpowerLimit: Record<string, number> = {};
      if (state.ecs && state.ecs.manpower) {
        for (let i = 0; i < orderedDefinitions.length; i++) {
          const ownerId = state.world.regions[orderedDefinitions[i].id]?.ownerId;
          if (ownerId && ownerId !== "k_nature") {
            ecsManpowerLimit[ownerId] = (ecsManpowerLimit[ownerId] || 0) + (state.ecs.manpower[i] || 0);
          }
        }
      }

      for (const kingdomId in state.kingdoms) {
        if (kingdomId === "k_nature") continue;

        const kingdom = state.kingdoms[kingdomId];
        const maxManpower = ecsManpowerLimit[kingdomId] || 0;
        
        // 1. Recuperação orgânica de Moral e Suprimentos em tempo de paz
        let currentArmySize = 0;
        for (const army of kingdom.military.armies) {
          currentArmySize += army.manpower;
          if (army.morale < 1.0) army.morale = Math.min(1.0, army.morale + 0.02);
          if (army.supply < 1.0) army.supply = Math.min(1.0, army.supply + 0.03);
        }

        // 2. Reforço Orgânico (Drafting) e Deserção (Fome)
        if (kingdom.military.armies.length > 0) {
          if (currentArmySize < maxManpower) {
             const deficit = maxManpower - currentArmySize;
             // O exército recruta/repõe 5% do seu déficit demográfico a cada ciclo de descanso
             const reinforcement = Math.max(1, Math.round(deficit * 0.05));
             kingdom.military.armies[0].manpower += reinforcement;
          } else if (currentArmySize > maxManpower) {
             // Se a população física morreu, o exército sofre "Deserção Bruta" (encolhe) para respeitar o limite real
             const excess = currentArmySize - maxManpower;
             const desertion = Math.max(1, Math.round(excess * 0.15));
             kingdom.military.armies[0].manpower = Math.max(0, kingdom.military.armies[0].manpower - desertion);
          }
        }
      }
    }
  };
}
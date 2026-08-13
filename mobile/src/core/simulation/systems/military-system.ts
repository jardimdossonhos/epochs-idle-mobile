import type { SimulationSystem, TickContext } from "../tick-pipeline";
import type { RegionDefinition } from "../../models/world";


export function createMilitarySystem(orderedDefinitions: RegionDefinition[]): SimulationSystem {
  return {
    id: "military_system",
    run: (context: TickContext) => {
      const state = context.nextState;
      
      if (state.meta.tick % 4 !== 0) return;

      const ecsManpowerLimit: Record<string, number> = {};
      if (state.ecs && state.ecs.manpower) {
        /* Disabled region iteration */
      }

      for (const kingdomId in state.kingdoms) {
        if (kingdomId === "k_nature") continue;

        const kingdom = state.kingdoms[kingdomId];
        const maxManpower = ecsManpowerLimit[kingdomId] || 0;
        
        let currentArmySize = 0;
        for (const army of kingdom.military.armies) {
          currentArmySize += army.manpower;
          if (army.morale < 1.0) army.morale = Math.min(1.0, army.morale + 0.02);
          if (army.supply < 1.0) army.supply = Math.min(1.0, army.supply + 0.03);
        }

        if (kingdom.military.armies.length > 0) {
          if (currentArmySize < maxManpower) {
             const deficit = maxManpower - currentArmySize;
             const reinforcement = Math.max(1, Math.round(deficit * 0.05));
             kingdom.military.armies[0].manpower += reinforcement;
          } else if (currentArmySize > maxManpower) {
             const excess = currentArmySize - maxManpower;
             const desertion = Math.max(1, Math.round(excess * 0.15));
             kingdom.military.armies[0].manpower = Math.max(0, kingdom.military.armies[0].manpower - desertion);
          }
        }
      }
    }
  };
}


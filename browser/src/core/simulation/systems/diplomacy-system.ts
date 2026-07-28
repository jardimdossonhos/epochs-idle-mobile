import type { DiplomacyResolver } from "../../contracts/services";
import type { SimulationSystem } from "../tick-pipeline";

export function createDiplomacySystem(diplomacyResolver: DiplomacyResolver): SimulationSystem {
  return {
    id: "diplomacy",
    run(context): void {
      context.nextState = diplomacyResolver.resolveTick(context.nextState, context.now);
    }
  };
}

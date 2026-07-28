import type { EconomyComponent } from "../components/EconomyComponent";
import type { PopulationComponent } from "../components/PopulationComponent";
import type { EcsModifiers } from "../models/technology";
import { GameConfig } from "../config/game-config";

export class EconomySystem {
  update(
    tickCount: number,
    regionOwner: Int32Array | number[],
    biomeData: Uint8Array,
    factionResources: Float32Array | number[]
  ): void {
    if (tickCount % GameConfig.economy.TICKS_PER_MONTH !== 0) {
      return;
    }

    // Identificador de Biomas (0 = WATER, 1 = DESERT, 2 = LAND) - Mapeamento Simples
    const BIOME_MAP = ["WATER", "DESERT", "LAND"];

    for (let i = 0; i < regionOwner.length; i++) {
      const owner = regionOwner[i];
      if (owner < 0) continue;

      const biomeIndex = biomeData[i];
      const biomeName = BIOME_MAP[biomeIndex] || "LAND";
      const yields = GameConfig.BIOME_YIELDS[biomeName];

      if (yields) {
        const offset = owner * 3;
        factionResources[offset + 0] += yields.gold;
        factionResources[offset + 1] += yields.food;
        factionResources[offset + 2] += yields.prod;
      }
    }
  }
}

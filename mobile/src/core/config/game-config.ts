export const GameConfig = {
  economy: {
    TICKS_PER_MONTH: 60,
    COST_FARM_GOLD: 100,
    COST_ARMY_FOOD: 50,
  },
  BIOME_YIELDS: {
    "WATER":  { food: 0, gold: 0, prod: 0 },
    "DESERT": { food: 0, gold: 3, prod: 0 },
    "LAND":   { food: 2, gold: 1, prod: 1 }
  } as Record<string, { food: number, gold: number, prod: number }>
};

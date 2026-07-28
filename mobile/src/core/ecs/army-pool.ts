import { ObjectPool } from "./object-pool";
import type { ArmyStack } from "../models/military";

export const MAX_ARMIES = 2048;

let _armyPool: ObjectPool<ArmyStack> | null = null;

// Lazy getter — evita crash Hermes por instanciação global
export const getArmyPool = (): ObjectPool<ArmyStack> => {
  if (!_armyPool) {
    _armyPool = new ObjectPool<ArmyStack>((index) => ({
      _poolIdx: index,
      generation: 0,
      isActive: false,
      id: `army_pool_${index}`,
      factionIndex: -1,
      stationedIndex: -1,
      targetIndex: -1,
      currentPath: new Int32Array(128),
      pathLength: 0,
      manpower: 0,
      maxManpower: 100,
      quality: 1.0,
      morale: 1.0,
      supply: 1.0
    }), MAX_ARMIES);
  }
  return _armyPool;
};

// Alias de retrocompatibilidade — proxy para o pool lazy
export const ArmyPool = new Proxy({} as ObjectPool<ArmyStack>, {
  get: (_target, prop) => {
    const pool = getArmyPool();
    const value = (pool as any)[prop];
    return typeof value === 'function' ? value.bind(pool) : value;
  },
});





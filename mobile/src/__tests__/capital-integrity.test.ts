import { createInitialState } from '../application/boot/create-initial-state';
import { GameSession } from '../application/game-session';
import { GameState } from '../core/models/game-state';
import { cloneGameStateForSimulation } from '../core/utils/clone-game-state';

const TOTAL_HEXES = 320000;
const biomes = new Array(TOTAL_HEXES).fill(0);

// Forçamos o mapa a ter uma pequena porção de terra
for (let i = 0; i < 3000; i++) {
  biomes[i] = 1;
}

const mockStaticWorldData: any = {
  definitions: {},
  biomes: biomes,
  mapWidth: 800,
  mapHeight: 400,
  religions: {}
};

for (let i = 0; i < TOTAL_HEXES; i++) {
  mockStaticWorldData.definitions[`r_hex_${i}`] = {
    id: `r_hex_${i}`,
    name: `Hex ${i}`,
    biome: biomes[i],
    center: { x: 0, y: 0 }
  };
}

describe('Capital Integrity Tests', () => {
  let state: GameState;

  beforeAll(() => {
    state = createInitialState(mockStaticWorldData);
  });

  describe('1. Bootstrap Generation', () => {
    it('nenhum KingdomState possui capitalRegionId vazio', () => {
      Object.values(state.kingdoms).forEach(k => {
        expect(k.capitalRegionId).toBeDefined();
        expect(k.capitalRegionId).not.toBe('');
      });
    });

    it('nenhum capitalRegionId aponta para região inexistente', () => {
      Object.values(state.kingdoms).forEach(k => {
        const regionExists = mockStaticWorldData.definitions[k.capitalRegionId] !== undefined;
        if (!regionExists) console.log(`Invalid capital: ${k.capitalRegionId}`);
        expect(regionExists).toBe(true);
      });
    });

    it('nenhum capitalRegionId contém r_hex_-1', () => {
      Object.values(state.kingdoms).forEach(k => {
        expect(k.capitalRegionId).not.toContain('-1');
      });
    });

    it('k_player possui capital válida no bootstrap', () => {
      const player = state.kingdoms['k_player'];
      expect(player).toBeDefined();
      expect(player.capitalRegionId).toBeDefined();
      expect(player.capitalRegionId).not.toBe('');
      expect(mockStaticWorldData.definitions[player.capitalRegionId]).toBeDefined();
    });
  });
});

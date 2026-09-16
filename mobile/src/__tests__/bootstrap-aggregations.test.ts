import { createInitialState } from '../application/boot/create-initial-state';
import { WORLD_DEFINITIONS_V1 } from '../application/boot/generated/world-definitions-v1';
import { getRegionIndex } from '../core/simulation/systems/utils';
import { createPopulationSystem } from '../core/simulation/systems/population-system';

describe('Bootstrap / Initial Aggregations (Phase A)', () => {
  it('should initialize player faction with correct aggregated ECS values on boot', () => {
    // Generate static data mock structure (assuming it doesn't need to be fully populated for this test)
    const mockStaticData: any = {
      mapId: 'test_map',
      religions: {
        tengriism: { name: 'Tengri', tenets: [] },
        animism: { name: 'Animism', tenets: [] }
      }
    };
    
    // Call bootstrap
    const state = createInitialState(mockStaticData, undefined, WORLD_DEFINITIONS_V1);
    
    const playerKingdom = state.kingdoms['k_player'];
    expect(playerKingdom).toBeDefined();
    
    const capitalRegionId = playerKingdom.capitalRegionId;
    expect(capitalRegionId).toBeDefined();
    expect(capitalRegionId).not.toBe('');
    
    // Player is faction index 1
    const playerFactionId = 1;
    
    const capitalIdx = getRegionIndex(capitalRegionId);
    expect(state.ecs.regionOwner[capitalIdx]).toBe(playerFactionId);
    const popSystem = createPopulationSystem({} as any);
    popSystem.run({ currentState: state, nextState: state, deltaMs: 1000, now: 0 } as any);
    
    // Test aggregations
    expect(state.ecs.factionRegions[playerFactionId]).toBeGreaterThan(0);
    expect(state.ecs.factionPopulation[playerFactionId]).toBeGreaterThan(0);
    
    // Ensure that the aggregation is exactly the sum of the hexes
    let totalRegions = 0;
    let totalPop = 0;
    for (let i = 0; i < state.ecs.regionOwner.length; i++) {
      if (state.ecs.regionOwner[i] === playerFactionId) {
        totalRegions++;
        totalPop += state.ecs.populationTotal[i];
      }
    }
    
    expect(state.ecs.factionRegions[playerFactionId]).toBe(totalRegions);
    expect(state.ecs.factionPopulation[playerFactionId]).toBeCloseTo(totalPop);
  });
});
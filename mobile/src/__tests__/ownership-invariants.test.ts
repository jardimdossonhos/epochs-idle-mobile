import { getCanonicalRegionOwner, getRegionIndex, getFactionStringId } from '../core/simulation/systems/utils';
import { createInitialState } from '../application/boot/create-initial-state';
import worldMapData from '../assets/data/world_map_data.json';
import { StaticWorldData } from '../core/models/static-world-data';

const mockStaticData: StaticWorldData = {
  ...worldMapData,
  religions: {},
  traits: {},
  buildings: {},
  technologies: {},
  laws: {}
} as any;

describe('Ownership Invariants', () => {
  it('should resolve canonical owner correctly from ECS', () => {
    const state = createInitialState(mockStaticData as any);
    
    const playerCapitalRegionId = state.kingdoms['k_player'].capitalRegionId;
    expect(playerCapitalRegionId).toBeDefined();
    
    // Testa leitura limpa do ECS
    const ownerId = getCanonicalRegionOwner(state, playerCapitalRegionId);
    expect(ownerId).toBe('k_player');
  });

  it('should reflect ECS mutations on getCanonicalRegionOwner', () => {
    const state = createInitialState(mockStaticData as any);
    
    const regionId = 'r_hex_12345'; // Região arbitrária
    const idx = getRegionIndex(regionId);
    
    // Mutação manual no ECS (conquista por NPC)
    state.ecs!.regionOwner[idx] = 2; // k_npc_1
    
    const ownerId = getCanonicalRegionOwner(state, regionId);
    expect(ownerId).toBe('k_npc_1');
  });

  it('should default to k_nature when ECS owner is -1', () => {
    const state = createInitialState(mockStaticData as any);
    
    const regionId = 'r_hex_54321';
    const idx = getRegionIndex(regionId);
    
    // Natureza
    state.ecs!.regionOwner[idx] = -1;
    
    const ownerId = getCanonicalRegionOwner(state, regionId);
    expect(ownerId).toBe('k_nature');
  });
  
  it('getFactionStringId should map faction IDs correctly', () => {
    expect(getFactionStringId(1)).toBe('k_player');
    expect(getFactionStringId(2)).toBe('k_npc_1');
    expect(getFactionStringId(3)).toBe('k_npc_2');
    expect(getFactionStringId(-1)).toBeUndefined();
  });
});

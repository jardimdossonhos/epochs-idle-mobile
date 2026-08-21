jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { GameSession } from '../application/game-session';
import { BuildingType, AutomationLevel } from '../core/models/enums';
import { createAutomationSystem } from '../core/simulation/systems/automation-system';
import { EventLogEntry, DomainEvent } from '../core/models/events';
import { createInitialState } from '../application/boot/create-initial-state';

describe('Progression Build Pipeline', () => {
  let session: any;
  let state: any;
  let deps: any;

  beforeEach(() => {
    const TOTAL_HEXES = 320000;
    const biomes = new Array(TOTAL_HEXES).fill(0);
    for (let i = 0; i < 3000; i++) biomes[i] = 1;
    const mockStaticWorldData: any = {
      definitions: {}, biomes, mapWidth: 800, mapHeight: 400, religions: {}
    };
    for (let i = 0; i < TOTAL_HEXES; i++) {
      mockStaticWorldData.definitions[`r_hex_${i}`] = {
        id: `r_hex_${i}`, name: `Hex ${i}`, biome: biomes[i], center: { x: 0, y: 0 }
      };
    }
    state = createInitialState(mockStaticWorldData);
    
    // Setup player
    state.kingdoms['k_player'].hasAscended = false;
    const capital = state.kingdoms['k_player'].capitalRegionId;
    const rIdx = parseInt(capital.replace('r_hex_', ''));
    state.ecs.regionOwner[rIdx] = 1;
    state.ecs.factionGoldBalance[1] = 1000;
    state.kingdoms['k_player'].economy.stock.gold = 1000;
    state.kingdoms['k_player'].economy.stock.wood = 1000;
    state.kingdoms['k_player'].administration.automation.construction = AutomationLevel.NearlyAutomatic;

    deps = {
      staticWorldData: mockStaticWorldData,
      clock: { now: () => 0 },
      gameStateRepository: { save: jest.fn(), loadCurrent: jest.fn(), saveCurrent: jest.fn() },
      eventBus: { publish: jest.fn() }
    };

    session = new GameSession(deps as any);
    // @ts-ignore
    session.currentState = state;
  });

  it('Cenario A - Bando Nomade: Mercado rejeitado por progressao', () => {
    const capital = state.kingdoms['k_player'].capitalRegionId;
    const result = session.executeBuildStructure(capital, BuildingType.Market);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Mercado indispon/);
  });

  it('Cenario B - Pos-Ascensao: Mercado autorizado', () => {
    state.kingdoms['k_player'].hasAscended = true;
    const capital = state.kingdoms['k_player'].capitalRegionId;
    const result = session.executeBuildStructure(capital, BuildingType.Market);
    expect(result.ok).toBe(true);
  });

  it('Cenario C - Pos-Ascensao sem recursos', () => {
    state.kingdoms['k_player'].hasAscended = true;
    state.kingdoms['k_player'].economy.stock.gold = 0; // Legacy
    state.kingdoms['k_player'].economy.stock.wood = 0; // Legacy
    state.ecs.factionGoldBalance[1] = 0; // ECS
    const capital = state.kingdoms['k_player'].capitalRegionId;
    const result = session.executeBuildStructure(capital, BuildingType.Market);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Recursos insuficientes/);
  });

  it('Cenario D - Nomade tentando construir via automacao', () => {
    state.kingdoms['k_player'].hasAscended = false;
    const automation = createAutomationSystem(Object.values(deps.staticWorldData.definitions));
    
    const context = {
      now: 0,
      state,
      nextState: state,
      deltaMs: 1000,
      events: [],
      staticData: deps.staticWorldData
    };
    
    automation.run(context as any);
    
    const marketEvent = context.events.find(e => (e as DomainEvent).payload?.buildingType === BuildingType.Market);
    expect(marketEvent).toBeUndefined();
  });
});
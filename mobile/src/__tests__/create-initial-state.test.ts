/**
 * __tests__/create-initial-state.test.ts
 * ────────────────────────────────────────
 * Testes de invariantes da geração do estado inicial do jogo.
 *
 * Por que estes testes?
 *   createInitialState é a função de boot crítica. Qualquer regressão nela
 *   pode resultar em estado corrompido ao iniciar uma nova campanha.
 *
 * O que é testado (invariantes de domínio):
 *   1. A função executa sem lançar exceções
 *   2. O estado retornado satisfaz as invariantes estruturais mínimas
 *   3. meta.schemaVersion corresponde a SAVE_SCHEMA_VERSION
 *   4. O número de reinos criados corresponde aos blueprints
 *   5. O ECS é inicializado com tamanhos corretos
 *   6. randomSeed é um número finito
 *   7. O estado inicial tem exatamente 0 guerras
 *   8. O log de eventos inicial tem pelo menos 1 entrada
 *   9. victory.achievedPath é null no início
 *  10. meta.tick é 0 no início
 *
 * O que NÃO é testado aqui:
 *   - Lógica de simulação (coberta por simulation-system tests futuros)
 *   - Persistência (coberta por save-schema tests futuros)
 *   - Renderização (requer Android)
 *
 * NOTA DE PERFORMANCE:
 *   createInitialState carrega definições de região e executa alocação de
 *   Float32Array/Int32Array para 320.000 entidades. Espera-se ~500ms-2s.
 *   O timeout do jest está configurado para 10s no jest.config.js.
 */

import { createInitialState } from '../application/boot/create-initial-state';
import { createStaticWorldData } from '../application/boot/static-world-data';
import {
  WORLD_DEFINITIONS_V1,
  WORLD_DEFINITIONS_MAP_ID,
} from '../application/boot/generated/world-definitions-v1';
import { SAVE_SCHEMA_VERSION } from '../infrastructure/persistence/save-schema';

// ── Fixture ───────────────────────────────────────────────────────────────────
// staticData é construído UMA VEZ para todos os testes (é imutável).
// Usa exatamente os mesmos dados que o GameProvider usa em produção.

let staticData: ReturnType<typeof createStaticWorldData>;

beforeAll(() => {
  staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
});

// ── Testes ────────────────────────────────────────────────────────────────────

describe('createInitialState — invariantes estruturais', () => {

  it('executa sem lançar exceção', () => {
    expect(() => createInitialState(staticData)).not.toThrow();
  });

  it('retorna um GameState com todas as propriedades obrigatórias', () => {
    const state = createInitialState(staticData);
    expect(state).toHaveProperty('meta');
    expect(state).toHaveProperty('campaign');
    expect(state).toHaveProperty('world');
    expect(state).toHaveProperty('kingdoms');
    expect(state).toHaveProperty('wars');
    expect(state).toHaveProperty('events');
    expect(state).toHaveProperty('victory');
    expect(state).toHaveProperty('randomSeed');
    expect(state).toHaveProperty('ecs');
  });

  it('meta.schemaVersion corresponde a SAVE_SCHEMA_VERSION', () => {
    const state = createInitialState(staticData);
    expect(state.meta.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
  });

  it('meta.tick é 0 no estado inicial', () => {
    const state = createInitialState(staticData);
    expect(state.meta.tick).toBe(0);
  });

  it('cria k_player e k_nature (reinos obrigatórios)', () => {
    const state = createInitialState(staticData);
    const kingdomIds = Object.keys(state.kingdoms);
    expect(kingdomIds).toContain('k_player');
    expect(kingdomIds).toContain('k_nature');
    expect(kingdomIds.length).toBeGreaterThanOrEqual(3);
  });

  it('não há guerras no estado inicial', () => {
    const state = createInitialState(staticData);
    expect(Object.keys(state.wars)).toHaveLength(0);
  });

  it('log de eventos inicial tem pelo menos 1 entrada', () => {
    const state = createInitialState(staticData);
    expect(state.events.length).toBeGreaterThanOrEqual(1);
  });

  it('victory.achievedPath é null no estado inicial', () => {
    const state = createInitialState(staticData);
    expect(state.victory.achievedPath).toBeNull();
  });

  it('victory.postVictoryMode é false no estado inicial', () => {
    const state = createInitialState(staticData);
    expect(state.victory.postVictoryMode).toBe(false);
  });

  it('randomSeed é um número finito', () => {
    const state = createInitialState(staticData);
    expect(typeof state.randomSeed).toBe('number');
    expect(Number.isFinite(state.randomSeed)).toBe(true);
  });

  it('ECS está presente e arrays principais têm tamanho TOTAL_HEXES = 320000', () => {
    const state = createInitialState(staticData);
    const ecs = state.ecs!;
    expect(ecs).toBeDefined();
    const TOTAL_HEXES = 320000;
    expect(ecs.gold.length).toBe(TOTAL_HEXES);
    expect(ecs.food.length).toBe(TOTAL_HEXES);
    expect(ecs.populationTotal.length).toBe(TOTAL_HEXES);
    expect(ecs.regionOwner.length).toBe(TOTAL_HEXES);
  });

  it('ECS cmdHead e cmdTail são 0 no estado inicial (fila de comandos vazia)', () => {
    const state = createInitialState(staticData);
    const ecs = state.ecs!;
    expect(ecs.cmdHead).toBe(0);
    expect(ecs.cmdTail).toBe(0);
  });

  it('world.mapId corresponde ao WORLD_DEFINITIONS_MAP_ID', () => {
    const state = createInitialState(staticData);
    expect(state.world.mapId).toBe(WORLD_DEFINITIONS_MAP_ID);
  });

  it('campaign.victoryTargets tem pelo menos 1 alvo', () => {
    const state = createInitialState(staticData);
    expect(state.campaign.victoryTargets.length).toBeGreaterThanOrEqual(1);
  });

  it('todos os reinos têm id e name definidos e não-vazios', () => {
    const state = createInitialState(staticData);
    for (const [id, kingdom] of Object.entries(state.kingdoms)) {
      expect(kingdom.id).toBe(id);
      expect(typeof kingdom.name).toBe('string');
      expect(kingdom.name.length).toBeGreaterThan(0);
    }
  });
});

describe('createInitialState — produções independentes', () => {
  it('dois estados independentes têm a mesma estrutura de ECS', () => {
    const s1 = createInitialState(staticData);
    const s2 = createInitialState(staticData);
    expect(s1.ecs!.gold.length).toBe(s2.ecs!.gold.length);
    expect(s1.ecs!.cmdHead).toBe(s2.ecs!.cmdHead);
    expect(s1.ecs!.cmdTail).toBe(s2.ecs!.cmdTail);
  });

  it('dois estados independentes têm o mesmo número de reinos', () => {
    const s1 = createInitialState(staticData);
    const s2 = createInitialState(staticData);
    expect(Object.keys(s1.kingdoms).length).toBe(Object.keys(s2.kingdoms).length);
  });
});

# Mapa Mental e Arquitetura da Base de Codigo

Este documento responde a pergunta pratica: **onde mexer para cada tipo de mudanca**.

Ele foi atualizado para refletir o estado real do repositorio em **2026-05-04**.

## Nivel 0: Raiz do repositorio

- `/`
  - `package.json`, `tsconfig.json`, `vite.config.ts`: configuracao de build, scripts e bundling.
  - `README.md`: overview rapido do projeto.
  - `progress.md`: caderno de sessao. Util para continuidade local, mas nao e documento oficial de produto/arquitetura.
- `docs/`
  - Fonte oficial de documentacao viva: roadmap, manual, estrategia de testes, arquitetura e diario tecnico.
- `src/`
  - Codigo do jogo web.
- `desktop/`
  - Casca Electron para distribuicao desktop/offline.
- `public/assets/maps/`
  - Artefatos do mapa gerados pelo pipeline geografico.
- `scripts/`
  - Ferramentas auxiliares de geracao e build de dados.
- `tests/`
  - Suite automatizada com Vitest e Playwright.

## Nivel 1: UI e apresentacao

### `src/main.ts`

Continua sendo o maestro da aplicacao web.

Responsabilidades atuais:
- montar a DOM principal;
- inicializar `GameSession`, worker, persistencia e renderer;
- orquestrar splash screen, save/load, debug panel e parte importante da renderizacao legado;
- expor hooks de automacao como `window.render_game_to_text()` e `window.advanceTime(ms)`.

**Estado real:** nao e mais um "God Object puro", mas ainda concentra muita responsabilidade. A extracao para controladores existe e esta incompleta.

### `src/styles/`

- `global.css`: layout, tema, responsividade, paineis DOM e estilos do mapa.

### `src/ui/controllers/`

Camada de controladores MVC/MVP criada para reduzir acoplamento de `main.ts`.

Arquivos principais:
- `base-controller.ts`: base comum.
- `tab-controller-manager.ts`: ciclo de vida dos controladores.
- `progression-controller.ts`: aba de progressao.
- `map-controller.ts`, `government-controller.ts`, `technology-controller.ts`: primeiras abas extraidas.

### `src/ui/view-models/`

Helpers puros de apresentacao.

Arquivos principais:
- `dashboard-vm.ts`: resumo de dashboard.
- `render-game-to-text.ts`: serializer textual do estado jogavel usado em automacao, smoke test e depuracao.

### `src/ui/i18n/`

- Dicionarios e mensagens de interface.

## Nivel 2: Aplicacao e orquestracao

### `src/application/game-session.ts`

E a API central da campanha.

Responsabilidades:
- manter o `currentState`;
- aplicar acoes do jogador;
- rodar o `TickPipeline`;
- salvar/carregar snapshots e slots;
- integrar eventos, autosave, offline progression e metricas de runtime;
- oferecer stepping manual de simulacao via `advanceTimeForTesting`.

**Quando mexer aqui:** qualquer mudanca em regras de sessao, persistencia, pacing do tick, comandos do jogador ou observabilidade.

### `src/application/boot/`

Bootstrap da campanha.

Arquivos principais:
- `create-initial-state.ts`: fabrica do estado inicial.
- `static-world-data.ts`: dados estaticos do mundo.
- `generated/world-definitions-v1.*`: definicoes geograficas geradas.

### `src/application/save/`

- `build-save-summary.ts`: resumo legivel de saves.

### `src/application/god-mode.ts`

- Console/painel de desenvolvedor para cheats, telemetria e diagnostico.

## Nivel 3: Infraestrutura

### `src/infrastructure/worker/`

- `simulation.worker.ts`: thread paralela dos arrays ECS e efeitos numericos pesados.

### `src/infrastructure/rendering/`

- `hybrid-map-renderer.ts`: casca principal do mapa.
- Renderers auxiliares MapLibre/Pixi/WebGL.

### `src/infrastructure/persistence/`

- `runtime-persistence.ts`: bundle de persistencia de runtime.
- `save-slots.ts`: IDs e convencoes dos slots.
- `web-fs-repositories.ts`: persistencia baseada em Web File System quando aplicavel.

### `src/infrastructure/runtime/`

- `browser-clock-service.ts`: clock da simulacao.
- `local-event-bus.ts`: barramento de eventos local.

### `src/infrastructure/diplomacy/`, `npc/`, `war/`

Adaptadores concretos da IA diplomatica, decisoes NPC e resolucao de guerra.

## Nivel 4: Core domain

### `src/core/models/`

Modelos centrais do estado salvo.

Arquivos criticos:
- `game-state.ts`: raiz do estado.
- `world.ts`: regioes, religioes, personagens e `eventChains`.
- `events.ts`, `economy.ts`, `military.ts`, `religion.ts`, `technology.ts`, `administration.ts`.

**Regra critica:** se mudar contrato em `core/models`, valide save/load, F5, smoke test e regressao automatizada.

### `src/core/data/`

- Arvores e definicoes imutaveis, como `technology-tree.ts` e legendaries.

### `src/core/utils/`

- `clone-game-state.ts`, `stable-hash.ts`, `state-fingerprint.ts` e utilitarios de seguranca/determinismo.

### `src/core/simulation/`

Pipeline POO de alto nivel.

Arquivos principais:
- `tick-pipeline.ts`: loop de simulacao.
- `create-default-systems.ts`: composicao dos sistemas.
- `systems/`: conselho, personagens, desastres, event chains, event log, decisoes NPC e afins.

## Cheatsheet de impacto

### Se voce quer adicionar uma nova acao de UI

Mire, em ordem:
- `src/main.ts` ou `src/ui/controllers/*`
- `src/application/game-session.ts`
- `src/core/models/events.ts` se precisar log/evento
- testes de `GameSession` ou view-model correspondente

### Se voce quer adicionar novo dado salvo

Mire, em ordem:
- `src/core/models/*`
- `src/core/utils/clone-game-state.ts`
- `src/application/boot/create-initial-state.ts`
- persistencia (`game-session`, repositorios, migracao de save)
- testes de save/load

### Se voce quer alterar o comportamento do mundo

Mire, em ordem:
- `src/core/simulation/systems/*`
- `src/core/simulation/create-default-systems.ts`
- `src/application/game-session.ts` se a mudanca afetar pacing, eventos ou persistencia
- testes do sistema tocado

### Se voce quer melhorar smoke automation

Mire, em ordem:
- `src/ui/view-models/render-game-to-text.ts`
- hooks em `src/main.ts`
- `GameSession.advanceTimeForTesting`
- `tests/render-game-to-text.test.ts`
- `tests/game-session-advance-time.test.ts`

## Riscos atuais

- `src/main.ts` ainda concentra muita renderizacao e binding legados.
- O bundle principal segue grande.
- A extracao de UI ainda nao cobre todas as abas.
- Antes de iniciar a Fase 5, este mapa deve continuar refletindo a reducao real desse debito, nao uma intencao.

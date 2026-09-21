# Handoff Snapshot: Epochs Idle (2026-09-14)

Este documento contem um retrato bruto e verificavel do estado atual do projeto, gerado automaticamente para auditoria pelo novo tech lead, conforme solicitado.

-----------------------------------------------
## 1. ESTADO DO REPOSITORIO
-----------------------------------------------

### git branch -a
`	ext
  audit/local-snapshot-2026-09-02
* chore/p15-closure-and-soak-test
  main
  remotes/origin/audit/local-snapshot-2026-09-02
  remotes/origin/chore/p15-closure-and-soak-test
  remotes/origin/main
`
*(As unicas branches existentes e sem PR na maquina sao main e um snapshot antigo audit/local-snapshot-2026-09-02)*

### git log --oneline -n 30 (da branch principal origin/main)
`	ext
3d9b84f chore(docs): complete P15-C.2 physical experiment execution logs and results
e152847 checkpoint: stabilize ECS runtime and sparse persistence
2fe84fe chore: atualiza documentacao com diagnostico de Economia, UI e Simulacao
00cca04 Fix capital indexing bug and TS errors
9b548a4 feat: Fix Map UI, Migration System and Extreme Biome Warnings
ab6effe feat(map): implement real Earth topology via sharp with zoom snap optimizations
a326f71 fix(map): implement focal compensation for pinch gesture and manual zoom to prevent slingshot effect
da22b42 fix(map): hoist Dimensions.get() out of Reanimated Worklets to prevent native UI crash
f8a8e61 feat(map): implement cylindrical phantom rendering (1x3 grid) for infinite horizontal scroll
a6b4fe6 fix(ui): prevent runtime crash in RegionDetailPanel on unhydrated ECS state
25ed1c2 fix(map): center camera dynamically on player's procedural spawn (capital)
d8c89bc refactor(map): implement V3 Skia PathBuilder and 250ms frame throttling
5ee22b5 feat(map): activate SimulationCanvas with real world data
cd98c7b feat(ui): UI/UX polish pass - eliminate Black Abyss & fix Flexbox distortion
a29b1cd style(ui): re-add feed tab to EstadoScreen, move notifications to TopHUD bell, and compress vertical padding
ca72b20 fix(ui): prevent right pill clipping in EstadoScreen ScrollView on Android
3b012d6 feat(ui): integrate RegionDetailPanel into MapScreen and remove obsolete rendering files
6a6b1f9 fix(ui): collapse TopHUD to single compact row - ?? [?] ?? ?? saves ~30px vertical space
b918419 fix(ui): resolve TopHUD overlap - onLayout-driven hudHeight, HudAwareScreen, remove save btn from HUD, symmetric stats row
60c6533 feat(ui): implement 5-tab shell overhaul - TopHUD global, EstadoScreen, SistemaScreen, Cronicas log
`

### Status do PR #4 (gh pr view 4)
`	ext
title:	P15: encerramento e soak test
state:	OPEN
author:	jardimdossonhos
number:	4
url:	https://github.com/jardimdossonhos/epochs-idle-mobile/pull/4
`

### Lista Completa de Issues Abertas
`	ext
5	OPEN	[divida pre-P15] Teste falhando: progression-build (Cenario B - Mercado autorizado)		2026-09-11T19:50:06Z
3	OPEN	[divida pre-P15] Teste falhando: progression-build (Cenario C - Sem recursos)		2026-09-11T19:04:29Z
2	OPEN	[divida pre-P15] Teste falhando: progression-build (Cenario A - Mercado indisponivel)		2026-09-11T19:04:28Z
1	OPEN	[divida pre-P15] Teste falhando: economy-consolidation (Upkeep inicial)		2026-09-11T19:04:26Z
`

### git status (Working Directory)
`	ext
On branch chore/p15-closure-and-soak-test
Your branch is up to date with 'origin/chore/p15-closure-and-soak-test'.
nothing to commit, working tree clean
`
*(Nota: O stash temporario que havia foi descartado no processo iterativo. O diretorio esta totalmente limpo)*


-----------------------------------------------
## 2. SAUDE DE TESTES E BUILD
-----------------------------------------------

### Output Bruto de npm run test
`	ext
> mobile@1.0.0 test
> jest --passWithNoTests

PASS src/__tests__/utf8-integrity.test.ts
PASS src/__tests__/stable-hash.test.ts
PASS src/__tests__/region-index.test.ts
PASS src/__tests__/autosave-phase-c.test.ts
PASS src/__tests__/c1-roundtrip.test.ts
PASS src/__tests__/ownership-invariants.test.ts
PASS src/__tests__/bootstrap-aggregations.test.ts
PASS src/__tests__/validate-save-real.test.ts
PASS src/__tests__/capital-integrity.test.ts
PASS src/__tests__/structural-sharing-capital.test.ts
PASS src/__tests__/ecs-integrity.test.ts
PASS src/__tests__/lifecycle-new-game.test.ts
PASS src/__tests__/spawn-continent.test.ts
FAIL src/__tests__/economy-consolidation.test.ts (5.934 s)
  ? Phase 2 - Economy Consolidation › A - Economia Inicial (Bando Nomade)

    expect(received).toBeLessThan(expected)

    Expected: < 1
    Received:   2.28

      49 |     const netIncome = kingdom.economy.netIncomePerTick[ResourceType.Gold];
      50 |     
    > 51 |     expect(upkeep).toBeLessThan(1.0); // O upkeep inicial deve ser bem baixo agora que usedCapacity = 5
         |                    ^
      52 |     expect(netIncome).toBe(income - upkeep);
      53 |   });
      54 |

      at Object.toBeLessThan (src/__tests__/economy-consolidation.test.ts:51:20)

FAIL src/__tests__/progression-build.test.ts (6.216 s)
  ? Progression Build Pipeline › Cenario A - Bando Nomade: Mercado rejeitado por progressao

    expect(received).toMatch(expected)

    Expected pattern: /Mercado indispon/
    Received string:  "Voce so pode construir em seus proprios territorios."

      51 |     const result = session.executeBuildStructure(capital, BuildingType.Market);
      52 |     expect(result.ok).toBe(false);
    > 53 |     expect(result.message).toMatch(/Mercado indispon/);
         |                            ^
      54 |   });
      55 |
      56 |   it('Cenario B - Pos-Ascensao: Mercado autorizado', () => {

      at Object.toMatch (src/__tests__/progression-build.test.ts:53:28)

  ? Progression Build Pipeline › Cenario B - Pos-Ascensao: Mercado autorizado

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      58 |     const capital = state.kingdoms['k_player'].capitalRegionId;
      59 |     const result = session.executeBuildStructure(capital, BuildingType.Market);
    > 60 |     expect(result.ok).toBe(true);
         |                       ^
      61 |   });
      62 |
      63 |   it('Cenario C - Pos-Ascensao sem recursos', () => {

      at Object.toBe (src/__tests__/progression-build.test.ts:60:23)

  ? Progression Build Pipeline › Cenario C - Pos-Ascensao sem recursos

    expect(received).toMatch(expected)

    Expected pattern: /Recursos insuficientes/
    Received string:  "Voce so pode construir em seus proprios territorios."

      69 |     const result = session.executeBuildStructure(capital, BuildingType.Market);
      70 |     expect(result.ok).toBe(false);
    > 71 |     expect(result.message).toMatch(/Recursos insuficientes/);
         |                            ^
      72 |   });
      73 |
      74 |   it('Cenario D - Nomade tentando construir via automacao', () => {

      at Object.toMatch (src/__tests__/progression-build.test.ts:71:28)

PASS src/__tests__/create-initial-state.test.ts (6.469 s)
PASS src/__tests__/benchmark-save.test.ts (6.564 s)

Test Suites: 2 failed, 15 passed, 17 total
Tests:       4 failed, 116 passed, 120 total
Snapshots:   0 total
Time:        7.997 s
Ran all test suites.
`
*Cruze de Falhas vs Issues:*
- Falha "A - Economia Inicial (Bando Nomade)" -> **Issue #1**
- Falha "Cenario A - Bando Nomade: Mercado rejeitado" -> **Issue #2**
- Falha "Cenario B - Pos-Ascensao: Mercado autorizado" -> **Issue #5**
- Falha "Cenario C - Pos-Ascensao sem recursos" -> **Issue #3**
*(Nenhuma falha avulsa sem issue aberta. Todas correspondem a dividas cadastradas).*

### Output de tsc --noEmit
`	ext
src/telemetry/memoryWatch.ts(12,23): error TS2339: Property 'HermesInternal' does not exist on type 'typeof globalThis'.
src/telemetry/memoryWatch.ts(12,65): error TS2339: Property 'HermesInternal' does not exist on type 'typeof globalThis'.
src/telemetry/memoryWatch.ts(18,33): error TS2339: Property 'HermesInternal' does not exist on type 'typeof globalThis'.
src/telemetry/memoryWatch.ts(23,34): error TS2339: Property 'HermesInternal' does not exist on type 'typeof globalThis'.
`
*(Erro de tipagem global introduzido no P15: O SDK atual do React Native nao tem os types do HermesInternal expostos explicitamente).*

### Output de npm run lint
`	ext
> mobile@1.0.0 lint
> eslint src --max-warnings 0

'eslint' nao e reconhecido como um comando interno
ou externo, um programa operavel ou um arquivo em lotes.
`
*(ESLint declarado no package.json em scripts, porem a infraestrutura ou node_modules nao esta instalando o binario eslint corretamente).*

### CI (GitHub Actions)
`	ext
completed	failure	chore: atualiza documentacao com diagnostico de Economia, UI e Simulacao	Deploy to GitHub Pages	main	push	32158876555	34s	2026-08-18T16:10:47Z
`
*(A ultima run que rodou na main falhou no Deploy para o GitHub Pages em Agosto).*


-----------------------------------------------
## 3. INVENTARIO DE DOCUMENTACAO
-----------------------------------------------

### Estrutura e Arquivos em docs/
`	ext
docs\project\ROADMAP.md
docs\project\PROJECT-STATUS.md
docs\project\TECHNICAL-DEBT.md
docs\project\P6-12-CAUSAL-INVESTIGATION.md
docs\project\P7-CAUSAL-INVESTIGATION.md
docs\project\P9-CAUSAL-CONTROL.md
docs\project\P15-* (inumeros logs RAW de test cycles)
docs\investigations\P15-memory.md
docs\onboarding\handoff-snapshot-2026-09-14.md
`

### README.md
O arquivo README.md nao continha texto. Seu fetch de conteudo gerou retorno silencioso (vazio ou inexistente).


-----------------------------------------------
## 4. SEGUIMENTO DE P15 (SOAK TEST)
-----------------------------------------------

* **soak-test-results.csv**: INEXISTENTE (nao foi encontrado nem via path relativo nem em busca recursiva no disco).
* **Processo do PowerShell rodando**: Nao. Nao ha instancias ativas.
* **Diagnostico de Interrupcao**: **O processo morreu sem terminar**. O servidor/maquina foi reiniciado pelo sistema na data "2026-09-14", o que forcou o encerramento do container de background (Aviso emitido: "All your subagents and background tasks have been stopped due to server restart"). Como a interrupcao foi abrupta ou o stream cortado antes do write-out/flush, os dados das 3 horas nao foram gravados no sistema de arquivos.


-----------------------------------------------
## 5. MAPA DO CODIGO
-----------------------------------------------

### Visao src/ Alto Nivel
`	ext
src\application
src\assets
src\core
src\infrastructure
src\metrics
src\persistence
src\simulation
src\telemetry
src\ui
src\__tests__
src\application\ai
src\application\auth
src\application\boot
src\application\save
src\application\sync
src\core\components
src\core\config
src\core\contracts
src\core\data
src\core\ecs
src\core\instrumentation
src\core\models
src\core\services
src\core\simulation
src\core\systems
src\infrastructure\diplomacy
src\infrastructure\npc
src\infrastructure\persistence
src\infrastructure\rendering
src\infrastructure\runtime
src\infrastructure\sync
src\infrastructure\telemetry
src\infrastructure\war
src\infrastructure\worker
src\ui\components
src\ui\context
src\ui\core
src\ui\hooks
src\ui\i18n
src\ui\screens
src\ui\store
`

### Arquivos-Chave do P15
*   **TopHUD**: src\ui\components\TopHUD.tsx
*   **GameProvider**: src\ui\GameProvider.tsx
*   **RenderSyncSystem**: src\core\simulation\render\render-sync-system.ts
*   **GameSession**: src\application\game-session.ts
*   **Nucleo do ECS**: src\core\ecs\*

### Comentarios TODO / FIXME / HACK
`	ext
src\simulation\simulation-engine.ts:201:    // TODO: Implement mathematical algebraic resource production:
src\telemetry\memoryWatch.ts:27:            // TODO: Integrar com provedor real (Sentry/Crashlytics) quando existir
src\core\simulation\systems\conquest-system.ts:83:            // TODO: Aqui engataremos uma flag (Dirty Bit) de repintura do SVG/Frontend
`

### package.json (Producao)
*   **Versao React Native**: 0.85.3
*   **Versao Expo**: ~56.0.13
*   **Hermes**: Integrado ativamente (versoes modernas RN +0.70)
*   **Dependencias Principais**:
`json
  "dependencies": {
    "@capacitor/preferences": "^8.0.1",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-google-signin/google-signin": "^16.1.2",
    "@react-navigation/bottom-tabs": "^7.18.3",
    "@react-navigation/native": "^7.3.4",
    "@shopify/react-native-skia": "2.6.2",
    "@types/geojson": "^7946.0.16",
    "expo": "~56.0.13",
    "expo-dev-client": "~56.0.23",
    "expo-file-system": "~56.0.8",
    "expo-navigation-bar": "~56.0.3",
    "expo-splash-screen": "~56.0.14",
    "expo-status-bar": "~56.0.4",
    "idb": "^8.0.3",
    "maplibre-gl": "^6.2.0",
    "pixi.js": "^8.19.0",
    "react": "19.2.3",
    "react-native": "0.85.3",
    "react-native-gesture-handler": "~2.31.1",
    "react-native-map-buffer": "file:modules/react-native-map-buffer",
    "react-native-mmkv": "^4.3.2",
    "react-native-nitro-modules": "^0.36.1",
    "react-native-reanimated": "4.3.1",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "^4.25.2",
    "react-native-svg": "15.15.4",
    "react-native-worklets": "0.8.3",
    "sharp": "^0.35.3",
    "zustand": "^5.0.14"
  }
`

-----------------------------------------------
## 6. ESTADO OPERACIONAL
-----------------------------------------------

### Telemetria
- Flag MEMORY_WATCH_ENABLED: Encontra-se explicitamente atribuida como false em src/telemetry/memoryWatch.ts.

### Configuracoes de Ambiente (Secrets/.env)
Foi encontrado um arquivo local de ambiente nao versionado (.env). Ele contem atualmente a seguinte chave nao documentada:
`env
EXPO_PUBLIC_PROXY_URL=http://localhost:8787
`
Nenhuma outra chave de API sensivel ou token Cloudflare/GCP esta presente neste ambiente local no momento.

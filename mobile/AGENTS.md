# EXPO HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

Before any change involving Expo, React Native, or platform-specific APIs, consult the
documentation for the exact project version (Expo SDK 56). Do not assume behavior from
previous or later versions of Expo.

---

# ENGINEERING RULES FOR AGENTIC WORKFLOW

## Project Context

* **Game engine:** Epochs Idle (React Native, Expo SDK ~56.0.13, RN 0.85.3)
* **Package manager:** npm (package-lock.json)
* **Build type:** Bare workflow (android/ directory exists)
* **Android package:** `com.epochs.idle`
* **Schema version:** `SAVE_SCHEMA_VERSION = 4` (`src/infrastructure/persistence/save-schema.ts`)
* **Document 1 — Design Specification:** `docs/design/EPOCHS-IDLE-DESIGN-SPEC.md`
* **ECS size:** 320.000 entidades (`TOTAL_HEXES = 320000` em `create-initial-state.ts`)

### Estado atual do Documento 1

`docs/design/EPOCHS-IDLE-DESIGN-SPEC.md` é a base principal da especificação de produto e comportamento do jogo.

**Importante:** enquanto o Documento 1 estiver em consolidação, ele NÃO deve ser tratado como uma versão final aprovada quando ainda houver decisões de produto abertas.

Durante a consolidação:

* decisões explícitas e aprovadas pelo usuário têm precedência sobre qualquer redação provisória do Documento 1;
* ambiguidades de produto devem ser identificadas e levadas ao usuário;
* o agente não deve transformar uma hipótese técnica em uma decisão de design;
* alterações que mudem o comportamento desejado do jogo precisam de aprovação do usuário;
* o objetivo é chegar a uma única especificação canônica, completa e sem ambiguidades relevantes.

---

## Verification Commands

Use the validation appropriate to the type of change.

For code changes:

```text
npm run typecheck              # tsc --noEmit (verificação rápida de tipos)
npm run test                   # jest (executa testes unitários)
npm run verify                 # Pipeline completo: typecheck + lint + tests + expo-doctor
npm run android:verify         # Pipeline completo + ADB + logcat (APK existente)
npm run android:full-verify    # Pipeline completo + BUILD + instalar + logcat
```

Toda tarefa que alterar código deve executar `npm run verify`, salvo exceção explicitamente documentada.

`npm run android:verify` e `npm run android:full-verify` devem ser executados quando a alteração envolver Android ou quando a garantia correspondente de execução no dispositivo for necessária.

Tarefas exclusivamente documentais devem executar as validações apropriadas ao conteúdo alterado. Não é necessário executar o pipeline completo de código apenas por uma alteração documental, salvo quando a própria tarefa exigir isso.

Nunca declarar uma alteração como validada apenas porque um comando terminou com exit code 0. Sempre verificar o status semântico do pipeline.

---

## Status Semânticos do Pipeline

O pipeline distingue claramente os seguintes estados. **Nunca confunda exit code 0 com "projeto validado".**

| Status               | Significado                                             | Exit Code |
| -------------------- | ------------------------------------------------------- | --------- |
| `PASS`               | Executado, passou sem problemas                         | 0         |
| `PASS_WITH_WARNINGS` | Executado, passou, mas tem avisos não críticos          | 0         |
| `PARTIAL`            | Alguma etapa é NOT_CONFIGURED ou PASS_WITH_WARNINGS     | 0         |
| `NOT_CONFIGURED`     | Ferramenta não configurada (ex: sem ESLint, sem testes) | 0         |
| `NOT_EXECUTED`       | Ferramenta configurada mas não pôde rodar (problema)    | 1         |
| `FAIL`               | Executado e falhou com erro real                        | 1         |

### Status Geral (Overall)

| Condição                                            | Overall   |
| --------------------------------------------------- | --------- |
| Todas as etapas configuradas passaram               | `PASS`    |
| Alguma etapa é NOT_CONFIGURED ou PASS_WITH_WARNINGS | `PARTIAL` |
| Qualquer etapa com FAIL ou NOT_EXECUTED             | `FAIL`    |

### Interpretação correta para o agente

* `Overall: PARTIAL` com `Tests: NOT_CONFIGURED` → **Testes não existem. Não é PASS.**
* `Overall: PARTIAL` com `Expo Doctor: PASS_WITH_WARNINGS` → **Há avisos documentados. Não é PASS.**
* `Overall: PASS` → Todas as ferramentas configuradas passaram.
* `Overall: FAIL` → Há erros reais. Investigar e corrigir antes de declarar conclusão.

---

## Problemas Expo Doctor (Dívida Técnica Documentada)

### 1. `react-native-worklets` — CORRIGIDO

* **Situação:** Era peer dependency transitiva não declarada. Agora declarado explicitamente no `package.json`.
* **Status:** `react-native-worklets@0.8.3` em `dependencies`.

### 2. `babel-preset-expo` major mismatch — CORRIGIDO

* **Situação:** Versão 57.x instalada quando SDK 56 requer ~56.x. Corrigido.
* **Status:** `babel-preset-expo@~56.0.0` em `devDependencies`. Instalado: `56.0.19`.

### 3. Hermes V1 Memory Regression — DÍVIDA TÉCNICA ATIVA

* **Situação:** Expo SDK 56 com Hermes `250829098.0.15` afetado por memory leak.
* **Fix oficial:** Upgrade para SDK 57 + `expo@57.0.9+` ou React Native `0.86.2+`.
* **Impacto:** Possível degradação de memória em sessões longas.
* **Decisão:** Não corrigir agora (requer upgrade de SDK). Documentado.
* **Expo Doctor exibirá:** `PASS_WITH_WARNINGS` (19/22 checks ok, 1 warning de Hermes).

---

## android:verify vs android:full-verify

### `android:verify` (rápido, ~20s)

* Verifica ADB + dispositivo.
* Verifica se o pacote está instalado.
* **Alerta se APK local tem mais de 60 minutos** (pode não corresponder ao código atual).
* Inicia o app e coleta logcat.
* **NÃO garante que o APK instalado é do código atual.**
* Usar após `expo run:android` ou quando o APK já foi instalado recentemente.

### `android:full-verify` (lento, ~5–15 min)

* Executa `gradle assembleDebug`.
* Instala o APK fresco via `adb install`.
* Executa todo o ciclo de verificação logcat.
* **Garante que o APK corresponde ao código-fonte atual.**
* Usar quando precisar de garantia formal de correspondência código ↔ APK.

### Status do android:verify

| Status                              | Exit | Significado                           |
| ----------------------------------- | ---: | ------------------------------------- |
| `PASS [QUICK_VERIFY]`               |    0 | App iniciou, logcat limpo             |
| `PASS_WITH_WARNINGS [QUICK_VERIFY]` |    0 | App iniciou, warnings não críticos    |
| `APP_CRASH`                         |    1 | FATAL EXCEPTION / SIGSEGV detectado   |
| `APP_ANR`                           |    1 | ANR / Input dispatching timed out     |
| `LOGCAT_ERRORS`                     |    1 | Erros sem crash                       |
| `ANDROID_DEVICE_NOT_AVAILABLE`      |    2 | Sem dispositivo usável                |
| `TEST_NOT_EXECUTED`                 |    3 | ADB não encontrado                    |
| `BUILD_FAILED`                      |    4 | Gradle falhou (apenas `--full-build`) |

---

## Testes

### Infraestrutura atual

* Framework: `jest-expo@56` (compatível com Expo SDK 56)
* Config: `jest.config.js` (preset: jest-expo, timeout: 10s)
* Arquivos de teste: `src/__tests__/`

### Testes existentes

| Arquivo                                      | Foco                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/__tests__/stable-hash.test.ts`          | `stableStringify`, `hashDeterministic` — invariantes do sistema de fingerprint |
| `src/__tests__/create-initial-state.test.ts` | `createInitialState` — invariantes estruturais do boot                         |

### Princípios para novos testes

* Testar apenas código **determinístico** e **livre de dependências nativas**.
* Não criar testes artificiais para aumentar cobertura.
* Não alterar lógica de jogo para facilitar testes.
* Prioridade: funções puras → invariantes de estado → serialização → sistemas ECS.

---

## ADB — Descoberta Dinâmica

`scripts/find-adb.js` descobre o ADB sem hardcode. Ordem de busca:

1. `adb` no PATH (via `where`/`which`)
2. `$ANDROID_HOME/platform-tools/adb[.exe]`
3. `$ANDROID_SDK_ROOT/platform-tools/adb[.exe]`
4. `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` (Windows)
5. `~/Android/Sdk/platform-tools/adb` (Linux)
6. `~/Library/Android/sdk/platform-tools/adb` (macOS)

**Nunca introduzir caminho absoluto de ADB em nenhum script.**

---

## Análise de Logcat

O logcat é analisado com filtros rigorosos.

**CRASH** (exit 1):

* `FATAL EXCEPTION`
* `SIGSEGV`
* `SIGABRT`
* `Process: ..PID:`

**ANR** (exit 1):

* `ANR in`
* `Input dispatching timed out`

**ERRORS** (exit 1):

* `NullPointerException`
* `IllegalStateException`
* `ReactNativeJS.*Error`
* etc.

**WARNINGS** (`PASS_WITH_WARNINGS`):

* linhas `W/` não ignoradas

**IGNORADOS** (falsos positivos documentados):

* `EGLConsumer.*not attached` — tratado em `MapScreen.tsx` (`isMounted` guard)
* `Choreographer.*dropped N frame` — normal em emuladores
* `libEGL.*DEBUG` — ruído de driver gráfico
* linhas `D/`, `I/`, `V/` — debug/info/verbose

Log completo salvo em `.verify-logs/` — nunca enviado integralmente ao contexto do modelo.

---

## Planning

Before significant changes:

1. Understand the architecture and the component being modified.
2. Identify all affected files and their dependencies.
3. Identify invariants that must not be broken.
4. Identify risks and edge cases.
5. Define how the change will be validated (which verify commands, which scenarios).
6. Confirm which design requirement authorizes the change.
7. Confirm that the change belongs to the current implementation phase.
8. Check the current repository state before modifying anything.

Do not start complex changes by trial and error.

Do not rely only on previous reports to determine the current state of the code. When the current implementation matters, inspect the current files and Git state directly.

---

## Implementation Constraints

* Prefer minimal, localized changes.
* Do not rewrite entire files without necessity.
* Do not modify code unrelated to the task.
* Do not introduce dependencies without necessity.
* Do not duplicate existing logic.
* Do not use `any` to hide type errors — fix the actual type.
* Do not disable TypeScript strictness to make code compile.
* Do not remove validations or error handling.
* Do not use empty `catch` blocks.
* Do not modify tests to make an implementation pass.
* Do not remove existing tests to eliminate failures.
* Do not silently change game semantics to simplify implementation.
* Do not create temporary gameplay implementations that may accidentally become permanent architecture.

---

## Root Cause Analysis Protocol

When a verify step, test, or run fails:

**DO NOT make random changes.**

1. Reproduce the failure.
2. Collect evidence (logcat, stack trace, error output — compact, not full dumps).
3. Read the error message.
4. Read the stack trace.
5. Determine the probable root cause.
6. Confirm or attempt to falsify the hypothesis.
7. Implement the targeted fix.
8. Run verify again.

**Prioritize fixing root causes, not working around symptoms.**

---

## Token and Context Efficiency

* Do NOT send full build logs or full logcat dumps to model context.
* DO use: summaries, counts, last N lines, error messages, diffs, PASS/FAIL results.
* Full logs are saved to `.verify-logs/` for investigation — read selectively if needed.
* Use `Select-Object -Last N` or `Select-String` for targeted log extraction.

---

## Finalization Checklist

Before declaring a **code** task complete:

* [ ] `npm run verify` → `Overall: PASS` or documented `PARTIAL`.
* [ ] `npm run android:verify` → `PASS` when Android validation is required.
* [ ] `git diff --stat` reviewed — no unintended changes.
* [ ] `git status` checked.
* [ ] No temp files or debug logs accidentally added.
* [ ] No changes unrelated to the task.
* [ ] The actual changed files were inspected.
* [ ] The implementation matches the approved design requirement.
* [ ] Remaining limitations are explicitly recorded.

Report:

* What was changed.
* Which files actually changed.
* Which verifications were run.
* Results (including `PARTIAL`/`NOT_CONFIGURED` details).
* Remaining limitations.
* What was observed directly versus inferred.

For **documentation-only** tasks, use an appropriate documentation review instead of requiring the full code verification pipeline.

---

## Game Logic Boundary

Infrastructure tasks must NOT:

* Refactor game logic.
* Change game mechanics.
* Alter UI behavior.
* Change balance values.
* Fix bugs unrelated to the task.

If an infrastructure problem appears to require a gameplay change, stop and distinguish the infrastructure issue from the design decision before proceeding.

---

# PROJECT GOVERNANCE — MANDATORY ORDER OF AUTHORITY AND EXECUTION

## Fundamental Principle

Development of Epochs Idle follows a mandatory separation between:

1. **WHAT THE GAME MUST BE**
2. **HOW THE GAME WILL BE IMPLEMENTED**
3. **WHAT HAS ACTUALLY BEEN IMPLEMENTED**
4. **WHAT HAS BEEN PROVEN BY EVIDENCE**

The existing code must never be treated as the definition of the design. It represents only the current implementation state.

---

## Document 1 — Product and Design Specification

`docs/design/EPOCHS-IDLE-DESIGN-SPEC.md`

This is the principal specification of the game that we intend to have in the final state.

It must eventually describe, with enough precision to eliminate relevant ambiguity:

* vision and objective;
* game rules;
* systems and subsystems;
* expected behavior;
* limits;
* prohibited behavior;
* relations between systems;
* consequences and causality;
* online and offline behavior;
* automation;
* progression;
* characters and dynasties;
* culture;
* religion;
* technology;
* government;
* economy;
* population;
* diplomacy;
* warfare;
* geography;
* procedural generation;
* dynamic kingdoms/political entities;
* special conditions and exceptions;
* examples where necessary;
* acceptance criteria where necessary.

### Authority during consolidation

The user is the primary authority for product and design decisions.

While Document 1 is still being consolidated:

* explicit decisions already approved by the user have priority over provisional wording in the document;
* unresolved product decisions must be identified explicitly;
* the agent may identify contradictions, omissions, risks and technical consequences;
* the agent may propose alternatives;
* the agent must NOT silently select a product decision merely because one implementation appears easier or more efficient.

Changes to Document 1 that alter the intended behavior of the game require user approval.

### Final approval

Document 1 becomes the canonical final design specification only after the user explicitly approves the consolidated version.

Until then, it is a working canonical draft and must not be presented as the final approved game specification.

---

## Document 2 — Technical Implementation Plan

Document 2 defines **HOW TO REACH the game described in Document 1**.

It must be created and finalized only after the relevant scope of Document 1 is sufficiently consolidated.

Document 2 must identify, system by system:

* current state proven from the real code;
* desired state defined by Document 1;
* exact divergences;
* missing functionality;
* obsolete functionality;
* architectural dependencies;
* required architecture;
* files and components affected;
* migration strategy;
* persistence/save implications;
* temporal implications;
* performance implications;
* implementation order;
* risks;
* validation strategy;
* required tests;
* objective acceptance criteria;
* evidence required for closure.

Document 2 is a joint technical responsibility of the assistant's analysis and the engineering agent's investigation and implementation work.

The real repository is the source of evidence for the current implementation.

---

## Design Freeze Before Implementation

While Document 1 has not been explicitly approved as the final design:

* do NOT start gameplay refactors;
* do NOT implement new gameplay systems merely to anticipate unresolved decisions;
* do NOT change gameplay behavior to match an interpretation of an unresolved requirement;
* do NOT use the existing code to decide what the game should be;
* do NOT create provisional gameplay implementations that could become accidental final architecture.

### What IS allowed during the design phase

The following may be performed without implementing gameplay:

* read-only inspection of the existing code;
* repository inventory;
* architectural analysis;
* identification of contradictions;
* identification of missing systems;
* characterization of current behavior;
* technical feasibility analysis;
* documentation work;
* creation of evidence reports;
* preparation of the technical implementation plan.

The purpose is to understand the current system, not to prematurely change it.

If an investigation discovers that a product decision is required, record the issue and bring it to the user rather than deciding it implicitly.

---

## Authority Hierarchy

The authority hierarchy is:

1. **Explicit product/design decisions approved by the user.**
2. **Document 1 — approved canonical design specification.**
3. **Document 2 — approved technical implementation plan.**
4. **Actual repository/code state.**
5. **Tests and observed behavioral evidence.**
6. **Engineering-agent reports and technical interpretations.**
7. **Hypotheses, suggestions and assumptions.**

Important:

* Existing code is evidence of what exists, not proof that it is the intended design.
* Tests are evidence of observed behavior, not automatically proof that the behavior is desirable.
* Antigravity reports are technical reports and are NOT automatic proof that an implementation was correctly completed.
* A technically valid implementation can still be wrong if it violates Document 1.

---

## Verification of Engineering-Agent Claims

Any material claim by the engineering agent about modification, correction, implementation or completion must be checked against the real project when relevant.

Do not accept as proof, by themselves, statements such as:

* "foi corrigido";
* "está implementado";
* "está funcionando";
* "foi validado";
* "está completo";
* "os testes passaram".

Verification should use, as appropriate:

* actual files;
* `git diff`;
* `git status`;
* exact source code;
* executed tests;
* logs;
* runtime observations;
* validation results;
* before/after comparisons.

Always distinguish:

* **FATO OBSERVADO**
* **INFERÊNCIA**
* **HIPÓTESE**
* **HIPÓTESE SUPORTADA**
* **CAUSA DEMONSTRADA**
* **O QUE CONTINUA DESCONHECIDO**

The agent must never substitute a confident narrative for evidence.

---

## Documentation Governance

Before creating any new design, requirements or architecture document:

1. Locate existing related documents.
2. Identify the purpose of each.
3. Identify overlap.
4. Identify conflicts.
5. Preserve historical material when appropriate.
6. Avoid creating a competing source of truth.

Do not create a new "official" source without first reconciling existing documents.

### Canonical design source

There must be one canonical source for final product/design rules.

Current detailed documents under `docs/game-design/` remain valid as supporting, specialized or historical material according to their actual content and status.

They must not silently create a competing interpretation of the final game.

When an older document contains a decision later superseded by an approved decision:

* preserve the historical document when useful;
* identify the obsolete/superseded decision;
* do not treat the old decision as current design.

---

## Implementation Gate

No new significant gameplay implementation phase may begin without:

1. the relevant scope of Document 1 being explicitly approved;
2. the corresponding technical path being defined in Document 2;
3. dependencies and risks being known;
4. acceptance criteria being defined;
5. an appropriate Git checkpoint existing before the implementation phase begins.

Each implementation change must then be:

* localized;
* traceable to a documented requirement;
* technically justified;
* testable;
* verifiable;
* reviewable in Git.

---

## Preserve Design Intent

Implementation must never silently alter game semantics merely to simplify:

* performance;
* tests;
* code structure;
* batch execution;
* persistence;
* compatibility;
* memory use;
* computational cost.

If a technical limitation conflicts with a design requirement, the conflict must be explicitly identified and resolved architecturally.

Do not hide semantic differences behind approximations without documenting them.

A faster calculation is not automatically an equivalent simulation.

A passing test is not automatically proof of design correctness.

---

## Closure Rule

A stage may only be considered closed when there is evidence supporting the exact claim being made.

For an implementation stage, closure requires:

* implementation matching the defined scope;
* inspection of the actual changed files;
* appropriate tests and validation;
* review of the actual Git diff;
* confirmation that no unintended files changed;
* explicit record of remaining limitations;
* evidence sufficient to support the stated conclusion.

"Não encontramos o problema no teste" does not automatically mean "o problema não existe."

"Funcionou uma vez" does not automatically mean "está correto."

"Compilou" does not automatically mean "a regra de jogo foi implementada corretamente."

"Passou nos testes" does not automatically mean "o comportamento final está de acordo com o design."

---

# Checkpoint e Versionamento

* **Checkpoint obrigatório:** é obrigatório criar um commit no Git antes de iniciar qualquer nova fase de refatoração ou funcionalidade.
* Nunca transitar entre fases de arquitetura (C1, C2 etc.) ou correções de bugs P0 sem um commit formal de checkpoint que registre a integridade conhecida naquele ponto.
* Antes de executar uma nova fase, verificar `git status` e confirmar qual é o estado real do repositório.
* Nunca declarar o repositório limpo sem verificar o `git status`.

---

# Contrato ECS e Persistência

* **TypedArrays são o contrato runtime:** o `EcsState` é estritamente constituído de TypedArrays (`Float32Array`, `Int32Array`, etc.). Eles nunca devem ser convertidos para objetos rasos (POJO) durante a execução da simulação.
* **Proibido `structuredClone`/deep clone no runtime:** é expressamente proibido utilizar `structuredClone`, `JSON.parse(JSON.stringify())` ou funções de deep clone sobre o `EcsState` na memória ativa do jogo. Polyfills no Hermes podem destruir os métodos dos TypedArrays (como `.fill()`), quebrando a simulação.
* Em criação de novo jogo ou load, utilizar atribuições rasas (shallow) ou reidratação estrutural estrita conforme o contrato existente.
* **Persistência esparsa:** a persistência do ECS não deve clonar o array inteiro; utiliza `EcsSnapshot` para extrair os dados vivos em estruturas parciais persistíveis.
* **O(1) no hot path:** a simulação nunca deve executar I/O, `stringify`, `parse` ou cópias O(N) no frame/hot path da simulação.

---

# Known Architecture Notes

## Game Loop

* `GameSession.pumpSimulationQueue()`: max 5 ticks por frame (`MAX_TICKS_PER_FRAME`).
* Excess ticks routed to `runOfflineProgression` (batch). No recursive `setTimeout`.
* `justUnpaused` flag: first frame delta after unpause is discarded (spike prevention).

## Skia / EGL

* `MapScreen.tsx`: sync `useEffect` guarded by `isMounted` + `clearTimeout` cleanup.
* `runOnUI` calls must never fire after component unmount.

## Temporal Anchor

* On boot (`GameProvider.tsx`): `lastUpdatedAt` anchored to `clock.now()` before any tick.
* Prevents offline debt accumulation between save generation and app startup.

## Save System

* `SAVE_SCHEMA_VERSION = 4` (`src/infrastructure/persistence/save-schema.ts`).
* Schema version must match `meta.schemaVersion` in `createInitialState`.

---

# POLÍTICA PERMANENTE DE RIGOR EMPÍRICO E CONTROLE DE CERTEZA

**CORREÇÃO EPISTEMOLÓGICA > CONFIANÇA RETÓRICA > VELOCIDADE DE CONCLUSÃO**

1. **Regra Fundamental:** NUNCA transforme uma hipótese em fato apenas porque ela parece plausível. NUNCA transforme correlação em causalidade. NUNCA transforme a ausência de um problema em uma janela curta em prova de que o problema deixou de existir. NUNCA declare algo "100% resolvido" ou "garantido" sem evidência forte que sustente. Na dúvida, mantenha a incerteza explícita.
2. **Classificação de Certeza:** Classifique conclusões como FATO OBSERVADO, INFERÊNCIA, HIPÓTESE, HIPÓTESE SUPORTADA ou CAUSA DEMONSTRADA.
3. **Ônus da Prova:** Quanto mais forte a afirmação, maior o padrão de evidência exigido.
4. **Separar Evidência de Interpretação:** Apresente (1) Evidência observada, (2) Interpretação, (3) Conclusão com o nível de segurança adequado e (4) O que continua desconhecido.
5. **Princípio de Falsificação:** Procure ativamente evidências que possam refutar a hipótese atual, não apenas defendê-la.
6. **Correlação não é causalidade:** Identifique variáveis, controles e reprodução antes de declarar causa.
7. **A/B Test não é prova automática:** Exige variáveis claras, efeito mensurável e reprodução. Use termos como "evidência compatível com..." quando apropriado.
8. **Melhoria local vs. resolução:** Reduzir sintomas (ex.: "reduziu renderizações") não autoriza declarar o problema global como resolvido (ex.: "resolveu vazamento").
9. **Evidência negativa tem limite:** Não ver um erro em uma janela limitada não significa que ele foi extinto. Especifique as condições do teste.
10. **Encerramento operacional:** Em vez de forçar uma prova causal completa, prefira declarar "Encerrado operacionalmente" quando não houver evidência para continuar mantendo uma hipótese, registrando o que permanece desconhecido.
11. **Decisão operacional vs. prova científica:** "Não investigar agora" é diferente de "o problema foi resolvido".
12. **Contra otimismo automático:** Não use "100% blindado", "definitivamente corrigido" ou "perfeito" a menos que a evidência suporte literalmente.
13. **Contra "parece óbvio":** Uma explicação elegante e provável ainda é uma HIPÓTESE, não um FATO.
14. **Explicações alternativas:** Sempre considere explicações alternativas plausíveis para os dados observados.
15. **Não superinterpretar métricas:** Descreva as métricas pelo que medem (ex.: "Unknown cresceu", "render count caiu"), sem pular para conclusões generalizadas (ex.: "leak JS resolvido").
16. **Verificação do Git:** Não declare estado limpo sem verificar o `git status`. Não esconda falhas processuais do Git.
17. **Documentação rigorosa:** Nunca reconstrua logs, status ou históricos de memória sem extraí-los da fonte via comando no terminal. Não preencha lacunas com o que "provavelmente estava lá".
18. **Aceitar refutação:** Se os dados contradizem uma hipótese preferida, declare que ela foi refutada. Não crie remendos narrativos para preservá-la.
19. **Insuficiência de evidência:** "Não sabemos" é a conclusão correta quando os dados não permitem inferência.
20. **Formato preferencial em pareceres:** Use seções claras como "Evidências observadas", "O que foi demonstrado", "O que NÃO foi demonstrado", "Conclusão operacional" e "Incertezas remanescentes".
21. **Regra final:** Se houver conflito entre dar uma resposta elegante/fechada e uma resposta empiricamente incompleta, porém correta, escolha sempre ser incompleto e preciso.
22. **Honestidade de output:** Nunca rotular conteúdo como "Bruto"/"Raw" a menos que seja saída direta e literal de um comando executado na mesma resposta. Paráfrase de documento deve ser explicitamente rotulada como resumo.

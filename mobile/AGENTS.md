# EXPO HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

Before any change involving Expo, React Native, or platform-specific APIs, consult the
documentation for the exact project version (Expo SDK 56). Do not assume behavior from
previous or later versions of Expo.

---

# ENGINEERING RULES FOR AGENTIC WORKFLOW

## Project Context

- **Game engine:** Epochs Idle (React Native, Expo SDK ~56.0.13, RN 0.85.3)
- **Package manager:** npm (package-lock.json)
- **Build type:** Bare workflow (android/ directory exists)
- **Android package:** `com.epochs.idle`
- **Schema version:** `SAVE_SCHEMA_VERSION = 4` (src/infrastructure/persistence/save-schema.ts)
- **ECS size:** 320.000 entidades (TOTAL_HEXES = 320000 em create-initial-state.ts)

---

## Verification Commands

Run these after any relevant change:

```
npm run typecheck              # tsc --noEmit (verificação rápida de tipos)
npm run test                   # jest (executa testes unitários)
npm run verify                 # Pipeline completo: typecheck + lint + tests + expo-doctor
npm run android:verify         # Pipeline completo + ADB + logcat (APK existente)
npm run android:full-verify    # Pipeline completo + BUILD + instalar + logcat
```

**Never declare a task complete without running `npm run verify` and checking the Overall status.**

---

## Status Semânticos do Pipeline

O pipeline distingue claramente os seguintes estados. **Nunca confunda exit code 0 com "projeto validado".**

| Status | Significado | Exit Code |
|---|---|---|
| `PASS` | Executado, passou sem problemas | 0 |
| `PASS_WITH_WARNINGS` | Executado, passou, mas tem avisos não críticos | 0 |
| `PARTIAL` | Alguma etapa é NOT_CONFIGURED ou PASS_WITH_WARNINGS | 0 |
| `NOT_CONFIGURED` | Ferramenta não configurada (ex: sem ESLint, sem testes) | 0 |
| `NOT_EXECUTED` | Ferramenta configurada mas não pôde rodar (problema) | 1 |
| `FAIL` | Executado e falhou com erro real | 1 |

### Status Geral (Overall)

| Condição | Overall |
|---|---|
| Todas as etapas configuradas passaram | `PASS` |
| Alguma etapa é NOT_CONFIGURED ou PASS_WITH_WARNINGS | `PARTIAL` |
| Qualquer etapa com FAIL ou NOT_EXECUTED | `FAIL` |

### Interpretação correta para o agente:

- `Overall: PARTIAL` com `Tests: NOT_CONFIGURED` → **Testes não existem. Não é PASS.**
- `Overall: PARTIAL` com `Expo Doctor: PASS_WITH_WARNINGS` → **Há avisos documentados. Não é PASS.**
- `Overall: PASS` → Todas as ferramentas configuradas passaram.
- `Overall: FAIL` → Há erros reais. Investigar e corrigir antes de declarar conclusão.

---

## Problemas Expo Doctor (Dívida Técnica Documentada)

### 1. `react-native-worklets` — CORRIGIDO
- **Situação:** Era peer dep transitiva não declarada. Agora declarado explicitamente no package.json.
- **Status:** `react-native-worklets@0.8.3` em `dependencies`.

### 2. `babel-preset-expo` major mismatch — CORRIGIDO
- **Situação:** Versão 57.x instalada quando SDK 56 requer ~56.x. Corrigido.
- **Status:** `babel-preset-expo@~56.0.0` em `devDependencies`. Instalado: `56.0.19`.

### 3. Hermes V1 Memory Regression — DÍVIDA TÉCNICA ATIVA
- **Situação:** Expo SDK 56 com Hermes `250829098.0.15` afetado por memory leak.
- **Fix oficial:** Upgrade para SDK 57 + expo@57.0.9+ ou React Native 0.86.2+.
- **Impacto:** Possível degradação de memória em sessões longas.
- **Decisão:** Não corrigir agora (requer upgrade de SDK). Documentado.
- **Expo Doctor exibirá:** `PASS_WITH_WARNINGS` (19/22 checks ok, 1 warning de Hermes).

---

## android:verify vs android:full-verify

### `android:verify` (rápido, ~20s)
- Verifica ADB + dispositivo
- Verifica se o pacote está instalado
- **Alerta se APK local tem mais de 60 minutos** (pode não corresponder ao código atual)
- Inicia o app e coleta logcat
- **NÃO garante que o APK instalado é do código atual**
- Usar após `expo run:android` ou quando o APK já foi instalado recentemente

### `android:full-verify` (lento, ~5-15 min)
- Executa `gradle assembleDebug`
- Instala o APK fresco via `adb install`
- Executa todo o ciclo de verificação logcat
- **Garante que o APK corresponde ao código-fonte atual**
- Usar quando precisar de garantia formal de correspondência código↔APK

### Status do android:verify

| Status | Exit | Significado |
|---|---|---|
| `PASS [QUICK_VERIFY]` | 0 | App iniciou, logcat limpo |
| `PASS_WITH_WARNINGS [QUICK_VERIFY]` | 0 | App iniciou, warnings não críticos |
| `APP_CRASH` | 1 | FATAL EXCEPTION / SIGSEGV detectado |
| `APP_ANR` | 1 | ANR / Input dispatching timed out |
| `LOGCAT_ERRORS` | 1 | Erros sem crash |
| `ANDROID_DEVICE_NOT_AVAILABLE` | 2 | Sem dispositivo usável |
| `TEST_NOT_EXECUTED` | 3 | ADB não encontrado |
| `BUILD_FAILED` | 4 | gradle falhou (apenas --full-build) |

---

## Testes

### Infraestrutura atual
- Framework: `jest-expo@56` (compatível com Expo SDK 56)
- Config: `jest.config.js` (preset: jest-expo, timeout: 10s)
- Arquivos de teste: `src/__tests__/`

### Testes existentes
| Arquivo | Foco |
|---|---|
| `src/__tests__/stable-hash.test.ts` | stableStringify, hashDeterministic — invariantes do sistema de fingerprint |
| `src/__tests__/create-initial-state.test.ts` | createInitialState — invariantes estruturais do boot |

### Princípios para novos testes
- Testar apenas código **determinístico** e **livre de dependências nativas**
- Não criar testes artificiais para aumentar cobertura
- Não alterar lógica de jogo para facilitar testes
- Prioridade: funções puras → invariantes de estado → serialização → sistemas ECS

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

O logcat é analisado com filtros rigorosos:

**CRASH** (exit 1): `FATAL EXCEPTION`, `SIGSEGV`, `SIGABRT`, `Process: ..PID:`
**ANR** (exit 1): `ANR in`, `Input dispatching timed out`
**ERRORS** (exit 1): `NullPointerException`, `IllegalStateException`, `ReactNativeJS.*Error`, etc.
**WARNINGS** (PASS_WITH_WARNINGS): linhas `W/` não ignoradas
**IGNORADOS** (falsos positivos documentados):
- `EGLConsumer.*not attached` — tratado em MapScreen.tsx (isMounted guard)
- `Choreographer.*dropped N frame` — normal em emuladores
- `libEGL.*DEBUG` — ruído de driver gráfico
- Linhas D/, I/, V/ — debug/info/verbose

Log completo salvo em `.verify-logs/` — nunca enviado integralmente ao contexto do modelo.

---

## Planning

Before significant changes:

1. Understand the architecture and the component being modified.
2. Identify all affected files and their dependencies.
3. Identify invariants that must not be broken.
4. Identify risks and edge cases.
5. Define how the change will be validated (which verify commands, which scenarios).

Do not start complex changes by trial and error.

---

## Implementation Constraints

- Prefer minimal, localized changes.
- Do not rewrite entire files without necessity.
- Do not modify code unrelated to the task.
- Do not introduce dependencies without necessity.
- Do not duplicate existing logic.
- Do not use `any` to hide type errors — fix the actual type.
- Do not disable TypeScript strictness to make code compile.
- Do not remove validations or error handling.
- Do not use empty `catch` blocks.
- Do not modify tests to make an implementation pass.
- Do not remove existing tests to eliminate failures.

---

## Root Cause Analysis Protocol

When a verify step, test, or run fails:

**DO NOT make random changes.**

1. Reproduce the failure
2. Collect evidence (logcat, stack trace, error output — compact, not full dumps)
3. Read the error message
4. Read the stack trace
5. Determine the probable root cause
6. Confirm the hypothesis
7. Implement the targeted fix
8. Run verify again

**Prioritize fixing root causes, not working around symptoms.**

---

## Token and Context Efficiency

- Do NOT send full build logs or full logcat dumps to model context
- DO use: summaries, counts, last N lines, error messages, diffs, PASS/FAIL results
- Full logs are saved to `.verify-logs/` for investigation — read selectively if needed
- Use `Select-Object -Last N` or `Select-String` for targeted log extraction

---

## Finalization Checklist

Before declaring a task complete:

- [ ] `npm run verify` → `Overall: PASS` or documented `PARTIAL`
- [ ] `npm run android:verify` → `PASS` (when Android is involved)
- [ ] `git diff --stat` reviewed — no unintended changes
- [ ] No temp files or debug logs accidentally added
- [ ] No changes unrelated to the task

Report:
- What was changed
- Which verifications were run
- Results (including PARTIAL/NOT_CONFIGURED details)
- Remaining limitations

---

## Game Logic Boundary

Infrastructure tasks must NOT:
- Refactor game logic
- Change game mechanics
- Alter UI behavior
- Change balance values
- Fix bugs unrelated to the task

---

## Known Architecture Notes

### Game Loop
- `GameSession.pumpSimulationQueue()`: max 5 ticks per frame (`MAX_TICKS_PER_FRAME`).
- Excess ticks routed to `runOfflineProgression` (batch). No recursive `setTimeout`.
- `justUnpaused` flag: first frame delta after unpause is discarded (spike prevention).

### Skia / EGL
- `MapScreen.tsx`: sync useEffect guarded by `isMounted` + `clearTimeout` cleanup.
- `runOnUI` calls must never fire after component unmount.

### Temporal Anchor
- On boot (`GameProvider.tsx`): `lastUpdatedAt` anchored to `clock.now()` before any tick.
- Prevents offline debt accumulation between save generation and app startup.

### Save System
- `SAVE_SCHEMA_VERSION = 4` (src/infrastructure/persistence/save-schema.ts)
- Schema version must match `meta.schemaVersion` in createInitialState.

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
npm run typecheck              # tsc --noEmit (verificaÃ§Ã£o rÃ¡pida de tipos)
npm run test                   # jest (executa testes unitÃ¡rios)
npm run verify                 # Pipeline completo: typecheck + lint + tests + expo-doctor
npm run android:verify         # Pipeline completo + ADB + logcat (APK existente)
npm run android:full-verify    # Pipeline completo + BUILD + instalar + logcat
```

**Never declare a task complete without running `npm run verify` and checking the Overall status.**

---

## Status SemÃ¢nticos do Pipeline

O pipeline distingue claramente os seguintes estados. **Nunca confunda exit code 0 com "projeto validado".**

| Status | Significado | Exit Code |
|---|---|---|
| `PASS` | Executado, passou sem problemas | 0 |
| `PASS_WITH_WARNINGS` | Executado, passou, mas tem avisos nÃ£o crÃ­ticos | 0 |
| `PARTIAL` | Alguma etapa Ã© NOT_CONFIGURED ou PASS_WITH_WARNINGS | 0 |
| `NOT_CONFIGURED` | Ferramenta nÃ£o configurada (ex: sem ESLint, sem testes) | 0 |
| `NOT_EXECUTED` | Ferramenta configurada mas nÃ£o pÃ´de rodar (problema) | 1 |
| `FAIL` | Executado e falhou com erro real | 1 |

### Status Geral (Overall)

| CondiÃ§Ã£o | Overall |
|---|---|
| Todas as etapas configuradas passaram | `PASS` |
| Alguma etapa Ã© NOT_CONFIGURED ou PASS_WITH_WARNINGS | `PARTIAL` |
| Qualquer etapa com FAIL ou NOT_EXECUTED | `FAIL` |

### InterpretaÃ§Ã£o correta para o agente:

- `Overall: PARTIAL` com `Tests: NOT_CONFIGURED` â†’ **Testes nÃ£o existem. NÃ£o Ã© PASS.**
- `Overall: PARTIAL` com `Expo Doctor: PASS_WITH_WARNINGS` â†’ **HÃ¡ avisos documentados. NÃ£o Ã© PASS.**
- `Overall: PASS` â†’ Todas as ferramentas configuradas passaram.
- `Overall: FAIL` â†’ HÃ¡ erros reais. Investigar e corrigir antes de declarar conclusÃ£o.

---

## Problemas Expo Doctor (DÃ­vida TÃ©cnica Documentada)

### 1. `react-native-worklets` â€” CORRIGIDO
- **SituaÃ§Ã£o:** Era peer dep transitiva nÃ£o declarada. Agora declarado explicitamente no package.json.
- **Status:** `react-native-worklets@0.8.3` em `dependencies`.

### 2. `babel-preset-expo` major mismatch â€” CORRIGIDO
- **SituaÃ§Ã£o:** VersÃ£o 57.x instalada quando SDK 56 requer ~56.x. Corrigido.
- **Status:** `babel-preset-expo@~56.0.0` em `devDependencies`. Instalado: `56.0.19`.

### 3. Hermes V1 Memory Regression â€” DÃVIDA TÃ‰CNICA ATIVA
- **SituaÃ§Ã£o:** Expo SDK 56 com Hermes `250829098.0.15` afetado por memory leak.
- **Fix oficial:** Upgrade para SDK 57 + expo@57.0.9+ ou React Native 0.86.2+.
- **Impacto:** PossÃ­vel degradaÃ§Ã£o de memÃ³ria em sessÃµes longas.
- **DecisÃ£o:** NÃ£o corrigir agora (requer upgrade de SDK). Documentado.
- **Expo Doctor exibirÃ¡:** `PASS_WITH_WARNINGS` (19/22 checks ok, 1 warning de Hermes).

---

## android:verify vs android:full-verify

### `android:verify` (rÃ¡pido, ~20s)
- Verifica ADB + dispositivo
- Verifica se o pacote estÃ¡ instalado
- **Alerta se APK local tem mais de 60 minutos** (pode nÃ£o corresponder ao cÃ³digo atual)
- Inicia o app e coleta logcat
- **NÃƒO garante que o APK instalado Ã© do cÃ³digo atual**
- Usar apÃ³s `expo run:android` ou quando o APK jÃ¡ foi instalado recentemente

### `android:full-verify` (lento, ~5-15 min)
- Executa `gradle assembleDebug`
- Instala o APK fresco via `adb install`
- Executa todo o ciclo de verificaÃ§Ã£o logcat
- **Garante que o APK corresponde ao cÃ³digo-fonte atual**
- Usar quando precisar de garantia formal de correspondÃªncia cÃ³digoâ†”APK

### Status do android:verify

| Status | Exit | Significado |
|---|---|---|
| `PASS [QUICK_VERIFY]` | 0 | App iniciou, logcat limpo |
| `PASS_WITH_WARNINGS [QUICK_VERIFY]` | 0 | App iniciou, warnings nÃ£o crÃ­ticos |
| `APP_CRASH` | 1 | FATAL EXCEPTION / SIGSEGV detectado |
| `APP_ANR` | 1 | ANR / Input dispatching timed out |
| `LOGCAT_ERRORS` | 1 | Erros sem crash |
| `ANDROID_DEVICE_NOT_AVAILABLE` | 2 | Sem dispositivo usÃ¡vel |
| `TEST_NOT_EXECUTED` | 3 | ADB nÃ£o encontrado |
| `BUILD_FAILED` | 4 | gradle falhou (apenas --full-build) |

---

## Testes

### Infraestrutura atual
- Framework: `jest-expo@56` (compatÃ­vel com Expo SDK 56)
- Config: `jest.config.js` (preset: jest-expo, timeout: 10s)
- Arquivos de teste: `src/__tests__/`

### Testes existentes
| Arquivo | Foco |
|---|---|
| `src/__tests__/stable-hash.test.ts` | stableStringify, hashDeterministic â€” invariantes do sistema de fingerprint |
| `src/__tests__/create-initial-state.test.ts` | createInitialState â€” invariantes estruturais do boot |

### PrincÃ­pios para novos testes
- Testar apenas cÃ³digo **determinÃ­stico** e **livre de dependÃªncias nativas**
- NÃ£o criar testes artificiais para aumentar cobertura
- NÃ£o alterar lÃ³gica de jogo para facilitar testes
- Prioridade: funÃ§Ãµes puras â†’ invariantes de estado â†’ serializaÃ§Ã£o â†’ sistemas ECS

---

## ADB â€” Descoberta DinÃ¢mica

`scripts/find-adb.js` descobre o ADB sem hardcode. Ordem de busca:
1. `adb` no PATH (via `where`/`which`)
2. `$ANDROID_HOME/platform-tools/adb[.exe]`
3. `$ANDROID_SDK_ROOT/platform-tools/adb[.exe]`
4. `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` (Windows)
5. `~/Android/Sdk/platform-tools/adb` (Linux)
6. `~/Library/Android/sdk/platform-tools/adb` (macOS)

**Nunca introduzir caminho absoluto de ADB em nenhum script.**

---

## AnÃ¡lise de Logcat

O logcat Ã© analisado com filtros rigorosos:

**CRASH** (exit 1): `FATAL EXCEPTION`, `SIGSEGV`, `SIGABRT`, `Process: ..PID:`
**ANR** (exit 1): `ANR in`, `Input dispatching timed out`
**ERRORS** (exit 1): `NullPointerException`, `IllegalStateException`, `ReactNativeJS.*Error`, etc.
**WARNINGS** (PASS_WITH_WARNINGS): linhas `W/` nÃ£o ignoradas
**IGNORADOS** (falsos positivos documentados):
- `EGLConsumer.*not attached` â€” tratado em MapScreen.tsx (isMounted guard)
- `Choreographer.*dropped N frame` â€” normal em emuladores
- `libEGL.*DEBUG` â€” ruÃ­do de driver grÃ¡fico
- Linhas D/, I/, V/ â€” debug/info/verbose

Log completo salvo em `.verify-logs/` â€” nunca enviado integralmente ao contexto do modelo.

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
- Do not use `any` to hide type errors â€” fix the actual type.
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
2. Collect evidence (logcat, stack trace, error output â€” compact, not full dumps)
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
- Full logs are saved to `.verify-logs/` for investigation â€” read selectively if needed
- Use `Select-Object -Last N` or `Select-String` for targeted log extraction

---

## Finalization Checklist

Before declaring a task complete:

- [ ] `npm run verify` â†’ `Overall: PASS` or documented `PARTIAL`
- [ ] `npm run android:verify` â†’ `PASS` (when Android is involved)
- [ ] `git diff --stat` reviewed â€” no unintended changes
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

## Checkpoint e Versionamento
- **Checkpoint Obrigatório**: É obrigatório criar um commit no Git antes de iniciar qualquer nova fase de refatoração ou funcionalidade. NUNCA transite entre fases de arquitetura (C1, C2, etc) ou consertos de bugs P0 sem um commit formal ("checkpoint") provando a integridade dos testes e typecheck.

## Contrato ECS e Persistência
- **TypedArrays são o Contrato Runtime**: O \EcsState\ é estritamente constituído de TypedArrays (\Float32Array\, \Int32Array\, etc). Eles nunca podem ser convertidos para objetos rasos (POJO).
- **Proibido structuredClone/Deep Clone no Runtime**: É expressamente proibido utilizar \structuredClone\, \JSON.parse(JSON.stringify())\ ou funções de deep clone sob o \EcsState\ na memória ativa do jogo. Polyfills no Hermes destroem os métodos dos TypedArrays (como \.fill()\), quebrando a simulação. Em atribuições de novo jogo ou load, faça atribuições rasas (shallow) ou reidratação estrutural estrita.
- **Persistência Esparsa**: A persistência do ECS não clona o array, ela utiliza o formato esparso \EcsSnapshot\, extraindo os dados vivos diretamente para objetos parciais persistíveis no disco.
- **O(1) no Hot Path**: A simulação nunca deve executar I/O (stringify, parse) ou cópias O(N) no frame/hot path da simulação.

## POLÍTICA PERMANENTE DE RIGOR EMPÍRICO E CONTROLE DE CERTEZA

**CORREÇÃO EPISTEMOLÓGICA > CONFIANÇA RETÓRICA > VELOCIDADE DE CONCLUSÃO**

1.  **Regra Fundamental:** NUNCA transforme uma hipótese em fato apenas porque ela parece plausível. NUNCA transforme correlação em causalidade. NUNCA transforme a ausência de um problema em uma janela curta em prova de que o problema deixou de existir. NUNCA declare algo "100% resolvido" ou "garantido" sem evidência forte que sustente. Na dúvida, mantenha a incerteza explícita.
2.  **Classificação de Certeza:** Classifique conclusões como FATO OBSERVADO, INFERÊNCIA, HIPÓTESE, HIPÓTESE SUPORTADA ou CAUSA DEMONSTRADA.
3.  **Ônus da Prova:** Quanto mais forte a afirmação, maior o padrão de evidência exigido.
4.  **Separar Evidência de Interpretação:** Apresente (1) Evidência (observada), (2) Interpretação (o que sugere), (3) Conclusão (afirmada com segurança) e (4) O Que Continua Desconhecido.
5.  **Princípio de Falsificação:** Procure ativamente evidências que possam refutar a hipótese atual, não apenas defendê-la.
6.  **Correlação não é Causalidade:** Identifique variáveis, controles e reprodução antes de declarar causa.
7.  **A/B Test Não É Prova Automática:** Exige variáveis claras, efeito mensurável e reprodução. Use termos como "evidência compatível com..." em vez de "prova que...".
8.  **Melhoria Local vs. Resolução:** Reduzir sintomas (ex: "reduziu renderizações") não autoriza declarar o problema global como resolvido (ex: "resolveu vazamento").
9.  **Evidência Negativa Tem Limite:** Não ver um erro em uma janela limitada não significa que ele foi extinto. Especifique as condições do teste.
10. **Encerramento Operacional:** Em vez de forçar uma prova causal completa, prefira declarar "Encerrado operacionalmente" quando não houver evidência para continuar mantendo uma hipótese, registrando o que permanece desconhecido.
11. **Decisão Operacional vs. Prova Científica:** "Não investigar agora" é diferente de "o problema foi resolvido".
12. **Contra Otimismo Automático:** Não use "100% blindado", "definitivamente corrigido" ou "perfeito" a menos que a evidência suporte literalmente.
13. **Contra "Parece Óbvio":** Uma explicação elegante e provável ainda é uma HIPÓTESE, não um FATO.
14. **Explicações Alternativas:** Sempre considere explicações alternativas plausíveis para dados observados.
15. **Não Superinterpretar Métricas:** Descreva as métricas pelo que medem (ex: "Unknown cresceu", "render count caiu"), sem pular para conclusões generalizadas ("leak JS resolvido").
16. **Verificação do Git:** Não declare estado limpo sem de fato verificar o git status. Não esconda falhas processuais do Git.
17. **Documentação Rigorosa:** Nunca reconstrua logs, status ou históricos de memória sem extraí-los da fonte via comando no terminal. Não preencha lacunas com o que "provavelmente estava lá".
18. **Aceitar Refutação:** Se os dados contradizem uma hipótese preferida, declare que ela foi refutada. Não crie remendos narrativos para preservá-la.
19. **Insuficiência de Evidência:** "Não sabemos" é a conclusão correta quando os dados não permitem inferência.
20. **Formatos Preferenciais em Pareceres:** Use seções claras ("Evidências observadas", "O que foi demonstrado", "O que NÃO foi demonstrado", "Conclusão operacional", "Incertezas remanescentes").
21. **Regra Final:** Se houver conflito entre dar uma resposta elegante/fechada e uma resposta empiricamente incompleta (mas correta), escolha sempre ser incompleto e preciso.

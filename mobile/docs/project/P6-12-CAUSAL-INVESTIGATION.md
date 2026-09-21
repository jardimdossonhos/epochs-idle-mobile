# P6.12 — INVESTIGAÇÃO CAUSAL ESTRUTURADA (OOM NATIVE HEAP)

Este documento centraliza a modelagem causal do vazamento massivo de memória (~2.74 MB/s a 1x) descartando otimizações JavaScript prematuras e rastreando a propagação até o colapso nativo.

---

## 1. FATOS COMPROVADOS
* O OOM é classificado como `LOW_MEMORY` no Native Heap (não JS limit).
* A Engine JavaScript no seu *hot path* mais intenso (TickPipeline, Sistemas, ECS) gera **KBs** (em média 15~20 KB/tick), o que é infinitamente menor (~1.370x) que a proporção alocada no Android.
* A simulação é a âncora temporal: se ela pausa, o vazamento estaciona.
* O componente que vincula a simulação à interface no projeto é o `GameProvider.tsx`, repassando o estado via `setGameState` a cada frame sincronizado de 250ms se houver alteração do tick em background.

## 2. FATOS NÃO COMPROVADOS
* A culpabilidade primária estrutural do C++ ainda não pôde ser firmada (Reanimated vs Skia vs JSI bindings).
* Se a *Hermes V1 Memory Regression* (conhecida no SDK 56 do projeto) atua exclusivamente retendo JSI HostObjects criados por bridges UI durante re-renderização massiva.

## 3. TIMELINE DOS INCIDENTES
* **2026-08-24:** Relatório inicial indicando mortes sistêmicas.
* **2026-08-25:** Execução das rodadas P6.7 e P6.8. A engine JS foi refatorada e o autosave mitigado. A anomalia no consumo bruto persistiu, confirmando OOM/Thrashing.
* **2026-08-26:** Etapa P6.10 e P6.11 isolaram a lógica da Engine (puro JS). Confirmou-se matematicamente (Cálculo de alocação/Tick) que o JS Puro NÃO GERA os 27 MB por frame e introduziu-se a flag experimental (`RENDER_EXPERIMENT_DISABLE_STATE_PROPAGATION`).
* **2026-08-27 (11:22:04 UTC):** Processo abortado via crash nativo (PID 5563, reason=5 APP CRASH).

## 4. STACKTRACE NATIVO & 5. SYMBOLIZATION STATUS
* **Status:** Não foi possível anexar o backtrace do `PID 5563`.
* **Motivo Exato:** O emulador/dispositivo não se encontra conectado à interface do ADB (`adb devices` retornou vazio), logo, o diretório raiz Android `/data/tombstones/` ou os relatórios `adb shell dumpsys activity exit-info` estão fisicamente inacessíveis. Não há registro indexado gerado nos paths locais do projeto (ex. `.verify-logs/` ou root directory) contendo um arquivo explícito de dump text nomeado *tombstone* de hoje.
* **Symbolization:** Verificações atestam a presença de arquivos pre-built Stripped (~22 MB) e Unstripped (~212 MB) do `libreactnative.so` no diretório de compilação da build arm64-v8a/x86; entretanto, o `libhermesvm.so` encontra-se com tamanho estático idêntico (~3.7 MB), indicando distribuição padrão "Stripped" encapsulada da META-INF original, demandando o toolchain externo de LLVM `addr2line` para decodificar frames no Android NDK nativo (se o tombstone existisse).

## 6. BUILD MATRIX
No universo do projeto, os modos disponíveis inferidos por dependências (`react-native-skia`, `expo-dev-launcher`, `expo SDK 56`, e `run:android` scripts):
* **Debug + Metro (Usado nos Crashes e no P6.11):** Hermes ativado globalmente via `app.json` / Gradle property. O código JS é servido live via Metro (o que possibilita interceptações de Fast Refresh e Strict Mode double-render). Alocações JSI disparam validações extensivas da UI Thread nativa (o que acentua crashes não-críticos para fatais).
* **Debug Local (Sem Metro):** JS Bundle é empacotado `offline`.
* **Release Mode:** Total stripping do JSC/Hermes assertions. Desarma o React Profiler (eliminando alocações sintéticas por baixo dos panos na árvore).

## 7. MEMORY MODEL (Caminhos para o Heap Nativo)
1. **[Reanimated]:** Ao receber os novos arrays de estado via re-render, caso possua `useSharedValue` ou animações derivadas na tela mapeada, gera fluxos Worklet-HostObjects (C++ bind).
2. **[React Native Skia]:** A API `<Canvas>`, reativada a cada tick via novo Contexto, remonta estruturas complexas imperativas C++ (`Path`, `Rect`, `Image`), traduzindo objetos curtos de JS para HostObjects JSI que são cacheados e enviados ao render pipeline. A falha no Garbage Collector da Hermes sobre JSI pode ocasionar retenção dos handles Skia (o culpado primário mais clássico nesse design gráfico de ECS).
3. **[React Runtime JSI]:** Reconciliação brutal de uma árvore grande (Ex: renderização iterativa dos `regions` 320.000 se expostos inadequadamente) gera lixo temporário na bridge do React Native UIManager / Fabric.
4. **[GameProvider Poll]:** O timer JS de poll em 4FPS aciona a cascata para tudo isso apenas se o simulador não estiver pausado e o estado progrediu (`state.meta.tick`).

## 8. HIPÓTESES CAUSAIS LIMITADAS

### HIPÓTESE A: HostObject Retention in Skia (MapScreen)
* **A Favor:** A Skia no React Native cria espelhos nativos via JSI para *Canvas* objects. Renderizar repetidamente gera objetos curtos C++. A Hermes Memory Regression documentada na v56 pode estar errando a coleta de HostObjects pesados (View permanece livre, mas os handles ficam na memória morta).
* **Contra:** As Views foram relatadas como relativamente estáveis; crashes típicos da Skia deixam rastros pesados e diretos no logcat com `EGL_BAD_ALLOC` (que, por ora, foi ignorado como ruído no modelo).
* **O que não sabemos:** Se as atualizações parciais ou redesenhos de Hex no Canvas estão forçando alocações completas por tick.
* **Falsificação mais barata:** Desmontar exclusivamente a `<MapScreen>` da UI enquanto a simulação roda.

### HIPÓTESE B: React Context / JSI Propagation Flood
* **A Favor:** Disparar `setGameState({ ...clone })` (que copia a árvore) 4 vezes ao segundo num estado de jogo que cresce iterativamente inunda a React Bridge ou o Fabric Scheduler com referências recém-clonadas e destrói as memoizations globais, gerando estrangulamento de Native Nodes.
* **Contra:** Vazamentos puros na bridge do React tradicional costumam culminar na UI thread travada (ANR), mas as evidências pontuam `APP CRASH (NATIVE) / LOW_MEMORY` em background, o que se assemelha mais ao enchimento silencioso de um descritor C++ (HostObject) abandonado.
* **O que não sabemos:** Qual galho (Componente) exato da árvore da GUI é sensível o bastante para puxar MBs ao remontar.
* **Falsificação mais barata:** Validar no dispositivo as métricas nativas do "P6.11: Render Experiment" atualmente inativo, para comprovar que a propagação central da engine em si detém as rédeas do OOM.

### HIPÓTESE C: MMKV Polling Duplication (Autosave Thrashing)
* **A Favor:** O Autosave Serializer pode engolir o TypedArray do ECS e submetê-lo a um snapshot massivo síncrono.
* **Contra:** O Autosave no `GameSession` está configurado para 60 segundos (intervalo restrito), não corresponde a subidas contínuas fluidas (MB/seg).

## 9. EXPERIMENTO ESCOLHIDO PARA A PRÓXIMA FASE
**Validar fisicamente o Experimento P6.11, e posteriormente (se estancar o leak), conduzir O Experimento do MapScreen Isolation.**

**Critério:**
Maior poder discriminatório: Dividir o projeto ao meio. Se o P6.11 isolado eliminar os 27 MB/s, ficamos limitados a puramente investigar os render-paths gráficos e React (liberando a engine JS de responsabilidade). Se continuarem as falhas no MapScreen Isolation, investigaremos Reanimated ou Hermes JSI.

## 10. CRITÉRIOS OBJETIVOS DE PASS/FAIL
* **(Execução via Usuário ou Dispositivo Real)**
* **PASS (Estancamento Válido no P6.11):** O simulador JS acelera a 30x, a UI paralisa na UI bridge, o Native Heap estaciona sem ultrapassar +200KB base de margem. Crash Nativo de `reason=5` desaparece. Conclui-se que o React Rendering Engine / Skia é o causador.
* **FAIL (OOM Persiste no P6.11):** A engine silenciosa, mesmo bloqueada da renderização, ainda explode o Heap Nativo (ex: lixo de HostObjects da Hermes corrompendo referências na Engine/ECS C++ backend se houvesse JSI Native ECS acoplado). A engine teria um calcanhar nativo escondido.

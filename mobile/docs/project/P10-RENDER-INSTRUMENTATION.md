# P10 — INSTRUMENTAÇÃO CAUSAL DE RENDERIZAÇÃO E FRONTEIRA NATIVA

## 1. OBJETIVO
Medir quantitativamente o ciclo de vida e a frequência de renderização interligada à propagação do `GameState` no React Native Navigation, isolando as métricas por tela.
O objetivo é provar empiricamente (sem inferências) que componentes nativos (como textos, vistas, shaders e ponte JSI) estão sendo estressados excessivamente.

## 2. COMPONENTES REAIS ENCONTRADOS
A auditoria revelou a existência simultânea na árvore de renderização (React Navigation Tabs sem `unmountOnBlur` ativo) dos seguintes componentes ligados ao `GameProvider`:
1. `MapScreen` e sua dependência física `SimulationCanvas`.
2. `DiplomacyScreen` (Montada e assinando estado).
3. `EstadoScreen` (Montada e assinando estado).
4. `TechScreen` (Montada e assinando estado).
5. `SistemaScreen` (Montada e assinando estado).
6. `TopHUD` (Renderizado no nível da InGameShell).

## 3. PONTOS INSTRUMENTADOS
Os seguintes arquivos foram instrumentados estritamente na fronteira JSX e Context:
- `src/ui/GameProvider.tsx` (`syncInterval` trigger vs `setGameState` bypass)
- `src/ui/screens/MapScreen.tsx` (Renders + disparos `runOnUI`)
- `src/ui/screens/DiplomacyScreen.tsx` (Renders)
- `src/ui/screens/EstadoScreen.tsx` (Renders)
- `src/ui/screens/TechScreen.tsx` (Renders)
- `src/ui/screens/SistemaScreen.tsx` (Renders)
- `src/ui/components/TopHUD.tsx` (Renders)
- `src/ui/components/map/simulation-canvas.tsx` (Renders Canvas + Overlays Otimizados)

*Obs: O bloqueio mitigativo anterior do P8 (`P8_EXPERIMENT_DISABLE_MAP_REANIMATED_DIFF`) foi restaurado para `false` a fim de coletar o comportamento completo.*

## 4. CONTADORES UTILIZADOS
Arquivo `src/ui/p10-instrumentation.ts` criado usando pooling local, resetado e logado a cada 10 segundos:
- `elapsedMs`
- `providerSyncChecks` (Polling de 4 FPS)
- `providerUpdates` (Chamadas efetivas a `setGameState`)
- Renders: `mapRenders`, `diplomacy`, `tech`, `gov`, `canvas`, `HUD`, etc.
- `runOnUI` (Chamadas específicas do C++ JSI no MapScreen).

## 5. IMPACTO ESPERADO DA INSTRUMENTAÇÃO
Zero mutação no game loop. A performance pode sofrer micro-variações (< 1ms) locais pelas operações de incremento inteiro (`P10Counters.X++`), o que não altera o fluxo nativo ou as raízes do Native Heap. Os dados serão limitados ao `console.log` assíncrono.

## 6. PROCEDIMENTO DE TESTE OBRIGATÓRIO (A EXECUTAR)
1. Instalar APK com estas mudanças (`npm run android:verify` se necessário).
2. Carregar um _save_ e manter o app na tela inicial/Map.
3. Velocidade `30x`.
4. Duração: 60 segundos exatos.
5. Coletar `dumpsys meminfo <PID>` imediatamente no final, além da linha gerada: `[P10_RENDER_METRICS] ...`.

## 7. MÉTRICAS E CRITÉRIOS (Mapeamento Causar)
Após a coleta, usar as métricas registradas para validar:
* **Se `providerUpdates` estiver disparando repetidamente as abas em background:** As chamadas de renderizações inócuas das telas "cegas" se confirmam como desperdício, provando necessidade de `unmountOnBlur` (Navigation Fix).
* **Se `runOnUI` disparar em magnitude altíssima enquanto telas de fundo não renderizarem:** O canvas/Reanimated assume a carga total do vazamento (Skia/Fabric Fix).
* **Se `runOnUI` for baixo e RssAnon for alto:** O problema estará focado na UI React Native Fabric e não no JSI.

## 8. PRÓXIMO EXPERIMENTO CONDICIONADO
**Modelo B Validado:** (Renders massivos invisíveis nas abas) -> Próxima etapa será adicionar `unmountOnBlur: true` ao `MainTabs` no App Navigator para abater os componentes ocultos.
**Modelo C Validado:** (Ponte JSI vazando isoladamente) -> Estruturar pooling JSI/C++.

## P10.1 — Methodological Corrections
- **RENDER PROPAGATION IS ON:** RENDER_EXPERIMENT_DISABLE_STATE_PROPAGATION = false foi verificado no arquivo GameProvider.tsx, restabelecendo o fluxo normal de UI do jogo (Baseline) onde o memory leak é manifestado violentamente.
- **P8 IS OFF:** P8_EXPERIMENT_DISABLE_MAP_REANIMATED_DIFF = false foi atestado em todos os pontos da MapScreen.tsx, garantindo que os worklets e arrays do unOnUI estão rodando na frequência original para serem testados nesta janela.
- **TICKS REAIS MENSURADOS:** A contagem de 	icksProcessed ocorre de forma exata e inequívoca dentro de TickPipeline.runInPlace(), contabilizando progressões matemáticas puras no ECS (ignorando frame timers ociosos, pollings cegos, pausas e chamadas rejeitadas do pumpSimulationQueue).
- **CONTADORES INÓCUOS REMOVIDOS:** derivedValueCreates foi limpo para assegurar que cada estatística possua correspondência empírica 1:1 rigorosamente rastreável.
- **JANELA DE INTERVALO (10S):** Todo logger exporta as estatísticas unificadas via [P10] sem serializar arrays JS nem JSON.stringify profundos do State que invalidariam as taxas nativas medidas, e reseta na respectiva janela (intervalos exatos com elapsedMs).
- **INTERPRETAÇÃO:** Corrigindo asserções precipitadas de P9, o teste P10 não declara a causa raiz. Se Renders > RunOnUI, escolhe-se o Modelo B; se inverso, Modelo C. Evitar viés pré-fabricado antes do fim deste experimento restrito de 600 segundos (30x, nenhum toque em tela, cold boot do Pixel_8).

## P10.2 — Architectural Instrumentation Correction
1. **Erro Arquitetural Corrigido:** A dependência indevida da Engine (src/core/simulation/tick-pipeline.ts) apontando para um módulo de React/UI (src/ui/p10-instrumentation.ts) foi removida, extinguindo os efeitos colaterais de inicialização indesejada (como o setInterval global no Worker Node ou backend lógico).
2. **Módulo Neutro Criado:** A contagem central foi segregada em src/core/instrumentation/p10-counters.ts, contendo apenas primitivos let expostos e totalmente agnósticos a ambiente. O core não importa mais nada da interface.
3. **Logger Preservado na UI:** O setInterval de agregação (10.000ms) reside estritamente em src/ui/p10-instrumentation.ts. Ele lê a varíavel exportada pelo módulo neutro e faz o flush, garantindo que core -> UI nunca aconteça, mas sim UI -> core.
4. **Semântica de Ticks Reais:** O contador agora absorve efetivamente 	ickScale ao invés de meras invocações do unInPlace(). Isto significa que o processamento em *catch-up* (multi-ticks num só loop) será perfeitamente computado como ctual logical ticks processed, assegurando a exatidão da métrica Ticks/s.
5. **Correções Finais:** Renders de TopHUD agora estão posicionados perfeitamente no *body* do componente. unOnUI aciona exatamente ao cruzar a ponte JSI. O Baseline original das reatividades (P6.11 OFF, P8 OFF) foi assegurado.

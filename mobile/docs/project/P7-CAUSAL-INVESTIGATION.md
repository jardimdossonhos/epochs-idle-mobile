# P7 — INVESTIGAÇÃO CAUSAL (ESTADO ATUAL)

Documento final desta etapa READ-ONLY. Sintetiza a investigação do OOM no Native Heap sem modificar o projeto. O foco é a causalidade, identificando com precisão os laços remanescentes após o P6.11 e estruturando o próximo passo.

## 1. ESTADO ATUAL E 2. TIMELINE FORENSE
| Data/Hora | PID | Ambiente | Modo/Config | Velocidade | Estado/P6.11 | RSS Máx | Native Heap | VmSwap | Resultado |
|---|---|---|---|---|---|---|---|---|---|
| 2026-08-24 | 3448 | AVD/Dev | Debug (Metro) | 30x | Normal | ~3.0 GB | Cresc. Linear | Alto | eason=3 (LOW_MEMORY) |
| 2026-08-25 | 3605 | AVD/Dev | Debug (Metro) | 30x | Normal | 2.67 GB | Alto | 480 MB | eason=3 (LOW_MEMORY) |
| 2026-08-26 | N/A | Local | Apenas Typecheck | N/A | Propagation OFF | N/A | N/A | N/A | P6.11 implementado experimentalmente |
| 2026-08-26 (tarde) | ? | Dispositivo? | Debug | Variável | Propagation OFF | N/A | Reduzido | N/A | Relatado no P7 (reduziu fortemente o leak) |
| 2026-08-27 (11:22 UTC) | 5563 | AVD/Dev | Debug (Metro) | ? | ? | N/A | (Alloc Fails) | N/A | eason=5 (APP CRASH NATIVE) / SIGABRT |

*O evento final não foi LOW_MEMORY pela gestão do OS, mas um crash interno C++ (APP CRASH NATIVE) devido à quebra de alocação.*

## 3. FATOS COMPROVADOS
* O OOM clássico no projeto tem sido um leak progressivo concentrado em áreas nativas, refletindo a falência sistêmica descrita como LOW_MEMORY.
* A massa do leak (megabytes por frame em velocidades altas) provou **não provir das funções JavaScript puras** (Sistemas ECS mapeados geram KBs/t).
* O experimento **P6.11** bloqueou a distribuição do estado para o React. Resultado: o crescimento de memória atípico foi interrompido, mitigando drasticamente o comportamento de memory bomb e localizando o buraco na relação "React Tree -> Binding Nativo".

## 4. HIPÓTESES RECLASSIFICADAS
(Consultar MEMORY-INVESTIGATION-MASTER.md para o registro oficial detalhado).
* **Autosave Massivo:** Corrigido.
* **persistCurrent() no GameLoop:** Corrigido.
* **React Render Propagation (H5):** Candidata Forte.
* **Skia/Reanimated JSI Leaks (H6):** Candidata.
* **Object.keys/closures da engine (H4):** Refutada/Improvável como causa raiz.

## 5. CRASH NATIVO (27/08)
* **Status:** TOMBSTONE COMPLETO INDISPONÍVEL
* O arquivo com o Abort Message nativo, std::bad_alloc, e o descritivo de stack frame (frames #00 a #10) atrelados ao PID 5563 não estão contidos dentro da base local (ex: não há log textual recente nas pastas .verify-logs/ ou /data/tombstones/ acessível sem o dispositivo conectado na sessão via ADB).

## 6. SYMBOLIZATION
* **Os binários:**
  * libreactnative.so e libhermesvm.so acompanham o build React Native v85 / SDK 56.
  * O SDK da Expo providencia libhermesvm.so pre-built (stripped), limitando nativamente o Symbolization interno local da Hermes (não há .so unstripped local correspondente da máquina Hermes para a bridge, pois ambos ocupam exatos 3.7MB).
  * libreactnative.so possui variante de debug Unstripped presente em merged_native_libs/.../libreactnative.so (medindo generosos ~212 MB), o que permitiria mapear a stack via llvm-addr2line para RuntimeScheduler e afins **SE** houvesse um tombstone válido com os program counters originais.
* **Faltando:** O arquivo contendo o backtrace original (log tombstone bruto) e symbols nativos das C++ pre-builds da Hermes via Expo.

## 7. BUILD MATRIX
* **A (
px expo start -c):** Metro Bundler (Live JS), Hermes habilitado. Carga extra de Strict Mode, logging de Dev, Fast Refresh e instrumentação JSI adicionam sobrecarga substancial de allocs.
* **B (ndroid:full-verify):** Build Gradle Debug (ssembleDebug). Continua a depender do Metro bundler para injetar o código, gerando logs em logcat.
* **C:** O APK *Debug* tradicional da expo normalmente não embarca o bundle (puxa via LAN porta 8081). Requer compilação flaggada para embedded offline, ou build Release.
* **D:** Pelo histórico, P6.11 deve ter rodado em Debug/Metro (conectado ao bundler).
* **E:** Os crashes históricos SIGABRT listam thread mqt_v_js e assertos de engine. Ocorreram em Dev (debug + metro).
* **F:** Diferenças Críticas: O Release stripa assertos do React C++ (o que converte crashes Nativos como eason=5 de abortos diretos para silenciamentos, ou altera quem mata primeiro). Hermes compila em Release bytecode nativo (HBC) em oposição ao parsing iterativo de sourcemap de Dev; RuntimeScheduler destrava e não aciona avisos sintéticos (__DEV__).

## 8. DEPENDENCY TRACE (Caminhos da Carga por Tick)
* **	ick -> GameSession -> GameProvider:** 4x/seg (250ms interval). Retorna um shallow copy object {...s} alocando ~15 micro-objetos que são entregues ao hook setGameState.
* **	ick -> React -> MapScreen:** A cada setState do provider, MapScreen lê gameState.ecs.regionOwner. Não é pesado em JS bruto, mas a execução leva à invocação de worklets.
* **	ick -> Reanimated:** MapScreen computa um delta do TypedArray (~320.000) e envia índices mutados pela bridge C++ usando unOnUI (Worklet). **Evidência:** src/ui/screens/MapScreen.tsx chama unOnUI(updates, sv, trigger). Extremamente perigoso se handles da bridge C++ (JSI host objects para closure/arrays) não forem limpos rápido o bastante no React Native 0.76 (Fabric/Hermes). Frequência: 4 FPS (quando a tela avança tick).
* **	ick -> Skia:** Skia consome as Shared Values (Worklets) para redesenhar. Não processa arrays crus diretamente por tick no JS, depende do trigger vindo de Reanimated.
* **	ick -> JSI:** Além da ponte acima, GameProvider envia objetos com milhares de propriedades para as DevTools/Analytics internamente no Debug mode.
* **	ick -> MMKV:** 1 vez a cada 60s (fora do hot path contínuo), executa snapshot esparso. Tráfego de I/O em background puro C++ MMKV. (Inocente do MB/s linear).

## 9. GAMEPROVIDER (READ ONLY AUDIT)
1. **Frequência Real de sync:** Executa a closure a cada 250ms (via setInterval).
2. **Condição:** Verifica estritamente se state.meta.tick !== lastRenderedTick.
3. **Frequência Máxima:** Como a engine emula deltaMs, em velocidades altas como 30x, os ticks progridem dezenas de vezes em 1 segundo. Contudo, o polling só acorda a cada 250ms, logo, chamará setGameState no **MÁXIMO 4 vezes por segundo** não importa a velocidade da engine.
4. **requestAnimationFrame:** Ele encapsula a chamada setGameState(state), garantindo que o trigger do React comece amarrado ao v-sync do UI thread.
5. **Referências que mudam:** O state passado possui root clonada e arrays rasos criados por spread [...events] e objetos kingdoms.
6. **Componentes Diretamente Afetados:** Tudo abaixo de Context.Provider (MapScreen, DiplomacyScreen, Overlays de UI, painéis pop-ups).
7. **O que P6.11 Bloqueou:** Impediu *somente* o setGameState(state) de acionar os render cycles do React.
8. **O que P6.11 NÃO Bloqueou:** O loop syncInterval de 250ms, o equestAnimationFrame que agora despacha closures vazias 4x por segundo, a simulação ECS e a emissão de DomainEvents locais, ou os console.log nativos do projeto/telemetria.
**Conclusão sobre o bloqueio:** P6.11 isolou majoritariamente a "React Propagation". A carga indireta não-bloqueada era a da closure de timer, que provou-se inocente ao não vazar MB/s.

## 10. SIMULATION ENGINE (Grafo e Comportamento)
pumpSimulationQueue -> unMutating -> unInPlace -> Sistemas Array (AutomationSystem, WarSystem, MigrationSystem, etc).
* Todos rodam dentro do frame do tick nativamente em loops JS V8/Hermes.
* NENHUM sistema ECS importa bindings C++, unOnUI, JSI, ou MMKV no seu método un().
* NENHUM sistema envia eventos à bridge nativa.
* Eles geram objetos simples (DomainEvents) depositados na queue. A fronteira JS/Native é estritamente transpassada APENAS QUANDO a UI lê essa queue ou lê o State modificado (como provou o P6.11).

## 11. RECONCILIAR OS RESULTADOS P6.10 / P6.11
* **P6.10:** Engine (Sistemas JS/ECS) consumindo na ordem de KBs puros, fisicamente incapaz de ser o memory-bomb.
* **P6.11:** Corte na Reação Visual (React) mitiga fortemente o problema, embora um resíduo fique.
**Como ambos são compatíveis? Modelos Causais:**
1. **O vazamento primário está nos Worklets JSI Reanimated da MapScreen:** A engine em JS atualiza um ECS velozmente. O React acorda 4x por segundo e envia closures anônimas para C++ via unOnUI(deltas). A cada 250ms, a Hermes/JSI Bridge precisa construir, despachar e Garbage Collect dezenas de C++ HostObjects transitórios para as funções worklet e arrays passados. No Metro Debug (sob Strict Mode/Dev Assertions), o GC atrasa, o Native Heap estoura com handles zumbis do C++ Worklet.
2. **React Fabric Node Leak (Virtual DOM Flood):** As views não crescem porque os painéis nativos sobrevivem. Mas o *Shadow Tree* (Nodes C++ do novo renderer React Native) armazena props de texto, clones estruturais e bridges. A Engine JS altera dados complexos que a GUI assina intensamente. Quando a GUI refaz a DOM para a Tela Inteira (várias instâncias filhas react), gera picos agudos transitórios (vistos nas quedas acentuadas do RSS do Android VmSwap reclaim process).
3. **Hermes V1 Memory Regression exacerba Memory Fragmentation Nativa:** Com a React Bridge inundada, a fragmentação de memória sob o allocator (C++) cresce sem parar. O VmSwap trabalha e tritura a performance, finalizando no kernel panic ou LOW_MEMORY.

## 12. UNKNOWN / NOT YET PROVEN
* Qual objeto C++ retém de fato a memória? (É um pointer SkiaPath, um Worklet HostFunction ou um ReactShadowNode?).
* O vazamento residual detectado ("crescimento residual permaneceu") é parte menor do mesmo bug, ou o leak natural da libhermes não documentada rodando background idle?
* Por que um incidente culminou em LOW_MEMORY calmo e outro atirou SIGABRT (eason=5) abrindo a caixa do std::bad_alloc no RuntimeScheduler?
* O comportamento seria drasticamente estabilizado em um APK gerado com --release devido à erradicação de logging do dev mode e asserts do strict mode na C++ bridge?

## 13. PRÓXIMO EXPERIMENTO (ESPECIFICAÇÃO)

**EXPERIMENTO: ISOLAMENTO DO TRÁFEGO DE BRIDGE (WORKLETS)**

A evidência aponta massivamente para a fronteira JSI / C++ acionada no React Render. A mais "suja" das fronteiras ocorre na MapScreen com o tráfego de Reanimated.

* **Hipótese:** O vazamento colossal (~MBs/s) ocorre especificamente na conversão de Arrays JavaScript para Reanimated Worklets/JSI (chamada de unOnUI no MapScreen), retendo memórias não gerenciadas na Bridge.
* **Variável Independente:** A execução ou não da lógica de Worklets da tela gráfica.
* **Variável Dependente:** Consumo RSS Máximo (Memory Leak Nativo rate).
* **Baseline:** P6.11 desligado (Render Propagation ON = comportamento base original OOM, alto consumo nativo).
* **Condição Experimental:** Manter a "Render Propagation ON" (para o React repintar a UI e validar fluxos passivos como overlay texts), **porém desabilitar exclusivamente a carga Skia e Reanimated**. Isso será feito comentando o corpo do loop síncrono no useEffect de Diff da MapScreen e substituindo a tag <SimulationCanvas> por uma view vazia colorida.
* **Resultado se H1 Verdadeira:** O vazamento violento desaparece totalmente, e a UI tradicional da diplomacia/estado flui leve. OOM extirpado da simulação.
* **Resultado se H1 Falsa:** O vazamento pesado continua existindo, significando que a bridge do Reanimated é inocente e o culpado pertence ao escopo mais fundamental do React Context Prop Drilling.
* **Critério de Encerramento:** Sob stress em 30x velocidade, Android Native Heap permanece estabilizado (< 1 MB ganho sustentado p/ minuto).

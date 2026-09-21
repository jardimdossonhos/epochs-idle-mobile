# P9 — MARCO DE CONTROLE CAUSAL E ESTABILIZAÇÃO DO RUNTIME

## 1. ESTADO ATUAL DA INVESTIGAÇÃO E PERGUNTA CENTRAL
A investigação forense atingiu uma maturidade onde sabemos que o **processamento matemático da Simulação ECS em si NÃO vaza gigabytes**. 

**Pergunta Central da Fase:** Qual operação executada como consequência de um tick pode provocar crescimento ou retenção substancial de memória nativa?
**Resposta Forense:** A clonagem de estado raso empurrada dezenas de vezes por minuto via Contexto (GameProvider -> setGameState) atinge **5 abas da Tab Navigation simultaneamente**, pois em React Native Navigation, abas não ativas continuam montadas e recebendo atualizações da árvore. Telas complexas como \DiplomacyScreen\ reprocessam vetores nativamente por trás dos panos, enchendo a ponte JSI e o React Fabric Scheduler com nós efêmeros.

## 2. FATOS CONFIRMADOS
* Atividade da simulação -> Aumento rápido da memória Native/RssAnon.
* Pausar simulação -> Interrupção imediata do crescimento significativo.
* RssAnon passa de ~0.84 GB para ~1.53 GB e mantém-se em platô em pausa.
* O fluxo nativo está vazando durante o recálculo UI induzido pelos avanços de tick.
* Autosave e I/O bloqueante foram corrigidos (H1 e H2).

## 3. FATOS AINDA INCERTOS
* Qual tela específica ou struct nativa exata do UI Renderer retém fisicamente a sujeira (ShadowTree nodes vs HostObjects não-coletados).

## 4. GRAFO DO TICK PIPELINE (Auditoria)
A engine JS é puramente iterativa (Arrays e Buffers temporários alocados estaticamente).

\\\mermaid
graph TD;
    T[Tick: 30x = 3 ticks/s] --> PSQ[pumpSimulationQueue];
    PSQ --> RM[runMutating];
    RM --> RIP[runInPlace];
    RIP --> SYS[Sistemas: Automation, War...];
    SYS -->|Emite Eventos Domain| EB[LocalEventBus];
    EB -->|Nenhum assinante UI perigoso| GC[Garbage Collected];
    RM --> ST[Atualiza this.currentState];
\\\

## 5. GRAFO DAS FRONTEIRAS JS / NATIVE (Auditoria Indireta)
\\\mermaid
graph TD;
    T[Tick avança State.Meta.Tick] --> GP[GameProvider setInterval 250ms];
    GP -->|Se tick > lastRenderedTick| SGS[setGameState];
    SGS --> React[React Fabric Re-Render Tree];
    React --> Map[MapScreen];
    React --> Dip[DiplomacyScreen];
    React --> Tech[TechScreen];
    React --> Gov[GovScreen];
    React --> Top[TopHUD];
    Map -->|runOnUI deltas| REA[Reanimated Bridge C++];
    Dip -->|Itera todos Reinos| FAB[Fabric UI Native Text Nodes];
\\\

## 6. RELAÇÃO MATEMÁTICA E VARIÁVEL FUNDAMENTAL
* \	ickDurationMs = 10.000\
* \deltaMs = 16.6\ (60FPS)
* \	icks processados por segundo\  = \frac{1000 \times \text{speedMultiplier}}{10.000}$

Fórmula Exata de Processamento:
* **1x**  = 0.1 ticks/s
* **5x**  = 0.5 ticks/s
* **30x** = 3.0 ticks/s

## 7. INVENTÁRIO DE OPERAÇÕES NATIVE
| Operação | Executa por tick? | Frequência Máx | Alocação JS | Cruza fronteira nativa? | Retém referência? | Caminho |
|---|---|---|---|---|---|---|
| setGameState Context | Não (4x/seg) | 4 FPS | Media | Sim (Fabric Tree) | Candidata Forte | setInterval -> setGameState -> TabScreens |
| unOnUI (MapScreen) | Acionado pelo Context | 4 FPS | Alta | Sim (Reanimated JSI) | Parcialmente | MapScreen useEffect -> deltas |
| MMKV saveToSlot | Não (1x/60s) | 0.01 FPS | Baixa | Sim (I/O) | Não (Corrigo) | pumpSimulationQueue -> runAutosave |
| Command Logging | Não (Mobile=OFF) | 0 | Zero | Não | Não | enqueueCommandEntries (Null Rep) |

## 8. MODELOS CAUSAIS
* **MODELO A (Custo por Tick -  \propto T_s$):** Falso fisicamente em P6.10, mas os efeitos colaterais aparentam seguir a progressão devido aos gatilhos de evento.
* **MODELO B (Custo por Render/Update -  \propto Render\_Freq$):** Suportado amplamente. setGameState inunda a UI em React Native (5 telas montadas invisíveis recalculando vetores C++). P6.11 isolou a propagação de render e a memória suavizou.
* **MODELO C (Custo por Tempo Independente):** Falso. Quando em Pausa, a memória estagna totalmente, provando subordinação à simulação/render.

## 9. LACUNAS DE EVIDÊNCIA
A propagação via setGameState atinge as 5 abas da \BottomTabNavigator\ (App.tsx), mas carecemos de provas se o acúmulo C++ deve-se ao \DiplomacyScreen\ map string allocations, Reanimated JSI Objects, ou \Skia\ contexts perdidos. A tela gráfica versus telas textuais concorrem pela culpa.

## 10. PRÓXIMO EXPERIMENTO DISCRIMINATÓRIO
Para testar a hipótese de inflação da ponte Fabric/Navigation, utilizaremos a propriedade oficial do Navigation: unmountOnBlur = true.

* **HYPOTHESIS:** As telas textuais em background (Diplomacy, Tech, State) que continuam assinando setGameState (4x/s) geram lixo estrutural de strings e Fabric Nodes no Native Heap se não estiverem desmontadas.
* **INDEPENDENT VARIABLE:** Comportamento de desmontagem das Tab Screens ocultas (unmountOnBlur ON/OFF).
* **DEPENDENT VARIABLE:** Δ RssAnon (MB/minuto) e Δ Native Heap PSS.
* **CONTROL:** Mesmo PID / Campanha Local / 30x velocidade.
* **PREDICTION:** Se unmountOnBlur = true, telas em background morrerão, reduzindo os galhos do Fabric Graph pela metade. Apenas MapScreen e TopHUD cruzarão ponte nativa.
  - ON (Ativo) = Crescimento desacelera consideravelmente.
  - OFF (Normal) = RssAnon sobe agressivamente como verificado em Baseline.
* **OBSERVED RESULT:** [Pendente P10]
* **CONFIDENCE:** [Pendente]
* **NEXT DISCRIMINATING TEST:** Isolar explicitamente MapScreen se esse falhar.

## 11. CRITÉRIOS OBJETIVOS DE SUCESSO/FALHA (P10)
**SUCESSO:** Slope do Native Heap Alloc despenca após aplicar a flag de Unmount global no React Navigation, isolando as facções textuais da culpa visual.
**FALHA:** A memória mantém a curva vertical, transferindo a suspeita majoritária de volta à estrutura gráfica (Canvas) da UI principal.

## 12. CONCLUSÃO OPERACIONAL
**CAUSA MAIS PROVÁVEL:** Propagação síncrona agressiva do GameState em múltiplas abas concorrentes do React Navigation simultaneamente. (Fabric ShadowTree Flood).
**EVIDÊNCIA:** P6.11 limitou o propagador e o vazamento secou. A UI reage de forma imperativa (clones pesados de dicionários kingdoms a cada quarto de segundo em telas escondidas).
**O QUE FOI DESCARTADO:** Engine JS (Sistemas Puros), I/O de Command Logging, Autosave Array Buffer, e vazamento estático por tempo.
**O QUE AINDA NÃO SABEMOS:** A parcela de lixo específica gerada (Ex: Fabric Text Node Leak vs JSI View Props Leak).
**EXPERIMENTO ÚNICO MAIS INFORMATIVO:** unmountOnBlur: true nas tabs do React Navigation.
**VARIÁVEL INDEPENDENTE:** Abas ocultas consumindo ciclos de render JSI.
**CRITÉRIO DE SUCESSO:** Redução substancial ou obliteração do slope RssAnon/MBminuto.
**CRITÉRIO DE FALHA:** Slope inalterado (obrigando a focar unicamente no canvas gráfico vivo).

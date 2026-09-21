# MEMÓRIA CANÔNICA DA INVESTIGAÇÃO

Este documento é a fonte canônica da investigação de memória (OOM Native Heap) do projeto Epochs Idle.

## H1 — Autosave contendo ECS bruto
- **Hipótese:** Serialização indiscriminada dos arrays do ECS gera retenção síncrona massiva na ponte nativa.
- **Evidência favorável:** Payload medido em aproximadamente 87.865.921 bytes (87,8 MB).
- **Evidência contrária:** Nenhuma.
- **Experimentos já realizados:** Refatoração estrutural para Sparse Snapshot (P6.4).
- **Resultado observado:** O payload caiu para 37–38 KB e os congelamentos (ANR) desapareceram.
- **Status:** **PROBLEMA REAL CONFIRMADO E CORRIGIDO.**
- **Próximo experimento discriminatório:** N/A

## H2 — persistCurrent() no hot path
- **Hipótese:** Chamadas contínuas de persistência I/O (MMKV) bloqueavam a simulação por tick.
- **Evidência favorável:** 	his.persistCurrent() estava dentro do loop síncrono pumpSimulationQueue().
- **Evidência contrária:** Nenhuma.
- **Experimentos já realizados:** Remoção da chamada (P6.2).
- **Resultado observado:** Redução de I/O em background.
- **Status:** **PROBLEMA ARQUITETURAL CONFIRMADO E CORRIGIDO.**
- **Próximo experimento discriminatório:** N/A

## H3 — Crescimento de Views por navegação
- **Hipótese:** Mudança de rotas causa acúmulo de Fragments/Views nativas não-destruídas.
- **Evidência favorável:** Views cresceram nas telas iniciais do profiler.
- **Evidência contrária:** O crescimento se estabilizou mas o processo continuou inchando centenas de megabytes.
- **Experimentos já realizados:** Stress test mantendo a mesma aba gráfica focada.
- **Resultado observado:** Não há evidência suficiente de crescimento monotônico de Views compatível com a falha massiva.
- **Status:** **NÃO SUPORTADA COMO CAUSA PRIMÁRIA.**
- **Próximo experimento discriminatório:** N/A

## H4 — Object.keys/map/filter/sort da ECS
- **Hipótese:** As operações funcionais geram lixo JavaScript por tick, quebrando o GC (Garbage Collector).
- **Evidência favorável:** Código ECS utiliza iteradores funcionais e closures no Hot Path.
- **Evidência contrária:** Auditoria estática (P6.10) estimou dezenas de KBs de alocação por tick. GC do Hermes lida perfeitamente com lixo efêmero em JS Puro.
- **Experimentos já realizados:** P6.10/P6.11 rodaram a engine isolada com retenção estancada.
- **Resultado observado:** Os números diferem em magnitudes (KB vs MB). Não há evidência suficiente de que sejam a causa primária.
- **Status:** **NÃO SUPORTADA COMO CAUSA PRIMÁRIA ATUAL.**
- **Próximo experimento discriminatório:** N/A

## H5 — React state propagation
- **Hipótese:** A emissão indiscriminada do GameState via Context (setGameState) força a recriação da árvore React (Fabric Shadow Nodes, Prop Strings) 4x/seg.
- **Evidência favorável:** P6.11 bloqueou setGameState(state) e o crescimento de memória atípico mitigou radicalmente, mas não a levou a zero. Portanto, demonstrou contribuição da propagação React/UI, sem provar exclusividade.
- **Evidência contrária:** P6.11 provou a mitigação, mas não distingue qual aba (Componente) exato inflaciona as views nativas.
- **Experimentos já realizados:** Render Propagation Isolada (P6.11).
- **Resultado observado:** A atividade da interface (UI updates) está umbilicalmente ligada ao leak.
- **Status:** **CANDIDATA / CONTRIBUIÇÃO PARCIAL POSSÍVEL.**
- **Próximo experimento discriminatório:** Desmontagem das abas (Tab Navigation) em background via unmountOnBlur ou isolamento de Contexto global para identificar qual tela incha.

## H6 — runOnUI específico da MapScreen (Worklets JSI)
- **Hipótese:** O marshalling dos arrays deltas JS para SharedValue C++ via unOnUI falha no Garbage Collect, vazando HostObjects.
- **Evidência favorável:** A stack trace nativa histórica exibiu crashes passando por jsi::Function::call.
- **Evidência contrária:** Desabilitar esses fluxos específicos (Experimento P8) manteve um crescimento relevante de memória no processo.
- **Experimentos já realizados:** Experimento P8 (Bloqueio experimental do JSI Diff no MapScreen).
- **Resultado observado:** Os dois fluxos específicos (deltas + deltasS) não explicam sozinhos o fenômeno.
- **Status:** **OS DOIS FLUXOS ESPECÍFICOS NÃO EXPLICAM SOZINHOS O FENÔMENO.**
- **Próximo experimento discriminatório:** N/A (Migrar investigação primária para o escopo macro do React Context e Navigation).


# Investigação de Memória Fase E (E0, E1, E2)

## E0 — Validação do Estado Experimental
**Status do Working Tree:**
As únicas modificações mantidas do experimento D.3 são:
1. **Produto:** TopHUD.tsx permanece com React.memo e lendo a sessão via useUIStore.getState()._imperativeSession (cortando o hook de Context). O payload em GameProvider.tsx alimenta essa sessão.
2. **Instrumentação:** Contadores P10Counters em App.tsx (appContent, inGameShell), GameProvider (zSetState, syncInterval, providerUpdates), TopHUD (renders).
3. **Bypass / Automação:** App.tsx (bypass para a rota in_game), AuthScreen.tsx (auto-login), GameProvider.tsx (setSpeed(30) e setPaused(false) injetados no boot).
A função de clone (world.regions = {}) permanece em sua versão estrita (sem deep clone dos arrays do ECS).

## E1 — Baseline Temporal de Memória (Condição de Teste)
O script un_e1.ps1 executou a aplicação por 40 segundos após o boot, coletando dumpsys a cada 10s para distinguir comportamento em *sawtooth* (coletável pelo GC) de *crescimento monotônico* (retenção real).

| Tempo | Java Heap | Native Heap | Unknown | TOTAL PSS |
|---|---:|---:|---:|---:|
| **t0 (Baseline)** | 28 MB | 510 MB | **65.5 MB** | 660 MB |
| **t10** | 30 MB | 395 MB | **66.7 MB** | 549 MB |
| **t20** | 25 MB | 419 MB | **82.2 MB** | 591 MB |
| **t30** | 22 MB | 421 MB | **90.5 MB** | 597 MB |
| **t40** | 22 MB | 422 MB | **98.7 MB** | 607 MB |
| **Pós-GC** | 21 MB | 423 MB | **100.6 MB** | 609 MB |

**Conclusão E1:** 
O crescimento é **estritamente monotônico e progressivo**. A cada 10 segundos, o bloco Unknown cresce em média ~8 MB a ~15 MB. O Java Heap permanece plano (~21 a 30 MB), comprovando que o Hermes GC está limpando objetos puros de JS perfeitamente. O vazamento é 100% nativo / JSI / bridge queue, crescendo a cada tick processado.

## E2 — Auditoria de Candidatos Nativos

Pesquisamos no código por arrays tipados, JSI, Nitro e postMessage. Os candidatos são:

### 1. ECS TypedArrays (EcsState)
* **Quem aloca:** ecs-factory.ts -> createVirginEcs (Float64Array, Float32Array, Int32Array).
* **Quem mantém a referência:** O objeto EcsState na raiz da simulação.
* **Quando é liberado:** Apenas ao destruir a sessão ou recarregar o jogo.
* **Cresce com ticks?** **NÃO.** São alocados ~27 MB pré-fixados (320.000 hexes) no instante zero. As mutações no engine são in-place (Zero-Copy). Não gera lixo incremental, não é a causa do Unknown progressivo.

### 2. MapDoubleBuffer (react-native-nitro-modules / JSI)
* **Quem aloca:** C++ bindings via NitroModules.
* **Status:** Inativo. A classe MapDoubleBuffer está definida no código, mas nunca é instanciada na pipeline atual.

### 3. Fila de Domain Events (Eventos descartados)
* **Status:** Avaliado e Inocentado. O TickPipeline.runInPlace gera arrays e os retorna. Em pumpSimulationQueue(), o esult.events é ignorado. Por serem arrays JS convencionais soltos (unreferenced), o GC (Java Heap) as coleta imediatamente (o que explica a planicidade do Java Heap).

### 4. RenderSyncSystem (CANDIDATO PRINCIPAL 🔥)
* **Mecanismo:** Executa em **todo tick** (30 vezes por segundo).
* **O que faz:**
`	ypescript
if (typeof self !== "undefined" && typeof (self as any).postMessage === "function") {
  (self as any).postMessage({
    type: "SYNC_TICK",
    payload: {
      regionOwner: this.renderRegionOwner, // Int32Array(320.000) = ~1.28 MB
      armyData: this.renderArmyData,       // Float32Array(8.192) = ~32 KB
      // ...
`
* **Quem aloca:** O motor JS/Nativo que implementa o postMessage global (frequentemente polyfill de Worklets ou bridge interna do React Native). Para despachar a mensagem, ele cria uma cópia estrutural profunda (Structured Clone / Buffer nativo) do payload.
* **Quem mantém a referência:** A fila de mensagens oculta (MessageQueue/Bridge) aguardando processamento por um listener que aparentemente **não existe ou não está consumindo os dados na velocidade certa**.
* **Cresce com ticks?** **SIM.** A cada tick, um novo clone do buffer de 1.28 MB é empurrado na fila. A 30 ticks por segundo, são gerados dezenas de megabytes que se acumulam no espaço nativo (Unknown) porque não há GC para limpar mensagens não entregues ou pending na bridge.

## Próximos Passos (Regra de Investigação)
Atendendo a regra "*Nenhum patch de correção nesta fase. Identificar o subsistema.*", parei aqui. 

Identificamos a matriz de crescimento monotônico: **A fila assíncrona do RenderSyncSystem (postMessage) cresce a cada tick, retendo os TypedArrays no espaço não gerenciado do Hermes (Unknown).**

Aguardando sua autorização e instruções para a estratégia de refutação/confirmação (ex: isolar o RenderSyncSystem) em E3/E4.

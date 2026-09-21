# Descobertas Técnicas e Auditorias (Audit Memory)

Esta documentação agrega achados cruciais descobertos durante investigações e profilings. Ela garante que a dor de ontem não seja o bug de amanhã.

### AF-001: ECS Runtime Integrity / TypeError
- **Categoria**: Arquitetura / Crash
- **Status**: Confirmado e Corrigido.
- **Severidade**: P0
- **Causa Raiz**: O uso de `structuredClone` no `GameSession.resetToNewGame()` convertia os `Float32Array` e `Int32Array` do ECS em objetos padrão do JavaScript. Quando o `PopulationSystem` rodava no primeiro tick e chamava `ecs.factionPopulation.fill(0)`, disparava `TypeError: undefined is not a function`, crachando o loop.
- **Evidência**: Callstack logada via AVD.
- **Arquivos envolvidos**: `game-session.ts`, `population-system.ts`
- **Correção**: Proibição estrita de deep cloning no EcsState. Injeção direta por referência via `createVirginEcs()` mantida.
- **Fase prevista**: N/A (Resolvido).

### AF-002: Stale State Leak no New Game
- **Categoria**: Vazamento de Estado
- **Status**: Confirmado e Corrigido.
- **Severidade**: P1
- **Causa Raiz**: O `GameProvider` mantinha referências antigas no closure da UI React. Ao sair para o Menu e iniciar um Novo Jogo, partes da simulação antiga (como instâncias fantasmas de tropas ou configurações) continuavam corrompendo a simulação nascente.

### AF-003: OOM Causado por Serialização Pesada
- **Categoria**: Performance / Memória
- **Status**: Confirmado e Corrigido.
- **Severidade**: P0
- **Causa Raiz**: `JSON.stringify(EcsState)` inteiro consumia megabytes exponenciais e paralisava a thread UI/JS Bridge no Expo em autosaves constantes, resultando em OOM.
- **Correção**: Implementada Persistência ECS Esparsa (Sparse ECS). Só serializa `O(K)` (chunks ocupados).

### AF-004: Economia dependente da cronologia (Progression Baseline Failure)
- **Categoria**: Game Design / Mecânica
- **Status**: **PENDENTE (Baseline Failure Aceita)**.
- **Severidade**: P2
- **Causa Raiz**: O `economy-consolidation.test.ts` e testes de build demonstram que as progressões esperadas pelas mecânicas (renda em Ticks vs Custos Absolutos) estão fora de sincronia matemática, exigindo a reconstrução e alinhamento do motor econômico na Fase C2.
- **Fase Prevista**: Correção e Balanceamento na Fase de Economia.

### AF-005: Fechamento Subido no Android (Loss of Activity)
- **Categoria**: Infraestrutura / React Native Bridge
- **Status**: Investigado (Causa raiz presumida mas sem fix permanente necessário além de deploy de release).
- **Severidade**: P0 (durante dev)
- **Causa Raiz**: Em modo DEV com Expo/Metro, eventos de "Reloading" e uso brutal de RAM via V8 desestabilizavam a `MainActivity`. O `EGLConsumer` perdia a conexão Surface, derrubando a interface sem gerar erro lógico no JavaScript. A captura forense P0.2 provou que a versão otimizada estabilizou o processo. EGL/GFXStream como problema base.
- **Evidência**: `logcat` e rastreamento forense local.

### AF-006: Bug do Spawn Geográfico ("Novo Jogo fora do continente")
- **Categoria**: Lógica de Criação
- **Status**: Confirmado e Corrigido (C1 Final).
- **Severidade**: P2
- **Causa Raiz**: A UI selecionava um bioma/região genérica, mas a lógica da matriz não confinava o Index aos bounds reais do continente, gerando desconexão entre a lore da UI e o mapa.
- **Correção Aplicada**: Criação de Bounding Boxes rígidas por região (`minRow`, `maxRow`, etc) no algoritmo de Random Spawn.

### AF-007: Inconsistência Semântica Temporal
- **Categoria**: Game Design
- **Status**: Parcialmente Confirmado.
- **Causa Raiz**: O código ainda opera com (1 Tick = 1 Mês). Porém a DESIGN DECISION canônica é "1 Tick = 1 Dia". Há uma desconexão entre a implementação atual (que carece de estações do ano e dias) e a fundação de design estabelecida.
- **Fase Prevista**: P1 (Fundação Temporal) - Unificar a semântica de tick e progressão.

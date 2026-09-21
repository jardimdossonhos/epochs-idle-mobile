# Baseline Arquitetural

Este documento consolida as fundações arquiteturais de *Epochs Idle* validadas por auditorias.

## Contrato do ECS (Entity Component System)
- **Fonte Canônica**: O ECS é o motor matemático da simulação para tudo que exige escala (N = 320.000 hexágonos).
- **TypedArrays Runtime**: Todos os buffers massivos (ex: `factionPopulation`, `regionOwner`) são obrigatoriamente instâncias de `Float64Array`, `Float32Array` ou equivalentes do JavaScript V8/Hermes.
- **Segurança de Referência (A Regra Ouro)**: É estritamente **PROIBIDO** realizar deep clones arbitrários (como `structuredClone` ou `JSON.parse(JSON.stringify())`) do estado ativo `EcsState`. Isso destrói os `TypedArrays`, converte-os em POJOs (Plain Old JavaScript Objects) e quebra violentamente sistemas que invocam métodos nativos como `.fill()`.

## Persistência Esparsa (Sparse Persistence)
- **Save (O(K))**: A função de salvamento varre os vetores de tamanho O(N) e extrai um objeto esparso de tamanho O(K) (apenas hexágonos que não sejam o "estado natural" inalterado). Nenhum dump completo de 320k entradas vai pro JSON.
- **Load / Rebuild (O(N) permitido)**: Apenas durante o boot/load, é permitido alocar vetores de tamanho O(N) na memória e reinjetar o dump esparso.
- **Autosave**: Disparado exclusivamente por métricas de **Wall Clock** (tempo do mundo real), não por Ticks, protegendo o I/O quando o jogo roda acelerado em 30x.

## Game Loop e Desempenho (O(1) Hot Path)
- **SimulationEngine & TickPipeline**: Gerenciam a vazão do tempo. O jogo orquestra `safeDeltaMs` do `NativeClock`.
- **Aceleração (Speed Multiplier)**: Fatores de aceleração de tempo (15x, 30x) simplesmente aumentam a quantidade de MS que a engine entrega à rotina de simulação, processando múltiplos Ticks de uma só vez (Batching). A complexidade do cálculo interno de um Tick permanece `O(1)`.
- **Ownership Híbrido**: Modelos de alto nível (Reinos, Tratados, Personagens Individuais) habitam um estado Orientado a Objetos (OO). O ECS atua primariamente na camada celular (demografia das regiões, movimentação militar, donos de territórios). O sistema executa "Piggybacking", onde a macroeconomia atualiza o OO a partir do ECS.

## Ciclo de Vida da Sessão
- `GameSession` orquestra `bootstrap`. 
- `createInitialState` inicia o `GameState`. Lazy instantiation é aplicada.
- A geração procedural do mundo atribui o spawn do Player geograficamente restringido e define IA Utilitária para as outras facções.
- Ownership ECS: Buffers globais estáticos injetados na Sessão, manipulados apenas pelo Engine.

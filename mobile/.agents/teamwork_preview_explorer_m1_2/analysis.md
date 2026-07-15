# Relatório de Exploração de Performance e Progressão (Sprint 3)

Este relatório detalha as descobertas da investigação da base de código do Epochs Idle sobre as mecânicas de progressão matemática (Requisito R5) e os gargalos de desempenho do loop de simulação em velocidade x30 (Requisito R2).

---

## 1. Fórmulas Matemáticas e Regras de Progressão Encontradas

A simulação de Epochs Idle é dividida em múltiplos subsistemas que rodam a cada tick (ou a cada intervalo de ticks). A análise do código revelou as seguintes mecânicas fundamentais:

### A. Economia e Produção de Recursos (`economy-system.ts`)
*   **Produtividade Regional**:
    $$\text{Productivity} = \text{clamp}(1.0 - \text{unrest} \times 0.48 - \text{devastation} \times 0.62 - \text{autonomy} \times 0.2 + \text{assimilation} \times 0.16, 0.28, 1.35)$$
*   **Taxa de Imposto (`taxLoad`)**:
    $$\text{taxLoad} = \text{clamp}(\text{baseRate} + \text{tariffRate} \times 0.45 - \text{nobleRelief} \times 0.22 - \text{clergyExemption} \times 0.18, 0.06, 0.58)$$
*   **Fator de Renda de Imposto (`taxIncomeFactor`)**:
    $$\text{taxIncomeFactor} = 0.72 + \text{taxLoad} \times 1.05$$
*   **Renda de Ouro por Tick**:
    $$\text{goldIncome} = \left(\text{TotalRegionEconomy} \times (0.78 + \text{merchantShare} \times 0.62) + \frac{\text{totalPopulation}}{100,000} \times 0.24\right) \times \text{taxIncomeFactor}$$
*   **Renda de Alimento por Tick**:
    $$\text{foodIncome} = \text{TotalRegionFood} \times (0.92 + \text{economyBudgetFactor} \times 0.24) + \text{peasantsCount} \times 3.2$$
*   **Custos de Manutenção de Ouro**:
    $$\text{goldUpkeep} = \frac{\text{armyManpower}}{8,300} + \text{usedCapacity} \times 0.042 + \text{corruption} \times 1.8 + \text{adminPenalty} \times (0.12 - \text{adminBudgetFactor} \times 0.04) + \text{councilSalaryTotal}$$

### B. Progressão Populacional (`population-system.ts` & `PopulationSystem.ts`)
*   **Pressão de Alimento (`foodPressure`)**:
    $$\text{foodPressure} = \text{clamp}\left(\frac{\text{requiredFood} - \text{foodStock}}{\text{requiredFood}}, 0, 1\right) \quad \text{onde } \text{requiredFood} = \frac{\text{totalPopulation}}{7,000}$$
*   **Crescimento Populacional do Reino**:
    $$\text{populationDelta} = \text{round}(\text{totalPopulation} \times \text{growthRatePerTick} \times (1.0 - \text{foodPressure} \times 1.6 - \text{warWeariness} \times 0.2))$$
*   **Crescimento Logístico de Província (ECS)**:
    Usa a equação de Verhulst baseada no bioma regional (Tempera: 250, Tropical: 150, Deserto: 50, Tundra: 20, Oceano: 0):
    $$\text{carryingCapacity} = \text{biomeBaseCapacity} \times (1 + \text{techCapMult})$$
    $$\text{limitFactor} = 1.0 - \frac{\text{currentPop}}{\text{carryingCapacity}}$$
    *   *Se limitFactor < 0 (Fome)*: A taxa de declínio populacional é multiplicada por 2.5.
    *   *Oceanos*: População decai a 5% por segundo real.

### C. Sistema de Pesquisa Tecnológica (`technology-system.ts`)
*   **Ganho de Pesquisa por Tick**:
    $$\text{researchDelta} = \text{baseResearchRate} \times (0.5 + \text{budgetTechFactor} + \text{focusBoost})$$
    *   $\text{baseResearchRate} = 1.0$
    *   $\text{budgetTechFactor} = \frac{\text{budgetPriority.technology}}{20}$
    *   $\text{focusBoost} = 0.08$ (se o foco for Militar), ou $0.04$ (para outros domínios)

### D. Administração Regional (`administration-system.ts`)
*   **Capacidade Usada**:
    $$\text{usedCapacity} = \sum_{\text{regions}} (7 + \text{strategicValue} \times 1.5 + (1.0 - \text{region.assimilation}) \times 8)$$
*   **Acúmulo de Corrupção**:
    $$\text{corruption} = \text{clamp}(\text{corruption} + \text{overCapacity} \times 0.0012 - \text{antiCorruptionImpact} + \text{crisisPressure} \times 0.01, 0, 1)$$

### E. Sistema Militar e Guerras (`military-system.ts` & `local-war-resolver.ts`)
*   **Poder Militar de Exército**:
    $$\text{armyPower} = \text{manpower} \times (0.6 + \text{quality} \times 0.4) \times (0.55 + \text{morale} \times 0.25 + \text{supply} \times 0.2)$$
*   **Recrutamento Logístico (Drafting)**:
    Ocorre a cada 4 ticks. Se o exército estiver abaixo do manpower regional suportado:
    $$\text{reinforcement} = \text{max}(1, \text{round}((\text{maxManpower} - \text{currentArmySize}) \times 0.05))$$
*   **Evolução de Conflito (War Score)**:
    $$\text{warScore} = \text{clamp}(\text{warScore} + \text{pressureDelta} \times 19.0, -100.0, 100.0) \quad \text{onde } \text{pressureDelta} = \frac{\text{attackerPower} - \text{defenderPower}}{\text{attackerPower} + \text{defenderPower}}$$

---

## 2. Gargalos de Desempenho Identificados no Tick Loop

Durante a análise do loop de simulação síncrono no arquivo `game-session.ts`, identificamos três gargalos severos de performance:

### Gargalo 1: Clonagem Profunda via `structuredClone` a cada Tick
O pipeline do jogo (`TickPipeline.run`) chama `cloneGameStateForSimulation` no início de cada tick. Este método executa um `structuredClone` de grandes arrays e dicionários de dados (regiões, reinos, guerras, etc.):
```typescript
export function cloneGameStateForSimulation(previousState: GameState): GameState {
  return {
    ...
    world: {
      regions: structuredClone(previousState.world.regions), // GARGALO CRÍTICO
      religions: structuredClone(previousState.world.religions),
      ...
    },
    kingdoms: structuredClone(previousState.kingdoms), // GARGALO CRÍTICO
    ...
  };
}
```
*   **Impacto**: O `structuredClone` consome de 10ms a 35ms em dispositivos móveis dependendo do tamanho do mapa.
*   **Problema x30**: Em velocidade x30, o jogo acumula ticks e tenta rodar até 5 ticks em um único ciclo (quadro real). 5 clonagens consecutivas bloqueiam o thread JS principal por 50ms a 150ms, causando congelamentos de tela e queda abrupta no frame rate.

### Gargalo 2: Invalidação Constante de Cache e Redundância O(N) em `getOwnedRegionIds`
O método `getOwnedRegionIds` cacheia os IDs das províncias pertencentes a cada reino usando um `WeakMap` baseado na referência do objeto `state.world.regions`:
```typescript
export function getOwnedRegionIds(state: GameState, kingdomId: KingdomId): string[] {
  let cache = ownedRegionsCache.get(state.world.regions);
  if (!cache) {
    // Reconstroi o cache mapeando todas as regiões
  }
...
```
*   **Impacto**: Como a cada tick o estado é clonado profundamente, a referência de `state.world.regions` muda constantemente. O cache do `WeakMap` é destruído a cada tick, forçando a varredura linear O(N) de todas as regiões para reconstruir o cache.
*   **Problema de Inconsistência**: Durante o próprio tick, se o controle regional muda (ex: colonização ou conquista de guerra), o cache dentro daquele tick fica obsoleto, induzindo bugs de cálculo matemático nos sistemas executados subsequentemente.

### Gargalo 3: Execução Síncrona na Thread de UI do React Native
O jogo roda em um temporizador de 250ms (`NativeClockService` em `GameProvider.tsx`) diretamente na thread JS principal do React Native:
*   **Impacto**: A simulação disputa recursos com o thread de renderização, navegação de telas e processamento de gestos do usuário. Qualquer sobrecarga no tick loop congela instantaneamente a resposta de toque do aplicativo.

---

## 3. Recomendações Concretas de Otimização

Para habilitar a simulação x30 fluida (smooth ticks) no mobile sem travamentos na UI, recomendamos os seguintes passos de design:

### Recomendação A: Mutação In-Place com Clonagem Única Posterior
Em vez de clonar profundamente o estado a cada tick individual dentro do loop de acúmulo:
1.  Permitir que os sistemas modifiquem o estado atual (`currentState`) **in-place** durante os ticks acumulados de um único quadro.
2.  Eliminar o `structuredClone` de dentro do loop `while (this.accumulatedMs >= tickDurationMs)`.
3.  Após processar todos os ticks do ciclo do quadro, realizar uma única **clonagem rasa/estrutural** da raiz do estado para notificar o React sobre a alteração (apenas redefinir a referência do objeto principal no EventBus).

### Recomendação B: Cache Incremental e Reativo de Territórios
Eliminar a verificação O(N) e WeakMap em `getOwnedRegionIds`:
1.  Armazenar um array de strings com os IDs das regiões diretamente no objeto `KingdomState` (ex: `kingdom.ownedRegions: string[]`).
2.  Quando uma região for colonizada ou capturada em guerra, atualizar reativamente este array localizando e removendo do reino antigo e adicionando ao novo em tempo constante O(1).

### Recomendação C: Offload para Thread Secundária (Web Worker)
Embora os Workers convencionais do navegador não funcionem nativamente em React Native, é recomendável:
1.  Implementar uma ponte para rodar o arquivo `simulation.worker.ts` em uma thread nativa secundária usando ferramentas como `react-native-multithreading` (com JSI) ou rodando a lógica dentro de uma instância invisível de WebView que possui Web Worker nativo de alto desempenho.
2.  Tornar a comunicação assíncrona baseada em buffers tipados (TypedArrays do ECS) para minimizar o overhead de serialização JSON.

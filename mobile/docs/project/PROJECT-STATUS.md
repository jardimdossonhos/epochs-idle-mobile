# Estado do Projeto (Project Status)

## Stack Tecnológica
- **Framework**: React Native com Expo SDK
- **Plataforma**: Android (Foco principal via Android CLI) e iOS
- **Package Manager**: npm
- **Motor de Renderização**: Hermes, React Native Fabric, e Skia/EGL (sob investigação em devices low-end)

## Arquitetura Core
- **Paradigma**: Arquitetura Híbrida (Orientação a Objetos para UI/State + ECS Flatizado para Simulação Massiva)
- **Tamanho do ECS**: `N = 320.000` (Hexágonos do mundo).
- **Entidades Persistidas**: `K` (apenas entidades com ocupação/modificação real).
- **Game Loop**: Dirigido por um `NativeClock` em uma `SimulationEngine` que orquestra um `TickPipeline`.
- **Speed Multiplier**: Implementado (`1x`, `15x`, `30x`). Acelera a entrega do "Wall-Clock" e consumo do acumulador, preservando `O(1)` no tick interno.
- **Persistência**: Sparse ECS (vetores `O(N)` inflados no boot, extração `O(K)` no save).

## Controle de Qualidade e Ferramental
- **Testes**: Jest (`npm run test`, `npm run verify`).
- **Verificações de Baseline**: 
  - Testes C1 de Integridade passam.
  - Testes C2 (Progresso e Economia como `economy-consolidation.test.ts`) falham intencionalmente neste momento por ser a nova baseline a ser corrigida na respectiva fase.

## Controle de Versão
- **Branch Atual**: `main`
- **Último Checkpoint Conhecido**: Commit `e15284768f9396aef6221885b0e3e51f2d9cf39e` (stabilize ECS runtime and sparse persistence)
- **Status do Working Tree**: Limpo (exceto por logs temporários de diagnóstico).

---
## Resumo de Funcionalidades

### IMPLEMENTADO
- **Criação de Campanha**: Wizard de seleção de bioma, atributos (point buy) e cultura base.
- **Time/Tick System**: O tempo flui em Ticks. (DESIGN DECISION: 1 Tick = 1 Dia. IMPLEMENTATION STATUS: O código ainda trata 1 Tick = 1 Mês. Isso será unificado na Fase de Fundação Temporal). Morte por velhice e gerações automáticas ocorrem.
- **Economia Básica**: Produção de ouro, madeira, ferro, comida por hexágono conectada ao ECS e ao Tesouro Nacional. Tributos cobrados de vassalos por `incomePerTick`.
- **Motor de Eventos (Disasters/Unrest)**: Fome por guerra, instabilidade populacional por falta de comida.
- **IA e NPCs (Bounded Rationality)**: `utility-npc-decision-service` permitindo cálculos matemáticos de guerra com vieses de erro de acordo com a personalidade do líder.
- **Persistência Híbrida ECS**: Save State limpo (`O(K)`) sem leakar ponteiros.

### PARCIAL
- **Condições de Vitória**: Verifica dominância territorial passivamente, porém não há telas ricas de endgame construídas.
- **Sistema Militar**: ArmyPool alocado no ECS e movimentação militar via grade espacial. Exige polimento de UX e feedback.
- **Cultura**: Existe cosméticamente na criação.

### QUEBRADO (Problemas de Baseline Conhecidos)
- Economia na progressão (falhando os testes de consolidation/build).
- Vazamento EGL / Fechamento de Activity ao usar features nativas pesadas e reloadings do Metro (ainda sob monitoramento).
- Contradições de Game Design (construções avançadas em eras erradas).
- Ícones faltando e problemas de UTF-8 Unicode na UI.

### NÃO IMPLEMENTADO
- Navegação Naval, Portos e Pesca (planejado).
- Estações do Ano (Inverno/Verão não existem no ECS).
- Religião Customizável (apenas hardcoded points hoje).

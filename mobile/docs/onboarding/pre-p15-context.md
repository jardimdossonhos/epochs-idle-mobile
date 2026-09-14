# Contexto Histórico Pré-P15 (Revisado)

Este documento consolida o estado do projeto, dívidas técnicas pendentes, o roadmap estratégico e o raciocínio forense das investigações anteriores de memória (P6 a P9). Foi estruturado para oferecer uma visão holística ao Tech Lead, garantindo que o conhecimento empírico do ciclo de desenvolvimento passado não se perca, ao mesmo tempo em que o alinha com as descobertas recentes (P15).

---

## 1. Dívida Técnica (TECHNICAL-DEBT.md)

```markdown
# Dívida Técnica (Technical Debt)

- Testes de `progression-build.test.ts` e economia falhando intencionalmente como referencial futuro (C2).
- Os modificadores culturais do `CharacterCreationScreen.tsx` não são preservados no estado e somem após a morte do monarca original.
- Falta suporte a Unicode/Ícones falhando em algumas builds locais e causando mojibakes (Problemas UTF-8 / Mojibake e ícones ausentes da UI).
- A função de calcular a matemática `applyAggregatedProgression()` para modo offline prolongado está rodando um fallback caro em chunks (MaxOfflineTicks: 200). Para anos inteiros offline (meses simulados), a matemática precisará ser convertida 100% para fórmulas algébricas em O(1) em vez de orquestrar mil ticks em loop batched.
- Inconsistências de `UsedCapacity` no painel de administração em relação ao limite total.
- Colonização ainda pendente de integração canônica completa no pipeline do ECS.

```

> **Nota Atualizada Pós-P15:** As falhas intencionais mencionadas na primeira linha (`progression-build` e economia) foram rigorosamente reproduzidas no commit-base. Atualmente, existem **4 falhas exatas** na suíte `npm run test` associadas a essas dívidas pré-existentes, e não constituem regressão causada por P15. Todas estão rastreadas nas Issues abertas do GitHub (#1, #2, #3, #5).

---

## 2. Status do Projeto (PROJECT-STATUS.md)

```markdown
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

```

---

## 3. Roadmap (ROADMAP.md)

```markdown
# Roadmap de Evolução (Fases)

### Princípio de Classificação
P0 — Runtime / estabilidade
P1 — Fundação temporal
P2 — Economia / progressão inicial
P3 — Campanha / cultura / geografia / tecnologia
P4 — Sistemas estratégicos avançados
P5 — UX / polish

### O Grafo de Dependências

```
Persistência / Runtime
        ↓
Fundação Temporal
        ↓
Demografia / População
        ↓
Economia
        ↓
Progressão / Construções
        ↓
Cultura / Tecnologia / Religião
        ↓
Sistemas estratégicos avançados
```

### Lista Priorizada

1. `[CONCLUÍDO]` **Persistência ECS** (O(1) & Sparse) -> Runtime Estável.
2. `[ATUAL]` **Auditoria e Checkpoint 0**.
3. `[P1]` **Fundação Temporal** - 
   - Unificar 1 tick = 1 dia.
   - Corrigir ano/mês.
   - Validar speedMultiplier 1x–30x.
   - Validar offline progression.
   - Validar consequências em crescimento populacional, mortalidade, produção e demais sistemas dependentes do tick.
4. `[P2]` **O Motor Econômico (C2)** - Somente após a estabilização temporal. Alinhar Ticks, Consumo, Cooldowns e Produção, resolvendo as *Baseline Failures*. Resolução de `economy-consolidation.test.ts`.
5. `[P2]` **Progressão Inicial** - Construções, custos iniciais.
6. `[P3]` **Campanha / Cultura / Geografia / Tecnologia** - Integração completa de bônus, herança, restrições e expansão do mapa.
7. `[P4]` **Sistemas Estratégicos Avançados** - Diplomacia profunda, Guerras massivas, Religião Customizável, Automação de Milagres.
8. `[P5]` **UX / Polish** - Acabamentos finos, melhorias visuais e navais.

```

---

## 4. Investigações de Memória Anteriores (P6, P7 e P9)

As fases anteriores (P6 a P9) dedicaram-se a rastrear o rápido consumo de memória (*Native Heap*) reportado em Android. As três investigações convergiram para a mesma conclusão na época. Abaixo está a transcrição final do **Marco de Controle (P9)**, que resume de forma idêntica a tese adotada por todas elas:

```markdown
## 12. CONCLUSÃO OPERACIONAL
**CAUSA MAIS PROVÁVEL:** Propagação síncrona agressiva do GameState em múltiplas abas concorrentes do React Navigation simultaneamente. (Fabric ShadowTree Flood).
**EVIDÊNCIA:** P6.11 limitou o propagador e o vazamento secou. A UI reage de forma imperativa (clones pesados de dicionários kingdoms a cada quarto de segundo em telas escondidas).
**O QUE FOI DESCARTADO:** Engine JS (Sistemas Puros), I/O de Command Logging, Autosave Array Buffer, e vazamento estático por tempo.
**O QUE AINDA NÃO SABEMOS:** A parcela de lixo específica gerada (Ex: Fabric Text Node Leak vs JSI View Props Leak).
**EXPERIMENTO ÚNICO MAIS INFORMATIVO:** unmountOnBlur: true nas tabs do React Navigation.
**VARIÁVEL INDEPENDENTE:** Abas ocultas consumindo ciclos de render JSI.
**CRITÉRIO DE SUCESSO:** Redução substancial ou obliteração do slope RssAnon/MBminuto.
**CRITÉRIO DE FALHA:** Slope inalterado (obrigando a focar unicamente no canvas gráfico vivo).
```

### ⚠️ AVISO HOLÍSTICO (Correção Pós-P15)

É fundamental que o novo Tech Lead leia a conclusão acima (P9) entendendo que a interpretação de que o React Navigation causaria um leak progressivo e inevitável (levando a OOM) **não foi sustentada** pela recente investigação **P15**.

* **O Erro de Interpretação Antigo:** P6, P7 e P9 assumiam que a rápida alocação (o "Fabric ShadowTree Flood") constituía um *vazamento infinito* (Memory Leak) fatal.
* **A Verdade Observada (P15):** Nos cenários e janelas testados, o crescimento observado no bucket Android `Unknown` está fortemente associado ao heap Hermes (`hades-segment`). Esse heap apresentou crescimento seguido de estabilização, sem que fosse identificada uma causa de memory leak persistente nos caminhos investigados. O mecanismo interno exato dessa estabilização não foi diretamente medido e permanece fora do escopo comprovado.

### Status Correto da Memória: MONITORADO / NÃO BLOQUEANTE

* Heap Hermes/Hades observado crescendo.
* Estabilização observada nas janelas testadas.
* Nenhuma causa de leak persistente identificada.
* Nenhuma refatoração arquitetural de memória (como o `unmountOnBlur` global sugerido em P9) é justificada neste momento.
* Reabertura da investigação somente diante de evidência nova de degradação real (ex: Soak Test prolongado).

### Direção do Projeto após P15

P15 está encerrada. 
* O baseline de testes foi preservado (4 falhas).
* A otimização `React.memo(TopHUD)` provou-se uma otimização real de renderização/CPU e foi mantida.
* Nenhuma cirurgia arquitetural adicional será feita agora. 

**A prioridade correta passa a ser a Fundação Temporal (P1)** prevista no roadmap: 1 tick = 1 dia, calendário, velocidades 1x–30x, offline progression e validação das consequências temporais sobre os sistemas dependentes, visto que o tempo é uma dependência de primeira ordem do ECS.

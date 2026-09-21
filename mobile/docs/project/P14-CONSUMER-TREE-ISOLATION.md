# P14 — CONSUMER TREE ISOLATION

## 1. HIPÓTESE
Se a recriação da árvore gráfica (Canvas) não foi suficiente para parar a sangria de Native Heap / RssAnon, o vazamento só pode estar na montagem silenciosa ou reconciliação virtual maciça da árvore nativa C++ do Fabric (que recebe os nodes de texto invisíveis das outras telas). A hipótese é que, removendo TODA a árvore consumidora (Substituindo AppContent por um <View> cego em P14MinimalConsumerTree) mas mantendo o GameProvider trabalhando a 4FPS/30x, o *memory leak* desaparecerá, isentando a arquitetura não-UI e provando que um (ou múltiplos) sub-componentes visuais da árvore React são os estopins do crash.

## 2. VARIÁVEL INDEPENDENTE
A presença dos consumidores visuais em React abaixo do GameProvider.
- A flag explícita P14_EXPERIMENT_MINIMAL_CONSUMER_TREE = true ativa a tela preta vazia mínima que não lê useGameState.

## 3. VARIÁVEIS CONTROLADAS
* Engine e Ticks (30x) continuam operando e processando ECS.
* GameProvider mantém seu *Polling* de 250ms normal.
* setGameState({...state}) permanece sendo chamado normalmente 4x por segundo com os objetos frescos do sistema de ECS.
* Todas as mecânicas persistentes estão inalteradas.

## 4. O QUE FOI REMOVIDO DA EXECUÇÃO
Com a flag P14 ativada, a árvore de retorno no App.tsx não invoca mais o NavigationContainer. Assim, as seguintes estruturas **nunca** chegam a ser instanciadas e reconciliadas:
* AppContent (que lia o estado)
* InGameShell
* O TabNavigator (MainTabs) com todas as telas pre-carregadas ocultas.
* MapScreen, SimulationCanvas, SkPaths, Overlays.
* TopHUD, TechScreen, DiplomacyScreen e seus nós de texto longos.

## 5. ÁRVORE ORIGINAL (Anterior)
`xml
<GameProvider>
  <NavigationContainer theme={EmpireTheme}>
    <AppContent>
      <InGameShell>
        <MainTabs />
        <TopHUD />
        ...
      </InGameShell>
    </AppContent>
  </NavigationContainer>
</GameProvider>
`

## 6. ÁRVORE EXPERIMENTAL (Atual)
`xml
<GameProvider>
  <P14MinimalConsumerTree />
</GameProvider>
`

## 7. CRITÉRIOS DE INTERPRETAÇÃO PASS/FAIL
O teste físico de 60 segundos com 30x de speed ditará a diretriz absoluta:
- **P14 PASSA SE:**
  O GameProvider manter seu report de providerUpdates ≈ 30/10s e 	icks ≈ 30/10s, porém o vazamento RssAnon/Native Heap despencar para virtualmente 0. Significa que a *Engine de Simulacão* está isenta. O Culpado está dentro dos Nodes visuais omitidos (Fabric/React Nodes/Text Nodes em abas escondidas). E assim exigirá-se o P15 para identificar *qual* tela oclui o erro.
- **P14 FALHA SE:**
  A memória RAM Native Heap continuar sua ascensão meteórica nas centenas de MB mesmo em tela preta (árvore vazia). Isto extinguirá a suspeita sob Reanimated/Skia/Fabric UI Tree, forçando uma auditoria da Engine C++ de hermes (GC não-colecionador do hermes-core) ou React state internals.

## 8. RESULTADO PENDENTE
[A PREENCHER MANUALMENTE]

## P14.1 — Speed Control Validation
O teste provará ativamente nos logs o controle cego da velocidade por meio do report de speed=30 atrelado diretamente ao state.meta.speedMultiplier no core da aplicação. 
A API GameSession.setSpeed(30) foi validada, garantindo a manipulação idêntica à UI sem recorrer a gambiarras de injeção ou *any*. Toda a árvore UI é bloqueada desde a raiz do App.tsx, extirpando sumariamente qualquer risco de nós invisíveis.
## P14.2 â€” Execution-State Correction

ApÃ³s uma rodada inicial de teste, observou-se atravÃ©s dos *logs* de instrumentaÃ§Ã£o (`P10Counters`) que o teste P14 foi executado em estado `paused` (ou seja, `ticks=0`), o que nÃ£o submete a interface cega da React Tree a nenhuma atualizaÃ§Ã£o efetiva de ECS. O comportamento Ã© esperado, uma vez que a sessÃ£o de jogo (`GameSession`) boota intencionalmente em `state.meta.paused = true` para aguardar a liberaÃ§Ã£o explÃ­cita da UI por parte do jogador, interface esta que foi removida em P14 (`P14MinimalConsumerTree`).

**A API CanÃ´nica de InÃ­cio**
Uma auditoria em `src/application/game-session.ts` revelou que a API real consumida pelos menus/botÃµes para tirar a *engine* da inÃ©rcia Ã© `GameSession.setPaused(paused: boolean)`.

**A IntervenÃ§Ã£o (AlteraÃ§Ã£o MÃ­nima)**
Para contornar o bloqueio visual do P14 e submeter o teste Ã  carga contÃ­nua sem depender da Ã¡rvore de `NavigationContainer`, a API canÃ´nica foi injetada logo apÃ³s a iniciaÃ§Ã£o da sessÃ£o e da configuraÃ§Ã£o de velocidade:
```typescript
newSession.start();
if (P14_EXPERIMENT_MINIMAL_CONSUMER_TREE) { 
  newSession.setSpeed(30); 
  newSession.setPaused(false); 
}
```

**CritÃ©rio de ProntidÃ£o (PrÃ³ximo Teste FÃ­sico)**
O prÃ³ximo teste serÃ¡ considerado vÃ¡lido apenas se a janela de sincronia do *log* (a cada 10s) imprimir a combinaÃ§Ã£o que atesta atividade lÃ³gica robusta sem atividade visual, como:
```text
speed=30 ticksâ‰ˆ30
p14Minimal > 0
mapHeavy=0
canvas=0
```

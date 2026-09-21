# P14 — CONSUMER TREE AUDIT (READ-ONLY)

## Mapeamento da Árvore abaixo do GameProvider

### Raiz da Árvore de Estado
O GameProvider provê GameContext.Provider.
Dentro do GameProvider, em App.tsx, temos o componente filho: AppContent.

### Consumer 1: AppContent
O próprio AppContent consome estado global:
`	sx
const { gameState } = useGameState();
`
Isso significa que **a cada emissão de tick do GameProvider, todo o AppContent re-renderiza.**

Se o AppContent re-renderiza, ele invoca seus filhos baseados no ppState.
Em modo de simulação, ele invoca:
`	sx
return <InGameShell />;
`

### InGameShell e Sub-Árvores
InGameShell renderiza:
`	sx
function InGameShell() {
  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <MainTabs />
      <TopHUD />
      <AscensionModal />
    </View>
  );
}
`

### MainTabs (NavigationContainer)
MainTabs declara as cinco telas bases.
A ausência de unmountOnBlur: true no Tab.Navigator implica que o React Native Navigation mantém a árvore virtual montada em background.

### Consumer 2..N: Telas do Sistema
- **MapScreen:** Consome useGameState via useUiStore() / internamente assina dependências.
- **TopHUD:** Consome const { session } = useGameState();
- **DiplomacyScreen:** Consome const { gameState, session, playerKingdomId } = useGameState();
- **TechScreen:** Consome const { gameState, session, playerKingdomId } = useGameState();
- **GovScreen / EstadoScreen:** Consome hooks que podem amarrar à atualização global, e está atrelada à renderização em cascata do Tab.Navigator (que foi acionado via AppContent).
- **SistemaScreen:** Semelhante; renderizado na inicialização e mantido no pool de rotas.

## Conclusão da Auditoria
Qualquer despacho de setGameState(state) faz disparar em cadeia:
1. AppContent
2. InGameShell (cascata passiva)
3. MainTabs (cascata passiva no container)
4. TopHUD (consumer ativo)
5. MapScreen, DiplomacyScreen, TechScreen, etc. (consumers ativos ou re-renderizados pela re-montagem de hooks contextuais).

Esta é uma árvore gigante de processamento que recria nós React virtuais pesados de texto e gráficos em background 4 vezes por segundo a cada novo Tick simulado, consistindo no pior cenário possível de ineficiência React.
## P14.1 — Speed Control Validation

Para que o experimento P14 fosse válido, era vital garantir que a simulação continuaria progredindo em **30x** mesmo sem o botão interativo da UI do TopHUD.

A auditoria direta do GameSession (src/application/game-session.ts) revelou o método oficial:
`	ypescript
setSpeed(multiplier: number): void {
  const state = this.requireState();
  state.meta.speedMultiplier = Math.max(0.5, Math.min(100, multiplier));
  // ...
  this.persistCurrent();
  this.emitState(true);
}
`
Este método muta matematicamente o speedMultiplier sem adulterar indevidamente a base de tempo da simulação, sendo a exata API despachada nativamente pelo botão 30x. 

Para acioná-lo de forma limpa, injetamos após o boot do GameProvider:
`	ypescript
newSession.start();
if (P14_EXPERIMENT_MINIMAL_CONSUMER_TREE) { 
  newSession.setSpeed(30); 
}
`
Isso garante a velocidade exigida de 30x, prescindindo inteiramente da UI e eliminando o antipadrão s any.

Para tornar essa velocidade fisicamente verificável, o relógio currentSpeed foi associado ao log a cada 10s via sincronicidade da engine, permitindo comprovar nos logs gerados pelo teste.

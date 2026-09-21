# P15-C.1 / C2 — TOPHUD MODAL SUBTREE ISOLATION

## 1. Hipótese
A falha catastrófica de memória (retenção progressiva confirmada nos vales pós-GC, +88MB no Native Heap/Unknown em 300s) observada no experimento P15-B.2 é causada **especificamente pela reconciliação de alta frequência (3x/s)** de 6 Views Hospedeiras Nativas do tipo <Modal> e de subcomponentes complexos como ScrollView/Text, os quais recebem novas instâncias de arrow functions (onClose) a cada frame lógico do TopHUD.

Se a hipótese estiver correta, remover apenas esses subcomponentes — mantendo o restante da UI do TopHUD reagindo a 3Hz — eliminará a retenção.

## 2. Condição Anterior (P15-B.2)
- TopHUD completo.
- Crescimento massivo de Unknown PSS / Native Heap.
- Modal/Tooltip instanciados.

## 3. Condição Anterior (P15-B.3)
- Sem TopHUD (Apenas AscensionModal).
- Estabilidade matemática confirmada (+2MB Native, +12MB PSS em 300s).

## 4. Variável Independente
Presença/ausência das instâncias de <AlertsDrawer>, <StabilityTooltip>, <TreasuryTooltip>, <PopulationTooltip>, <TerritoryTooltip> e <DevModeModal> na árvore retornada pelo TopHUD.

## 5. Árvore Original (P15-B.2)
\\\
GameProvider
 -> NavigationContainer
    -> AppContent
       -> InGameShell
          -> P15MinimalConsumerTree
          -> TopHUD
             -> View (Header principal)
             -> AlertsDrawer (Modal)
             -> StabilityTooltip (Modal)
             -> TreasuryTooltip (Modal)
             -> PopulationTooltip (Modal)
             -> TerritoryTooltip (Modal)
             -> DevModeModal (Modal)
\\\

## 6. Árvore C2
\\\
GameProvider
 -> NavigationContainer
    -> AppContent
       -> InGameShell
          -> P15MinimalConsumerTree
          -> TopHUD
             -> View (Header principal)
\\\

## 7. Componentes Removidos
Todos os 6 Modals listados acima foram explicitamente comentados do retorno de render do TopHUD.tsx.
Também foi removido o AscensionModal do App.tsx (que havia sido inserido no P15-B.3).

## 8. Componentes Mantidos
Todo o resto do TopHUD foi preservado intacto, incluindo:
- useGameState()
- Mapeamentos Zustand
- View containers
- TouchableOpacity buttons
- Lógica condicional e callbacks internos
- speed=30 e paused=false

## 9. Variáveis Controladas
- GameSession, TickPipeline, SimulationEngine intactos.
- Nenhuma otimização de React (sem React.memo, sem useCallback) foi adicionada.

## 10. Critérios de Decisão (Futuros)
**RESULTADO A: TopHUD sem seis Modals = STABLE**
- *Interpretação:* A sub-árvore de Modals/Tooltips é confirmada como a principal fonte do vazamento.

**RESULTADO B: TopHUD sem seis Modals = GROWING**
- *Interpretação:* O problema não é os Modals. O restante do TopHUD (textos, useGameState, estilos) está vazando.

**RESULTADO C: Crescimento reduzido, mas não eliminado**
- *Interpretação:* Vazamento distribuído entre Modal subtree e restante do TopHUD.

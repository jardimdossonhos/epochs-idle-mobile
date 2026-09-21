# P15 — CONSUMER TREE ISOLATION

## 1. EVIDÊNCIAS ANTERIORES E CORREÇÃO METODOLÓGICA
- **P1 ao P13:** O vazamento de *Native Heap* / *RssAnon* persisitiu mesmo quando o SimulationCanvas (Skia/Reanimated) teve seus *renders* zerados pelo bloqueio de React.memo (P12).
- **P14:** O bloqueio da árvore inteira, substituída desde o App.tsx por uma View mínima, isolou o consumidor primário. P14 funcionalmente confirmado, estabilidade de memória ainda não demonstrada quantitativamente nesta evidência.
- **Diferenciação de Lifecycle (P10 Evidence):** Contrário à premissa ingênua do React clássico de que ContextUpdates repintam a árvore inteira, os dados físicos do P10 registraram *mapRenders ≈ 30*, mas **Diplomacy/Tech/Gov = 0**. 
  Isso impõe a necessidade de separar:
  1. *Context update:* O consumer reage ao setGameState.
  2. *Render do consumer:* A função do consumer executa.
  3. *Render do filho:* O React Navigation blinda componentes inativos dependendo da implementação.
  4. *Reconciliation:* O React varre as props superficiais.
  5. *Montagem/Desmontagem:* Ciclo nativo de telas.
  6. *Trabalho Fabric/Native:* Repasses pela *bridge* de C++.

## 2. MATRIZ DE EXPERIMENTOS P15
Para isolar o causador do vazamento (se é o trabalho nativo do Fabric, a reconciliação pesada, ou um componente específico), testaremos em camadas. 

*Nota Semântica sobre Velocidade:* O relógio permanece forçado com speedMultiplier = 30. Considerando 	ickDurationMs = 10000, isso significa aproximadamente 3 *logical ticks* processados por segundo real. Portanto, a instrumentação ideal acusará **~30 ticks/10s** (e não 30x/s). O valor providerUpdates mede re-renders via bridge, e não ticks brutos por segundo.

| Experimento | Variável Independente | Ação de Código | Controle / Isolamento |
|---|---|---|---|
| **P15-A (AppRoot)** | Reconciliação do AppContent e NavigationContainer | O AppContent original é restaurado junto do NavigationContainer. Substitui-se APENAS o InGameShell pelo P14MinimalConsumerTree. | Mede exatamente: GameProvider + NavigationContainer + AppContent + Árvore Mínima. Isola telas do jogo. |
| **P15-B (HUD/Modals)**| Reconciliação sobreposta | Em InGameShell, substitui MainTabs por P14MinimalConsumerTree | Analisa se Modals/HUD vazam. |
| **P15-C (Navigation)**| Overhead do NavigationCore | Em MainTabs, troca os component={X} por P14MinimalConsumerTree | Testa o Fabric base sem rodar código de game screens. |
| **P15-D (Map)** | MapScreen pesada | Restaura apenas MapScreen original; demais continuam mínimas | Checa alocação do MapScreen sem as abas textuais. |
| **P15-E (Texto)** | Telas de texto/background | Restaura as tabs de texto progressivamente | Confirma o vazamento em telas estáticas e inativas. |

## 3. P15-A: DEFINIÇÃO EXATA
### A condição atual é estruturada exatamente como:
- <GameProvider>
  - <NavigationContainer>
    - <AppContent>
      - <P14MinimalConsumerTree>

*Nota:* O NavigationContainer permanece deliberadamente como parte do controle, mas encapsula apenas uma view nua desprovida de Telas de Jogos (InGameShell, MapScreen, SimulationCanvas, TopHUD NÃO são executados).

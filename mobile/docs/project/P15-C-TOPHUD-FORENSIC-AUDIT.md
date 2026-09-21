# P15-C — TOPHUD FORENSIC STRUCTURAL AUDIT
**STATUS: COMPLETED**
**AUDIT LOCK: ACTIVE (NO FIX, NO TEST)**

## FASE 1 — LEITURA INTEGRAL

**Arquivo:** src/ui/components/TopHUD.tsx

**Componentes Internos Identificados:**
1. AlertsDrawer
2. StabilityTooltip
3. TreasuryTooltip
4. BreakdownRow
5. PopulationTooltip
6. TerritoryTooltip
7. HexIcon
8. TopHUD (Default Export)
9. DevModeModal (Importado externamente)

**Hooks Utilizados:**
- useState: Controle de visibilidade de todos os Modals.
- useCallback: Apenas em handleLayout.
- useMemo: Em AlertsDrawer para ordenar/filtrar o feed.
- useGameState: Invocado diretamente no corpo de TopHUD e AlertsDrawer.
- useUIStore (Zustand): Invocado repetidas vezes para extrair primitive values em todos os componentes.
- useSafeAreaInsets: Para calcular o paddingTop.

**APIs Nativas / Reanimated:**
- **Nenhum** Reanimated (useSharedValue, useAnimatedStyle) é usado.
- **Componentes Nativos Padrão:** View, Text, TouchableOpacity, Pressable, ScrollView.
- **Modals:** 6 componentes Modal nativos são instanciados por padrão no final do render do TopHUD.

## FASE 2 — GRAFO REAL

A árvore exata no momento do render:

\\\
TopHUD
 ├─ View (container)
 │   ├─ TouchableOpacity (DevMode) [Condicional]
 │   ├─ View (singleRow)
 │   │   ├─ TouchableOpacity (Alerts)
 │   │   ├─ TouchableOpacity (Gold)
 │   │   ├─ TouchableOpacity (Population)
 │   │   ├─ TouchableOpacity (Regions)
 │   │   ├─ TouchableOpacity (Play/Pause)
 │   │   └─ TouchableOpacity (Stability)
 ├─ AlertsDrawer
 │   └─ Modal (visible={alertsVisible}) -> Pressable -> ScrollView
 ├─ StabilityTooltip
 │   └─ Modal (visible={stabilityVisible}) -> Pressable -> BreakdownRows
 ├─ TreasuryTooltip
 │   └─ Modal (visible={treasuryVisible}) -> Pressable -> BreakdownRows
 ├─ PopulationTooltip
 │   └─ Modal (visible={populationVisible}) -> Pressable -> BreakdownRows
 ├─ TerritoryTooltip
 │   └─ Modal (visible={territoryVisible}) -> Pressable -> BreakdownRows
 └─ DevModeModal
     └─ Modal (visible={isDevPanelVisible}) -> View -> ScrollView
\\\

### Tabela de Características dos Filhos
| Componente | Recebe Props? | usa GameState? | Possui Modal? | Invisível montado? | Cria callbacks por render? |
|---|---|---|---|---|---|
| TopHUD | Não | **SIM** | Não | N/A | **SIM** (6 arrow functions para os onCloses) |
| AlertsDrawer | Sim | **SIM** | **SIM** | SIM | Não (re-renderiza via Context) |
| StabilityTooltip | Sim | Não | **SIM** | SIM | Não (re-renderiza via parent props) |
| TreasuryTooltip | Sim | Não | **SIM** | SIM | Não (re-renderiza via parent props) |
| PopulationTooltip | Sim | Não | **SIM** | SIM | Não (re-renderiza via parent props) |
| TerritoryTooltip | Sim | Não | **SIM** | SIM | Não (re-renderiza via parent props) |
| DevModeModal | Sim | **SIM** | **SIM** | SIM | SIM (handlers internos) |

*(Nota: "Invisível montado" refere-se ao React Element do Modal estar sempre na árvore principal do React, recebendo \isible={false}\ e reconciliando propriedades nativas).*

## FASE 3 — USAGE DE GAMESTATE

**Contexto:** GameProvider provê um value formatado como alue={{ gameState, session, ... }}.
A cada tick lógico do ECS (aproximadamente 3 vezes por segundo nos testes), o GameProvider despacha um novo state reference.

**Consumidores no TopHUD:**
1. TopHUD: 
   - Invoca: const { session } = useGameState();
   - O que lê: session.devModeActive
   - **Mecanismo Causador:** Como a referência do objeto literal do Context muda, **o TopHUD re-renderiza inteiro a cada tick (3 updates/s)**, mesmo que a referência session seja estável.
2. AlertsDrawer:
   - Invoca: const { session } = useGameState();
   - **Mecanismo Causador:** Também re-renderiza 3 vezes por segundo pelo mesmo motivo.
3. DevModeModal:
   - Invoca: const { gameState, session } = useGameState();
   - **Mecanismo Causador:** Também re-renderiza 3 vezes por segundo.

**Conclusão de Fase 3:** A montagem raiz do TopHUD e as passagens de Context resultam em **toda a estrutura descrita na Fase 2 ser reconciliada a cada atualização lógica do jogo**, quebrando o isolamento de UI.

## FASE 4 — IDENTIDADE DE PROPS

Nas chamadas dentro do TopHUD:

\\\	sx
<AlertsDrawer visible={alertsVisible} onClose={() => setAlertsVisible(false)} />
<StabilityTooltip visible={stabilityVisible} onClose={() => setStabilityVisible(false)} />
// etc...
\\\

Para **CADA UM dos 6 Modals**:
- isible: **STABLE** (primitiva boolean).
- onClose: **DEFINITELY NEW EACH RENDER** (arrow function recriada no corpo do TopHUD).

**Conclusão:** Nenhum dos tooltips possui React.memo(). Devido ao onClose ser uma função nova a cada 333ms, **o React re-renderiza o componente filho**. O filho (Tooltips) então recria o elemento <Modal>, forçando o Fabric a reconciliar os event handlers (onRequestClose) na camada C++ do JSI 3 vezes por segundo para 6 instâncias de RCTModalHostView.

## FASE 5 — COMPONENTES SUSPEITOS

O foco da suspeita cirúrgica deve recair sobre a combinação de 3 fatores:

1. **useGameState() sem seletor no TopHUD:** Acarreta na invalidação da árvore inteira no mesmo ritmo da simulação.
2. **Arrow functions não memoizadas (onClose)**: Propagam a invalidação aos componentes Modal.
3. **Seis (6) Elementos <Modal> simultâneos recebendo atualizações de props a ~3Hz**:
   - No React Native (especialmente no Fabric), o componente Modal é uma host view pesada que cria uma janela (Dialog) paralela no sistema operacional Android.
   - Atualizar callbacks JSI (onRequestClose) frequentemente numa ViewRoot pendente/invisível pode enfileirar comandos na UIManager que não são processados a tempo, ou que alocam closures anônimas (Unknown PSS) que o GC não coleta.

## FASE 6 — EXCLUSÃO CAUSAL

Baseado na Matrix de testes físicos anteriores:

- **TopHUD ASSOCIATED WITH PHENOMENON:** **CONFIRMED** (P15-B.2 vs P15-B.3 isolou este fato matematicamente).
- **AscensionModal ASSOCIATED WITH PHENOMENON:** **REFUTED** (Apenas consumiu \useGameState()\ devolvendo \
ull\ e resultou em perfil STABLE).
- **\useGameState()\ sozinho é suficiente para leakar:** **REFUTED** (AscensionModal também usa, re-renderiza a ~3Hz, mas sem árvore complexa de Modals, não leaka).
- **Mecanismo Fabric (Atualização de Props de Host Components pesados como Modal):** **PLAUSIBLE** (Única grande diferença entre TopHUD e AscensionModal).
- **Mecanismo JSI (Closures de Arrow Functions):** **PLAUSIBLE**.

## FASE 7 — MATRIZ EXPERIMENTAL PROPOSTA

NÃO INICIAR NENHUM DESTES TESTES AUTOMATICAMENTE.

- **C1: TopHUD sem useGameState (Apenas Zustand)**
  - Isola se a remoção do trigger de render no Parent já resolve 100% do leak, provando que Modals em si não vazam a menos que torturados a altas frequências.
- **C2: TopHUD com useGameState, mas com todos os 6 Modals comentados.**
  - Isola se a reconciliação dos Modals invisíveis no Fabric é a vilã, ou se re-renderizar Textos e Botões normais 3x/s também vaza.
- **C3: TopHUD com useGameState, Modals ativos, mas React.memo() + useCallback aplicados.**
  - Testa se a barreira de identidade do React protege o Fabric do leak.

A auditoria recomenda **C2** como o próximo passo mais discriminatório, seguido da implementação de **C1** como conserto arquitetural permanente.

## FASE 8 — CONTROLE DE METODOLOGIA
- As taxas de disparos foram reportadas como **3 updates/s** (providerUpdates) e NÃO 30 FPS.
- Unknown PSS é tratada apenas como categoria opaca do Android. Sem extrapolações assumidas de HostObjects neste momento.

## FASE 9 — INTEGRIDADE DOS EXPERIMENTOS ANTERIORES
- **P15-B.2:** O baseline 0s e os 300s de amostragem ocorreram numa janela selada isolada sem AscensionModal. O APK não requereu recompilação nativa profunda (JS via Metro bundle) mantendo o processo idêntico. PM clear ocorreu perfeitamente antes do AUDIT-BOOT.
- **P15-B.3:** TopHUD removido corretamente na root. Recompilação via \ssembleDebug\ efetuada. Logcat e baselines capturados após \	icks > 0\. Comportamento chancelado como STABLE inequivocamente (+14MB em 300s).

## FASE 10 — FINAL
Resumo factual finalizado e listado acima.
NENHUM ARQUIVO MODIFICADO NESTA SESSÃO.
- CONFIRMADO: NO FIX APPLIED.
- CONFIRMADO: NO PHYSICAL TEST EXECUTED.
- CONFIRMADO: NO FUTURE EXPERIMENT EXECUTED.

# P12 — EXPERIMENTO CAUSAL ISOLADO: React.memo NO SIMULATIONCANVAS

## 1. ESTADO BASELINE
- **P6.11 (Render propagation block):** OFF (RENDER_EXPERIMENT_DISABLE_STATE_PROPAGATION = false)
- **P8 (Reanimated diff block):** OFF (P8_EXPERIMENT_DISABLE_MAP_REANIMATED_DIFF = false)
- **Render Propagation:** ON (GameState propaga 4x/segundo para o UI Thread)
- **runOnUI:** ON (Fronteira Native intacta)

## 2. AUDITORIA DE PROPS (SimulationCanvas)
Antes da intervenção, auditaram-se as props recebidas pelo SimulationCanvas:
| Prop | Tipo | Origem | Estabilidade (Object.is) |
| --- | --- | --- | --- |
| egionOwner | SharedValue<Int32Array> | useSharedValue | **ESTÁVEL** |
| currentArmyData | SharedValue<Float32Array> | useSharedValue | **ESTÁVEL** |
| lastArmyData | SharedValue<Float32Array> | useSharedValue | **ESTÁVEL** |
| mapUpdateTrigger | SharedValue<number> | useSharedValue | **ESTÁVEL** |
| 	ickProgress | SharedValue<number> | useSharedValue | **ESTÁVEL** |
| hexStructures | SharedValue<Int32Array> | useSharedValue | **ESTÁVEL** |
| structureUpdateTrigger | SharedValue<number> | useSharedValue | **ESTÁVEL** |
| dispatchCommand | Function | Global Constant (NOOP_DISPATCH) | **ESTÁVEL** |
| playerFactionId | 
umber | Zustand Store | **ESTÁVEL** (Primitivo) |
| capitalHexId | 
umber \| undefined | Cálculo derivado | **ESTÁVEL** (Primitivo) |

**Conclusão da Auditoria:** Todas as *props* injetadas em SimulationCanvas são primitivos (comparam estritamente iguais se o valor não mudar) ou referências perfeitamente estáveis (SharedValue e constantes globais). O vazamento ocorria puramente porque a ausência estrutural de React.memo forçava o React a re-avaliar a árvore JSX cega do Canvas a cada setGameState do pai.

## 3. A ALTERAÇÃO (A Variável Experimental)
Aplicou-se exclusivamente o HOC memo padrão (sem comparador customizado) encapsulando o orwardRef em src/ui/components/map/simulation-canvas.tsx:
`	sx
export const SimulationCanvas = memo(forwardRef<SimulationCanvasRef, SimulationCanvasProps>(({ ... }, ref) => { ... }));
`
Nenhuma dependência ou array [] foi injetado nos useDerivedValue de Reanimated. Nenhuma outra tela ou sistema nativo foi alterado.

## 4. COLETA FÍSICA (A PREENCHER)
O teste exigirá 60 segundos de observação cega (sem toques) a 30x velocidade no AVD Pixel_8.
- **SimulationCanvas renders / 10s (Antes):** ~23 a 30
- **SimulationCanvas renders / 10s (Depois):** [PREENCHER]
- **Micro overlays / 10s (Antes):** ~899 a 930
- **Micro overlays / 10s (Depois):** [PREENCHER]
- **Native Heap PSS Δ/minuto (Antes):** ~17 MB/s -> +1.02 GB/min
- **Native Heap PSS Δ/minuto (Depois):** [PREENCHER]

## 5. INTERPRETAÇÃO CAUSAL ESPERADA
- **Se SimulationCanvas renders cair para 0 e o Native Heap estagnar (Resultado A):** Estará provado, sem margem para dúvida estrutural, que a recriação implícita de Worklets em Reanimated (HostObjects) via renders espúrios do React Navigation era o mecanismo isolado de sangria da Memória C++.
- **Se SimulationCanvas renders cair para 0 mas o Leak persistir (Resultado B):** A sangria nativa é agnóstica à árvore React, forçando uma auditoria imediata dos nós Skia alocados globalmente ou do GC Hermes.
- **Se SimulationCanvas renders não cair (Resultado C):** A estabilidade das props falhou em runtime, exigindo rePropsEqual customizado.

## 6. PRÓXIMO PASSO DISCRIMINATÓRIO
Realizar o teste físico, preencher os contadores de render/PSS deste relatório, e com base no descarte, adotar a correção oficial definitiva (dependency arrays [] para useDerivedValue + unmountOnBlur) ou iniciar o isolamento estrito de JSI/Skia.

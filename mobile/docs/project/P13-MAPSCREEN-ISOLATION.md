# P13 — MAPSCREEN ISOLATION CAUSAL EXPERIMENT

## 1. HIPÓTESE
O experimento P12 comprovou que proteger <SimulationCanvas> com React.memo derruba os renders das camadas internas (Canvas e Overlays) e do unOnUI para 0. Entretanto, a sangria da *Native Heap* persistiu em magnitude substancial. 
A nova hipótese central a ser desmentida ou confirmada é que o vazamento não está nas camadas de Canvas Skia/Reanimated, mas sim no **corpo do componente MapScreen em si**, que, devido à ausência de blindagem de estado (P6.11 OFF) continua sendo invocado 4 vezes por segundo e gerando *arrays* locais (
ew Int32Array(320000), Float32Array), consumindo *SharedValues* e chamando _hooks_ agressivos.

## 2. VARIÁVEL INDEPENDENTE
Corpo do MapScreen.
O componente principal servirá o subcomponente pesado (MapScreenHeavyContent) ou um renderizador neutro (MapScreenMinimal) dependendo da chave P13_EXPERIMENT_MINIMAL_MAPSCREEN.

## 3. ESTADO P12
- P6.11 State Propagation = **ON** (Vazamento acionado pelo Context)
- P8 Reanimated Diff = **ON** (Caminho natural de JSI liberado)
- P12 React.memo Canvas = **ON** (Evita que recriação de overlays maculem o teste)

## 4. ALTERAÇÃO P13
Foi adicionada a chave P13_EXPERIMENT_MINIMAL_MAPSCREEN = true para rotear a montagem.
* Se 	rue, retorna MapScreenMinimal vazio com um *text placeholder*.
* Se alse, retorna MapScreenHeavyContent contendo toda a lógica original intacta.

## 5. OPERAÇÕES REMOVIDAS DA EXECUÇÃO
Com a interface minimalista acionada, as seguintes operações originais deixam de ser processadas a cada 250ms:
* Declaração de 
ew Int32Array(320000) e suas contrapartes flutuantes em useSharedValue.
* Subscrições pesadas do *Zustand* (uiStore).
* Cálculos derivativos da Capital.
* Disparo dos efeitos useEffect e useAnimatedReaction de rastreio da Câmera.
* Invocação do JSX de todo o ecossistema <SimulationCanvas>.

## 6. OPERAÇÕES MANTIDAS
* As 4 chamadas de re-render advindas do GameProvider por segundo.
* TickPipeline, SimulationEngine e GameSession.

## 7. CRITÉRIOS DE INTERPRETAÇÃO PASS/FAIL
Após o teste físico de 60 segundos com 30x de speed:
- **RESULTADO A:** Se o Native Heap estabilizar, é evidência fortíssima de que o leak encontra-se na pesada alocação interna e/ou no descarte falho de SharedValues/Arrays do MapScreen.
- **RESULTADO B:** Se a Native Heap mantiver a mesma taxa destrutiva, provamos que o React Native em si, o *Hermes* ou o *Fabric/Context* estão vazando lixo nativo sob o teto do GameProvider, isentando a UI do MapScreen.
- **RESULTADO C:** Se diminuir substancialmente (mas não zerar), há vazamento distribuído.

## 8. RISCOS METODOLÓGICOS
O corte agressivo da interface no MinimalScreen impossibilita o uso tátil (toques e menus). O teste deve ser cego e puramente guiado pelo tempo decorrido, garantindo 60 segundos de inatividade absoluta de hardware em 30x Speed, lendo a agregação assíncrona da janela de 10s P10.

## 9. RESULTADO APÓS TESTE FÍSICO
[A PREENCHER MANUALMENTE APÓS TESTE]

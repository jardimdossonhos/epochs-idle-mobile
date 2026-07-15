# Original User Request

## Initial Request — 2026-07-06T18:15:36Z

Melhorar a usabilidade e a experiência Idle do jogo Epochs Idle: restringir a exibição do HUD principal (TopHUD) exclusivamente à tela do Mapa para evitar sobreposições, e criar uma interface interativa de Automação (Modo Idle) com controles para gerenciar Economia, Religião, Defesa e um controle mestre para automatizar tudo.

Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile
Integrity mode: development

## Requirements

### R1. Restrição do TopHUD
O componente TopHUD (que exibe ano/mês, ouro, população, etc.) não deve mais ser global. Ele deve estar visível **apenas** quando o jogador estiver visualizando a aba do Mapa (MapScreen). Nas demais telas (Settings, Menu, etc.), o TopHUD deve ser ocultado para evitar sobreposição de elementos da interface.

### R2. Controles do Modo Idle (Automação)
Criar a interface visual para o jogador ativar/desativar a automação do reino na aba "Menu" existente. O jogador deve ter acesso a botões (toggles) claros para:
- Automatizar Economia
- Automatizar Religião
- Automatizar Defesa Militar
- Mestre: Ativar/Desativar todas as automações de uma vez.
Quando ativados, o motor do jogo (via `game-session` or sistemas equivalentes já existentes) assumirá o controle dessas áreas.

## Acceptance Criteria

### R1. Restrição do TopHUD
- [ ] Navegar para telas diferentes do Mapa (ex: Configurações, Menu) deve ocultar completamente o TopHUD.
- [ ] Ao retornar para a tela do Mapa, o TopHUD deve reaparecer corretamente, mantendo seu estado visual sincronizado.

### R2. Controles do Modo Idle
- [ ] A interface deve apresentar botões independentes para Economia, Religião e Defesa.
- [ ] Deve existir um botão mestre que ativa/desativa os três sub-botões simultaneamente.
- [ ] O estado visual dos botões deve refletir fielmente o estado da automação no GameState da engine.

## Follow-up — 2026-07-07T12:19:52Z

O objetivo deste sprint é corrigir severos bugs no motor de simulação de IAs (Engine) e no relógio do jogo Epochs Idle, além de implementar interatividade rica, sistema de zoom e a mesclagem inteligente de polígonos territoriais no Mapa do Mundo.

Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile
Integrity mode: development

## Requirements

### R1. Correções Críticas do Motor de Simulação e Vida das IAs
- Investigar e corrigir a igualdade de métricas relacionais entre o jogador e as IAs (a diplomacia deve funcionar de forma independente e não-espelhada).
- Corrigir a inatividade das IAs. Elas devem buscar ativamente ocupar novos territórios (expansão) dependendo das suas personalidades (arquétipos).
- Consertar a ausência de personagens na Corte (o jogo passa de 20 anos e os candidatos não são exibidos).
- Corrigir o bug que congela o relógio/motor do jogo quando se inicia um Novo Jogo (atualmente ele só avança corretamente após um save ser carregado).

### R2. Feedback de Construções
- A construção de Mercados e Fortalezas não dá feedback atual.
- Deve ser incluída uma barra de tempo/progresso no Painel da Região e, quando a obra for finalizada, um ícone da respectiva construção deve aparecer posicionado sobre o hexágono no Mapa.

### R3. Interatividade e Zoom no Mapa
- Todos os territórios do mapa devem se tornar clicáveis.
- O jogador deve ter a capacidade de fazer Zoom In/Zoom Out (aproximar e afastar) livremente no Mapa.

### R4. Mesclagem Dinâmica de Territórios (Mega-Polígonos)
- Os territórios contíguos controlados por um mesmo dono (Reino) devem se fundir visualmente, eliminando as bordas divisórias internas e parecendo uma única mancha de terra contínua.
- Deve haver um botão ("toggle") no mapa que permita alternar a visualização entre essa nova "Visão de Reinos Mesclados" e a "Visão Clássica por Hexágonos".
- Ao clicar em uma área de território mesclado, os dados exibidos no painel devem ser o **total** dos recursos somados de todos os seus hexágonos internos.
- Se o jogador solicitar a construção de uma estrutura na Visão Mesclada, o próprio sistema alocará automaticamente a construção no hexágono mais estratégico/vazio daquela massa de terra.

### R5. Alteração do Gatilho do DevMode
- O atual modo de desenvolvedor (5 cliques no título) deve ser movido. A nova forma de ativação será dar 5 cliques na palavra "Epochs Idle" localizada abaixo da palavra "Configurações" na aba de Configurações (Settings).

## Acceptance Criteria & Verification

### Verificação Obrigatória do Motor (O Teste dos 2000 Anos)
A equipe deve obrigatoriamente criar e rodar um script de teste programático que simule o avanço ininterrupto de 2000 "anos" no motor do jogo sem interfaces (`headless`).
- [ ] O teste não pode apresentar travamentos (freezes) no loop principal.
- [ ] O log do teste deve registrar e provar matematicamente que IAs conquistaram hexágonos vazios de maneira independente.
- [ ] O log deve provar que Eras e Tecnologias foram desbloqueadas nos períodos corretos do avanço de tempo ao longo desses 2000 anos.
- [ ] O teste deve validar se métricas diplomáticas variaram diferentemente entre reinos ao invés de se copiarem.
- [ ] O log deve comprovar que NPCs cortesãos foram gerados e anexados às facções.

### UI e Interface do Mapa
- [ ] O mapa obedece a gestos/controles de escala (Zoom).
- [ ] Os territórios vizinhos de mesma posse formam polígonos lisos sem divisórias internas por padrão.
- [ ] Clicar num território consolidado exibe a soma dos atributos (ouro/população/defesa) no painel.
- [ ] É possível alternar para a visão fragmentada clássica via botão.
- [ ] O Painel de Região exibe o progresso temporal quando uma nova construção é iniciada.
- [ ] O DevMode apenas é ativado via 5 cliques no texto de rodapé das Configurações.

## Follow-up — 2026-07-09T19:12:14Z

O projeto visa corrigir bugs críticos de usabilidade e performance no Epochs Idle (otimização profunda do motor para x30, conserto do fluxo de spawn e autosave, refinamento da visibilidade da IA no mapa), realizar uma varredura do código atual para o GDD e implementar um sistema revolucionário de Diplomacia Dinâmica com LLM.

Working directory: c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile
Integrity mode: development

## Requirements

### R1. Respeito à Seleção de Território (Universal)
Garantir que a Região escolhida pelo jogador na tela de criação de personagem seja rigorosamente respeitada na geração do mapa. Isso deve funcionar independentemente da forma de login (Google, Guest ou Mock).

### R2. Otimização de Performance (Velocidade x30)
Aplicar engenharia de software avançada no loop principal da engine para que a velocidade x30 rode de forma "lisa". Isso deve envolver cálculos inteligentes e/ou desacoplamento (ex: pular frames visuais em altas velocidades) para evitar que a UI congele.

### R3. Correção de Visibilidade do Autosave
Investigar o porquê de o salvamento automático não estar sendo lido e exibido na lista de saves, garantindo que o "Slot Autosave" persista e apareça corretamente no menu de load.

### R4. Revisão Visual e Lógica do Play/Pause
Assegurar que o botão de Play/Pause da interface seja responsivo e reflita sem delay o estado atual da engine.

### R5. Documento de Progressão do Código Atual
Criar um arquivo `progression_design.md` na raiz do projeto realizando uma varredura das matemáticas e regras presentes **hoje** no código, revelando a linha do tempo, eras funcionais e gargalos reais.

### R6. Aleatoriedade e Personalidade das IAs
Garantir que os reinos NPCs gerem características aleatórias (nomes, opções) e assegurar que as IAs possuam perfis de jogabilidade distintos baseados no código existente.

### R7. Visibilidade Plena no Modo Desenvolvedor (Fog of War)
Ao desativar a Névoa de Guerra no DevMode, todos os outros jogadores (IAs) devem se tornar imediatamente visíveis no mapa múndi.

### R8. Perfil de Soberanos IA e Diplomacia via Chat (LLM)
Ao interagir com a Diplomacia, o jogador deverá ver o perfil completo do Soberano da IA escolhida (com foto dinâmica gerada respeitando cultura, gênero e fenótipo do NPC). Nessa janela, deverá existir um **Chat interativo**. Se a API de LLM estiver configurada, o NPC irá conversar com o jogador adotando sua personalidade. Dependendo do rumo da conversa (ofensas, propinas, negociações), o LLM deve poder **engatilhar chamadas de sistema** para forçar ações na engine do jogo (ex: a IA declara guerra, propõe paz, sela acordos de cooperação) sem intervenção de botões da UI.

## Acceptance Criteria

### Performance e UI
- [ ] A engine roda em velocidade x30 continuamente sem travar a interface.
- [ ] O botão Play/Pause alterna instantaneamente sem atraso visual.

### Lógica de Jogo
- [ ] Iniciar um jogo coloca o jogador na exata região selecionada na tela.
- [ ] Fechar o app gera um Autosave que **aparece com sucesso** no menu de carregamento.
- [ ] Desativar o Fog of War no DevMode revela as fronteiras das IAs no mapa.

### Diplomacia Avançada
- [ ] A tela de Diplomacia exibe a foto do Soberano NPC compatível com sua cultura e gênero, além de seus dados governamentais.
- [ ] Há um painel de Chat na Diplomacia capaz de enviar e receber mensagens de uma API de LLM.
- [ ] A IA responde interpretando o estado do jogo e pode executar comandos na engine (declarar guerra, fazer paz) de forma autônoma através do diálogo.

### Documentação
- [ ] O arquivo `progression_design.md` espelha rigorosamente as variáveis e regras da base de código atual.

## Follow-up — 2026-07-10T10:46:22Z

O servidor foi reiniciado e a cota da API foi restaurada. Por favor, retome a orquestração da Sprint 3 e reviva os orquestradores (Project Orchestrator, E2E Testing e Implementation Track) para continuarem a execução das tarefas R1 a R8.

## Follow-up — 2026-07-10T11:08:11Z

A cota foi restaurada. Por favor, retome imediatamente a Sprint 3. Reviva os sub-orquestradores (Project Orchestrator, E2E Track e Implementation Track) e conclua todas as tarefas pendentes (R1-R8). Prioridade máxima para: R1 (Spawn Universal), R2 (Performance x30), R7 (Fog of War DevMode) e R8 (Perfil Soberano IA + Chat LLM). A parte de personalidades das IAs (R6) já começou a ser implementada — não refazer o que já foi feito, apenas continuar.

## Follow-up — 2026-07-13T14:44:33Z

Cota restaurada após alguns dias. Por favor, retome imediatamente a Sprint 3. Reviva os sub-orquestradores (Project Orchestrator, E2E Track e Implementation Track) e finalize todas as tarefas pendentes. Prioridade: R1 (Spawn Universal — jogador sempre nasce na região escolhida), R5 (GDD de Progressão — documento baseado no código real), R7 (Fog of War no DevMode — IAs visíveis ao desativar névoa) e R8 (Perfil Soberano IA + Chat LLM na tela de Diplomacia). R2 (Performance x30) e R6 (personalidades das IAs) já foram parcialmente implementados — não refazer o que já foi feito, apenas continuar e concluir.

## Follow-up — 2026-07-13T20:59:22Z

Cota de API restaurada e servidor reiniciado. Por favor, reviva os orquestradores da Sprint 3 e conclua as pendências: R1 (Spawn Universal), R5 (GDD de Progressão baseado no código), R7 (Fog of War no DevMode) e R8 (Perfil Soberano + Chat LLM na Diplomacia).

## Follow-up — 2026-07-14T16:11:05Z

O Antigravity foi fechado e todos os agentes pararam. O servidor foi reiniciado. Por favor, retome imediatamente a Sprint 3 e conclua TODAS as tarefas pendentes. Status atual: iteração 1/32, ainda faltam R1 (Spawn Universal), R5 (GDD baseado no código real), R7 (Fog of War no DevMode) e R8 (Perfil Soberano IA + Chat LLM na Diplomacia). Reviva os sub-orquestradores E2E Track e Implementation Track e finalize os trabalhos.

## Follow-up — 2026-07-14T16:24:27Z

Atenção: Os relatórios mostram que nenhum arquivo foi modificado desde 13/07. A equipe está em análise há muito tempo. Por favor, PARE de analisar e COMECE a implementar imediatamente. Instrua os sub-orquestradores a:

1. **Implementation Track**: Implementar R1 agora — corrigir o fluxo de spawn no TerritorySelectStep.tsx e CharacterCreationScreen.tsx para garantir que a região escolhida seja sempre respeitada, independente do modo de login.
2. **Implementation Track**: Implementar R7 — corrigir a visibilidade das IAs no mapa quando Fog of War é desativado no DevMode (WorldMapSkia.tsx ou equivalente).
3. **Implementation Track**: Implementar R5 — criar o arquivo progression_design.md auditando matematicamente o código atual.
4. **Implementation Track**: Finalizar R8 — conectar o chat LLM ao game-session.ts para que respostas do Gemini possam disparar ações reais (guerra, paz, acordos).

Chega de análise. Executem as modificações nos arquivos agora.

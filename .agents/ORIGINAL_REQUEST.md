# Original User Request
## 2026-06-26T12:40:40Z
# Teamwork Project Prompt — Launched
> Status: Launched
> Goal: Execute the multi-agent teamwork system to finish Epochs Idle version 1.0

Concluir o desenvolvimento do jogo "Epochs Idle" entregando uma versao 1.0 funcional, respeitando estritamente a ideia e o tema original definido para o projeto (jogo incremental historico medieval com mecanicas de grand strategy). A equipe de agentes tem autonomia para definir o escopo ideal das telas faltantes (Corte, Administracao, Multi-saves) para que o jogo fique polido e sem erros (bug-free).

Working directory: C:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle
Integrity mode: benchmark

## Requirements

### R1. Interface Completa e Polida
Todas as abas da interface (Corte, Administracao, Tecnologia, Diplomacia, Mapa) devem estar implementadas e funcionais, respondendo as acoes do jogador sem travamentos ou crash.

### R2. Sistema de Multiplos Saves
O jogador deve conseguir salvar o jogo em diferentes slots (multi-save) e escolher qual jogo carregar atraves de uma interface de listagem, abandonando o metodo de recarregar o aplicativo inteiro.

### R3. Performance e Estabilidade (Bug-Free)
Eliminar qualquer erro de console, travamento de UI e falhas de inicializacao. A performance deve ser otimizada para evitar re-renderizacoes pesadas da arvore React durante o "tick" do motor do jogo (1000ms).

## Acceptance Criteria

### Completude da UI
- [ ] Ao navegar por todas as abas no menu inferior, nenhuma tela exibe estado vazio indesejado, mensagens de "em construcao" ou quebra com erros.
- [ ] As interacoes na UI (alterar velocidade, modificar impostos, pesquisar tecnologias, interagir com a Corte) invocam os metodos correspondentes da GameSession e refletem as mudancas no estado do jogo.

### Sistema de Saves
- [ ] A tela de menu principal exibe um botao "Carregar Jogo" que abre uma lista dos saves disponiveis, mostrando detalhes basicos de cada um.
- [ ] O jogador pode clicar em um save na lista e o estado do jogo e restaurado na mesma sessao activa, refletido instantaneamente na UI sem precisar recarregar o app.

### Performance e Ausencia de Erros
- [ ] A execucao do jogo com o React Native/Expo roda de maneira limpa no console, sem apresentar avisos de telemetria, erros de conexao ou SQLITE_FULL.
- [ ] A interface responde prontamente aos cliques do usuario, indicando que a thread principal nao esta sendo bloqueada pelo motor do jogo.

## 2026-06-29T16:33:30Z
# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Implementar a totalidade do Master Roadmap para o jogo Epochs Idle, deixando-o com qualidade profissional e 100% finalizado para publicação na Google Play Store. O trabalho abrange desde a interface de Onboarding, passando pela tela do Mundo, Modo Idle, integração de IA para eventos vivos, e autenticação profissional de usuários.

Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle
Integrity mode: development

## Requirements

### R1. Onboarding Comercial e Login Google (Epic 1)
Implementar autenticação via Google Sign-In (Login com Conta do Google) para identificação do jogador. Em seguida, criar o Menu Principal completo (Novo/Carregar Jogo) e um fluxo de Criação de Personagem com inserção de Nome, escolha entre 9 Culturas (com suporte a fallback offline do avatar no DiceBear), sistema de Point Buy para Atributos e escolha do território inicial no mundo.

### R2. Mapa Vetorial Interativo 2D (Epic 2)
Criar uma interface principal de Mundo utilizando SVG nativo, focando em um estilo visual premium (clássico como Crusader Kings ou War). O mapa deve apresentar *Fog of War* e ser clicável para inspecionar reinos, exércitos e exibir dados em tempo real vindos da Engine.

### R3. Modo Idle Supremo (Epic 3)
Implementar o Painel de Diretrizes Governamentais. O jogador deve ter a opção de ditar o foco do reino (ex: Focar em Ouro, Expandir, Paz) e a IA administrativa deve automatizar o loop do jogo emitindo ordens de construção, diplomacia e recrutamento baseando-se no orçamento, permitindo jogar de forma passiva (total ou parcialmente).

### R4. Vida e Imersão via IA na Nuvem (Epic 4)
Integrar o jogo com a API do Gemini (mantendo 100% de funcionalidade offline caso falhe). A IA será usada para injetar textos gerados dinamicamente nos eventos do jogo, falas hiper-realistas para líderes inimigos (ameaças, alianças) com base no estado do ECS, transformando os números da tela em um mundo literário envolvente.

## Acceptance Criteria

### Verificação do Agente-Juiz (Agent-as-Judge) e Testes
O projeto será considerado completo quando um agente auditor revisar o código final e verificar:
- [ ] O fluxo de inicialização exige/suporta login do Google de forma funcional ou simulada via botões corretos na UI.
- [ ] O fluxo do Menu não apresenta nenhuma "tela preta", guiando o usuário suavemente até a tela do mapa com os dados configurados.
- [ ] O Mapa Vetorial foi renderizado com os paths das regiões atrelados à `GameSession` e reage a interações (Cliques).
- [ ] A arquitetura do Modo Idle foi conectada ao loop de simulação, processando e alocando recursos de forma autônoma baseada em diretrizes ligadas ou desligadas.
- [ ] A integração LLM possui uma camada robusta de Fallback (para não travar o jogo offline) e está conectada aos `EventBus` para interceptar negociações diplomáticas.
- [ ] O build final do React Native para Android não gera erros críticos.


## 2026-07-02T18:47:58Z

Overhaul the existing Skia-based World Map in Epochs Idle to include multiple visualization modes (Political, Religion, Economy, Military) and implement a Fog of War system.

Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle
Integrity mode: development

## Requirements

### R1. Map View Modes (Filtros de Mapa)
Implementar uma interface na tela do mapa com Botões Flutuantes (Floating Action Buttons) laterais para alternar entre diferentes modos de visualização:
- **Político**: Exibe as fronteiras e cores dos reinos e suas relações diplomáticas.
- **Religião**: Colore as regiões baseado na religião dominante.
- **Economia**: Destaca visualmente as regiões mais prósperas e rotas comerciais (se houver).
- **Militar**: Mostra a distribuição de tropas e zonas de guerra ativas.

### R2. Fog of War (Névoa de Guerra)
Implementar um sistema de Névoa de Guerra no motor gráfico do mapa (Skia). Regiões que não pertencem ao jogador e não são adjacentes às suas fronteiras (ou de aliados) devem ficar escurecidas/desaturadas (o jogador vê a geografia do terreno, mas não vê cores de posse, tropas ou dados táticos).

## Acceptance Criteria

### Verificação do Agente-Juiz
- [ ] A tela do mapa exibe os botões flutuantes para alternar entre os 4 modos descritos.
- [ ] A alteração do modo reflete instantaneamente nas cores (shaders/paths) do `WorldMapSkia` sem quebrar o panning infinito.
- [ ] O Fog of War escurece/remove dados de regiões fora do raio de visão do império do jogador, mas o oceano/formato do mapa continua visível.
- [ ] A interface e o motor não apresentam queda drástica de FPS (o React Native Skia deve continuar fluído).

## 2026-07-03T09:12:18-03:00

# Teamwork Project Prompt — Epoch Idle Quality Sprint

Corrigir 6 problemas de qualidade e bugs no jogo mobile Epochs Idle (React Native + Expo), incluindo: troca de login na tela principal, internacionalização em PT-BR, correção da exibição do relógio de jogo, correção do autosave, criação de um modo desenvolvedor secreto com ferramentas avançadas e uma auditoria geral de performance e bugs.

Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle
Integrity mode: development

---

## Contexto Técnico

- O projeto mobile está em: `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile`
- Stack: React Native + Expo + TypeScript
- Motor de jogo: `src/application/game-session.ts` (classe `GameSession`)
- UI Provider: `src/ui/GameProvider.tsx` (contexto com `useGameState()`)
- Tela principal pós-login: `src/ui/screens/MainMenuScreen.tsx`
- Tela de autenticação: `src/ui/screens/AuthScreen.tsx`
- Contexto de auth: `src/ui/context/AuthContext.tsx`
- HUD do jogo: `src/ui/components/TopHUD.tsx`
- Save slots: `src/infrastructure/persistence/save-slots.ts` (AUTOSAVE_SLOT_ID = "auto-1")
- Auto-save é disparado pelo método `runAutosave()` em `game-session.ts` a cada 300 ticks, e por `forceSaveToDisk()` ao entrar em background.

---

## Requirements

### R1. Troca de Usuário na Tela Principal (MainMenuScreen)

O banner de perfil do usuário no topo da `MainMenuScreen` (que exibe nome + provedor de login) deve ser transformado em um botão clicável. Ao clicar, deve abrir um modal ou action sheet que ofereça ao usuário a opção de **Trocar de Conta** (que executa logout e navega para `AuthScreen`). Essa funcionalidade deve ser adicional — não substituir o botão de logout existente nas configurações.

### R2. Internacionalização PT-BR

Todo texto visível na interface do jogo deve estar em Português Brasileiro como idioma padrão. Deve ser implementado um sistema de i18n simples (objeto de strings ou biblioteca leve) que permita trocar para outros idiomas no futuro. A tela de Configurações (`SettingsScreen.tsx`) deve ter um seletor de idioma com pelo menos PT-BR e EN-US. Textos hardcoded em inglês como "New Game", "Load Game", "Enter the Realms", "Continue as Guest", labels dos recursos, etc., devem ser traduzidos.

### R3. Correção da Exibição do Relógio (Mês/Ano no HUD)

O `TopHUD.tsx` exibe mês e ano com base em `gameState.meta.tick`. O problema relatado é que a exibição pula meses sem mostrar os intermediários — o usuário reportou passar do Mês 2 diretamente para o Mês 5. A causa provável é que `gameState` só é re-renderizado em certos intervalos, e os ticks processados in batch (MAX_TICKS_PER_FRAME=5) não disparam re-renders intermediários. A solução deve garantir que cada múltiplo de "tick de mês" (a cada 1 tick = 1 mês, ou conforme a lógica definida) seja refletido na UI sem pular frames visíveis.

### R4. Correção do Auto-Save (Slot "AUTO-1" vazio no Load Game)

O auto-save está sendo logado no terminal mas o slot `auto-1` aparece como vazio na tela de Load Game. O problema está em `doCommitAutosave()` em `game-session.ts`: o snapshot é construído corretamente em `buildSaveSlotSnapshot()`, mas a gravação no `saveRepository` pode estar falhando silenciosamente (o método `saveToSlot` pode estar sendo chamado de forma assíncrona sem await, ou a instância de `saveRepository` sendo usada por `forceSaveToDisk` é diferente da usada por `LoadGameModal`). A correção deve garantir que: (a) o autosave escreva no storage com `await`; (b) o `LoadGameModal` leia do mesmo repositório; (c) o slot `auto-1` apareça visualmente na lista com um label "Auto Save" claro.

### R5. Modo Desenvolvedor Secreto (DevMode)

Criar um painel de desenvolvedor oculto, ativado por **5 cliques rápidos** no título "EPOCHS" da `MainMenuScreen` (padrão easter egg do Android). O painel deve ser uma tela ou modal sobreposto com visual escuro (background `#0D1117`) e as seguintes ferramentas:

- **a) Fog of War Toggle**: Botão para ativar/desativar a névoa de guerra no mapa instantaneamente.
- **b) +1000 Recursos**: Botões individuais para adicionar +1000 de cada recurso existente (Ouro, Madeira, Ferro, Comida, Fé, Legitimidade, Manpower, Riqueza).
- **c) Completar Pesquisa/Construção**: Botão que completa instantaneamente qualquer pesquisa ou construção em andamento no reino do jogador.
- **d) Desbloquear Todas as Eras**: Botão que avança o progresso das eras de civilização ao máximo.
- **e) Visualizador de Decisões da IA**: Painel em tempo real mostrando para cada reino NPC: nome, foco atual (ex: "Expandir", "Construir Exército"), alvo de ataque ou diplomacia e motivo. Deve ler do `gameState.kingdoms`.
- **f) Assumir Controle de Outra Civilização**: Dropdown com lista de reinos NPC; ao selecionar, troca o `playerKingdomId` para aquele reino.
- **g) Modo Simulação Rápida (Autoplaying)**: Botão toggle que acelera a velocidade da simulação para 100x temporariamente (modifica `tickDurationMs` do estado).
- **h) Matriz de Relacionamento**: Tabela visual mostrando o status diplomático entre todos os reinos (Aliado/Amigável/Hostil/Neutro).
- **i) Simulador de Combate Rápido**: Inputs para escolher dois reinos e simular um combate entre eles, exibindo o resultado estimado sem afetar o estado real.

O painel deve poder ser fechado e reaberto. Deve exibir um aviso "MODO DESENVOLVEDOR ATIVO" na UI quando estiver ativo.

### R6. Auditoria Geral de Performance e Bugs

Realizar uma auditoria técnica completa do código existente buscando:
- Funções assíncronas chamadas sem `await` que podem causar race conditions.
- Warnings do tipo `[SYS-PERF] Dívida de CPU massiva detectada` — investigar a causa raiz e ajustar o `MAX_TICKS_PER_FRAME` ou o `safety clamp` em `pumpSimulationQueue` para que o warning nunca ocorra em condições normais de uso (velocidades de 1x a 30x).
- Funcionalidades inacabadas, telas ou botões que não funcionam.
- Memory leaks em listeners não removidos.
- Qualquer tela ou componente que ainda esteja em inglês após o R2.

---

## Acceptance Criteria

### R1 — Troca de Usuário
- [ ] Clicar no banner de perfil abre um modal/action sheet com a opção "Trocar de Conta".
- [ ] Ao confirmar, o usuário é deslogado e navega para a `AuthScreen`.

### R2 — PT-BR
- [ ] Toda UI visível está em PT-BR por padrão (incluindo MainMenu, AuthScreen, HUD, Configurações, LoadGame).
- [ ] Existe seletor de idioma in Configurações com PT-BR e EN-US funcionais.

### R3 — Relógio
- [ ] A exibição do mês no HUD avança de forma sequencial (1, 2, 3, 4...) sem pular meses visíveis.

### R4 — Auto-Save
- [ ] O slot `auto-1` aparece na tela de Load Game após o autosave ser disparado.
- [ ] Ao carregar o slot `auto-1`, o jogo é restaurado corretamente ao estado salvo.

### R5 — DevMode
- [ ] O painel de dev abre com 5 cliques no título "EPOCHS" na MainMenuScreen.
- [ ] Cada uma das 9 ferramentas (a-i) está funcional e conectada ao `GameSession`.
- [ ] O painel é fechável e o estado `devMode: true/false` é gerenciado localmente.

### R6 — Auditoria
- [ ] Nenhum warning `[SYS-PERF]` deve aparecer nos logs durante uso normal em velocidades ≤ 30x.
- [ ] Relatório de auditoria listando todos os bugs encontrados e as correções aplicadas.
- [ ] TypeScript compila sem erros (`npx tsc --noEmit`).

## Follow-up — 2026-07-03T19:13:10Z

Você é o monitor do Quality Sprint do Epochs Idle. O Orquestrador principal tem ID: 3c7029ad-6b46-46c6-b7a0-f58e3d110de1. Você deve:
1. Verificar regularmente o progresso do orquestrador
2. Reportar atualizações ao agente pai (a929d858-db12-436a-857e-f825e936138c) a cada 8 minutos
3. Verificar se o orquestrador está ativo a cada 10 minutos e fazer nudge se necessário
4. Quando o orquestrador declarar vitória, spawnar um auditor independente e reportar o resultado final

O Sprint cobre: R3 (relógio HUD), R4 (auto-save slot auto-1), R5 (DevMode secreto 5 cliques + 9 ferramentas), R6 (auditoria geral de performance e bugs).

Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle

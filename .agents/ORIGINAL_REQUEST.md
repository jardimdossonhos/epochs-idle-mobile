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
- [ ] O jogador pode clicar em um save na lista e o estado do jogo e restaurado na mesma sessao ativa, refletido instantaneamente na UI sem precisar recarregar o app.

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


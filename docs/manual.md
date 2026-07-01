# Manual do Usuario e Guia de Testes

Bem-vindo ao **Epochs Idle**. Este manual explica como ler a interface, testar os sistemas e validar se o jogo continua coerente apos mudancas relevantes.

## 1. Interface e Mapa Estrategico

O mapa e a principal visao do mundo.

- **Meus territorios:** seu reino exibe marcacao coerente na UI e concentra seus recursos na barra lateral.
- **Camadas do mapa:** o seletor no topo do mapa muda o foco visual entre dominio, diplomacia, instabilidade, guerra e outras leituras de situacao.
- **Selecao de regiao:** clicar em uma regiao atualiza o painel lateral com dono, fe, instabilidade, devastacao e acoes disponiveis.

## 1.5 Aba de Progressao das Eras

A aba **Progressao** mostra o que ja esta disponivel na Era Aurora e o que permanece bloqueado.

### Era Atual: Aurora
- Mapa mundial interativo
- Governo e administracao
- Tecnologia basica
- Sistema de saves
- Registro de eventos e cadeias ativas acessiveis na interface atual

### Eras Futuras
- **Era Solar:** diplomacia internacional, sistema militar e religiao em camada mais ampla
- **Era Estelar:** grandes crises historicas e camada politica mais profunda
- **Era Cosmica:** exploracao espacial, IA e tecnologias avancadas

### Dicas de Progressao
- Expanda territorio para aumentar populacao e recursos.
- Pesquise tecnologias que aumentem eficiencia economica e administrativa.
- Mantenha estabilidade para evitar revoltas e travas de crescimento.

## 2. Governo e Economia

O painel de Governo controla as alavancas do imperio.

### Taxas
- **Taxa Base:** gera ouro, mas aumenta instabilidade quando sobe demais.
- **Alivio Nobre:** reduz pressao sobre elites e afeta legitimidade/arrecadacao.
- **Isencao Clero:** favorece fe, mas custa ouro.
- **Tarifa Comercial:** imposto sobre fronteiras e feiras.

### Orcamento
O orcamento deve ser distribuido entre economia, militar, religiao, administracao e tecnologia.

- A soma ideal continua sendo 100%.
- O botao `Aplicar` grava a politica atual na sessao.

## 3. Conselho Real e Ministros

O conselho transforma parte da microgestao em tutoria e automacao contextual.

- Ministros possuem personalidade, lealdade, habilidades e historico.
- A IA do conselho evita repetir recomendacoes identicas quando o problema ja foi tratado.
- Em fronteiras ameacadas, a sugestao pode mirar construcoes especificas na regiao correta.
- Remanejamento de cargos e um eixo importante da camada de personagens/dinastias.

## 4. Religiao e Poderes Divinos

- A fe se acumula e habilita acoes ativas.
- E possivel fundar religiao customizada com tenets e custo orcamentario.
- Politicas religiosas alteram conversao, tolerancia e tensao interna.
- Cismas e heresias aumentam instabilidade e afetam a diplomacia.
- A osmose de fronteira continua espalhando influencia religiosa passivamente.

## 5. Painel Militar, Diplomacia e Eventos

- **Military Power:** resume forca militar total e influencia a leitura da IA sobre seu reino.
- **Manpower:** reserva de reposicao para guerras.
- **Aba Militar:** agora concentra ordens imediatas para reforcar guarnicao, pacificar a regiao operacional e abrir rapidamente a aba de diplomacia.
- **Diplomacia:** rivalidade, confianca, tratados e limites logisticos moldam as interacoes.
- **Colapso demografico:** provincias devastadas ou sem populacao podem retornar a Natureza.
- **Aba Eventos:** permanece acessivel na campanha atual, mostra o feed recente e tambem destaca cadeias narrativas ativas, como crises economicas e guerras santas em andamento.

## 6. A Inteligencia do Mundo

Os NPCs nao sao oniscientes e nao jogam de forma perfeita.

- Sofrem racionalidade limitada.
- Guardam memoria historica com decaimento.
- Sofrem pressao estrutural interna antes de agir.
- Reagem a distancia, risco, poder relativo, religiao, tratados e pressao social.

## 7. Salvamento e Protecao de Dados

- **Autosave:** o jogo salva automaticamente a sessao em intervalos regulares da simulacao.
- **F5 / Auto-Boot:** recarregar a pagina deve restaurar a sessao atual sem perder recursos.
- **Save manual:** cria um marco estavel que pode ser carregado depois.
- **Offline progression:** ao reabrir, o jogo tenta simular o periodo ausente dentro dos limites definidos.

## 8. Guia para Criador / Testador

Ao rodar localmente, o projeto possui ferramentas de depuracao e observabilidade alem da interface principal.

### Painel de Debug

Ao clicar repetidamente na versao do jogo, o painel de debug permite:

- injetar recursos;
- alterar populacao;
- destravar tecnologias;
- revelar informacoes globais;
- exportar relatorios e telemetria.

### Hooks de Observabilidade

No console do navegador (`F12`):

- `window.render_game_to_text()`
  - Retorna um JSON conciso com tick, camada ativa, reino do jogador, recursos, eventos recentes, `eventChains` e regiao selecionada.
- `window.advanceTime(ms)`
  - Avanca manualmente a simulacao, inclusive com o jogo pausado, para smoke tests e depuracao controlada.

### Dicas de Teste Padrao

1. **Economia:** suba a Taxa Base e observe ouro, estabilidade e risco de revolta.
2. **Persistencia:** salve, altere velocidade/estado, recarregue a pagina e confira se a sessao volta coerente.
3. **Eventos:** acompanhe a aba `Eventos` e verifique se cadeias ativas aparecem quando disparadas.
4. **Observabilidade:** rode `window.render_game_to_text()` e confirme se o JSON bate com a tela.
5. **Stepping:** com a simulacao pausada, rode `window.advanceTime(3000)` e confira o avanco controlado do tick.

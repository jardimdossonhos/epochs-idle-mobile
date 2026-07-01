# Roadmap de Desenvolvimento

Este documento serve como referencia central para o planejamento das fases do jogo e para o estado real de cada uma.

## Estado operacional atual

**Validado em 2026-05-04**
- `npm test` verde: 22 arquivos / 41 testes.
- `npm run build` verde.
- Fase 4 funcional.
- Fase 4.5 em estabilizacao, nao encerrada de fato.
- Fase 5 ainda bloqueada.
- `eventChains` persistem no `GameState.world.eventChains`, aparecem no feed de eventos e entram no snapshot textual exposto pela UI.
- A UI expoe `window.render_game_to_text()` e `window.advanceTime(ms)` para smoke test e observabilidade.

### Fase 1: Loop de Gameplay Militar
**Objetivo:** implementar o nucleo da interacao militar e conquista.
1. **Exercitos e Movimentacao**
   - Criar entidades de exercito no ECS.
   - [Concluido] O motor valida distancias geograficas e impede teletransporte logistico intercontinental.
2. **Combate e Resolucao de Batalhas**
   - Desenvolver a resolucao de batalhas considerando tamanho do exercito, bonus tecnologicos, terreno e generais futuros.
3. **Conquista e Ocupacao**
   - [Concluido] Implementar cercos baseados em frentes fisicas.
   - [Concluido] Colapso de terreno: populacoes exterminadas devolvem a terra a natureza.
   - Permitir transferencia completa de controle e posse apos conquista bem-sucedida.

### Fase 1.5: Religiao Dinamica (Concluida)
**Objetivo:** usar a fe como instrumento de expansao ativa.
1. [Concluido] Fundacao organica com 100 pontos orcamentarios.
2. [Concluido] Cismas causando 250% de instabilidade civil.
3. [Concluido] Expansao passiva continua nas fronteiras (osmose).

### Fase 2: Especializacao Economica (Edificios) - CONCLUIDA
**Objetivo:** adicionar profundidade estrategica a gestao das regioes.
1. **Sistema de Construcao**
   - [Concluido] Permitir edificios regionais como Mercado, Quartel, Mosteiro, Universidade e Fortaleza.
2. **Modificadores Regionais**
   - [Concluido] Cada edificio aplica efeitos permanentes coerentes com sua funcao economica, militar, religiosa ou administrativa.

### Fase 2.5: Sistema de Conselho Real (Concluida)
**Objetivo:** humanizar o motor matematico e prover tutoria/automacao.
1. [Concluido] Mercado de ministros com personalidade, lealdade e habilidades.
2. [Concluido] Conselheiros com consciencia contextual e geografica usando `StaticWorldData`.

### Fase 2.8: Personagens e Dinastias (Concluida)
**Objetivo:** transformar ministros, NPCs e jogador em entidades de RPG com atributos, mortalidade e sucessao.
1. [Concluido] Documentacao e chave mestra (modo imortalidade).
2. [Concluido] Modelagem de dados, status e Panteao Lendario.
3. [Concluido] Envelhecimento, level up e sucessao.
4. [Concluido] Sala de Guerra para criacao do monarca.
5. [Concluido] Ficha de personagem e remanejamento basico de cargos.

### Fase 3: Aprofundamento da Diplomacia e IA (Em andamento)
**Objetivo:** tornar as interacoes com outros reinos mais dinamicas e significativas.
1. [Concluido] IA diplomatica com poder relativo, distancia espacial e limites logicos.
2. [Concluido] Expansao de tratados: acordos comerciais e pactos defensivos.
3. [Concluido] Interacao externa: financiamento de guerras de terceiros.
4. [Aberto] Consolidar UX, transparencia e validacao jogavel dessas mecanicas no fluxo principal da UI.

### Fase 3.5: O Motor de Agencia (RPG Dinamico)
**Objetivo:** permitir que ministros e NPCs atuem organicamente no mundo.
1. Implementacao da `AgencyEngine`: desvio de riqueza, manobras politicas e traicoes.
2. Estado de exilio para reinos sem provincia.
3. Jogabilidade assimetrica para cargos sob suserania de NPCs.

### Fase 4: Sistema de Eventos Dinamicos (Concluida)
**Objetivo:** criar narrativas emergentes e desafios imprevistos.
1. [Concluido] Motor de eventos com gatilhos baseados em tempo, populacao e fe.
2. [Concluido] Cadeias narrativas com estagios, delays e consequencias progressivas.
3. [Concluido] Persistencia de `eventChains` no estado salvo.
4. [Concluido] Feed de eventos agora mostra tambem cadeias ativas relevantes.

### Fase 4.5: Componentizacao de Apresentacao (Refatoracao de Debito Tecnico) (EM ESTABILIZACAO)
**Objetivo:** reduzir o papel de `src/main.ts` como orquestrador unico antes de avancar para UI taticas/3D.
1. [Concluido] Base MVC/MVP com `BaseTabController` e `TabControllerManager`.
2. [Concluido] Controladores iniciais para `progressao`, `mapa`, `governo` e `tecnologia`.
3. [Concluido] Aba de progressao das eras.
4. [Concluido] Correcao da tela inicial com `Carregar Jogo Salvo` sempre visivel.
5. [Concluido] Hooks de observabilidade para smoke test: `render_game_to_text` e `advanceTime`.
6. [Aberto] Extrair o restante da UI e reduzir renderizacao legada em `main.ts`.

### Fase 5: Vida Microscopica e Tatica de Tempo Real
**Objetivo:** renderizar vida nas provincias e comandar batalhas em tempo real.

**Gate atual:** nao iniciar esta fase antes de:
- concluir mais extracao da UI;
- reduzir o tamanho do bundle principal;
- manter save/load + integracao ECS/UI sob regressao automatizada e smoke test confiavel.

1. **Dual Engine**
   - Integrar um motor visual mais avancado para vida local e batalhas.
2. **Dilatacao Temporal**
   - Sincronizar pausa entre macro simulacao e arena micro.
3. **Traducao ECS-Visual**
   - Converter arrays do ECS em topografia, vilas, populacao e batalhoes visiveis.
4. **Feedback Ativo**
   - Retornar efeitos da arena tatica para as matrizes do WebWorker.

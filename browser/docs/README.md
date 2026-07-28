# Base de Conhecimento: Epochs Idle

Este arquivo e o indice vivo da pasta `docs/`. Ele existe para responder duas perguntas rapidamente:

1. Qual documento devo abrir para cada tipo de tarefa?
2. Qual documento e fonte de verdade operacional agora?

**Estado validado em 2026-05-04**
- `npm test` verde: 22 arquivos / 41 testes.
- `npm run build` verde.
- Smoke test local sem erros de console no fluxo `Nova Campanha -> Forjar Destino`.
- A UI agora expõe `window.render_game_to_text()` e `window.advanceTime(ms)` para automação e inspeção.

## Guia de Navegacao

- `roadmap.md`: status macro de produto e fases de desenvolvimento. Use para saber o que esta concluido, o que esta em estabilizacao e o que continua bloqueado.
- `implementation-plan.md`: plano tatico de curto prazo. Use para os proximos alvos de engenharia antes da Fase 5.
- `manual.md`: manual do jogador, criador e testador. Use para entender fluxos da UI, persistencia e operacao do painel de debug.
- `testing-strategy.md`: estrategia de qualidade. Use para saber como validar build, testes automatizados, smoke test e hooks de observabilidade.
- `developer-logs.md`: diario cronologico de implementacoes, bugs e decisoes. Use como memoria historica append-only.
- `ARCHITECTURE.md`: arquitetura, contratos e direcao tecnica de medio/longo prazo. Atualize quando o desenho tecnico mudar de fato.
- `CODEBASE_MAP.md`: mapa de onde cada responsabilidade mora no codigo. Atualize quando modulos mudarem de lugar ou quando uma camada deixar de refletir a realidade.
- `map-data.md`: referencia do pipeline e origem dos dados geograficos.
- `adr-001-map-generation.md`: ADR historico sobre as decisoes da geracao/renderizacao do mapa.
- `architecture-and-roadmap.md`: arquivo de compatibilidade. Mantido apenas como ponte curta para `ARCHITECTURE.md` e `roadmap.md`.

## Regras de Uso

- Antes de editar codigo, consulte `roadmap.md` e `CODEBASE_MAP.md`.
- Antes de documentar um bug ou decisao, consulte `developer-logs.md`.
- Antes de declarar uma fase como concluida, valide com `testing-strategy.md`.
- `progress.md` na raiz pode ser usado como caderno de sessao, mas nao substitui os documentos oficiais desta pasta.

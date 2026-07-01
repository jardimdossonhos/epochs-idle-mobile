# Estrategia de Testes - Epochs Idle PC

Este documento descreve os gates de qualidade usados para manter o projeto jogavel e documenta o baseline real mais recente.

## Baseline Atual

**Validado em 2026-05-04**
- `npm test` verde: 22 arquivos / 41 testes.
- `npm run build` verde.
- Smoke test local do fluxo `Nova Campanha -> Forjar Destino` sem erros de console.
- `window.render_game_to_text()` retornando payload valido no navegador.

## 1. Tipos de Teste

- **Unitario e integracao leve**
  - Ferramenta: `vitest`
  - Comando: `npm run test`
  - Escopo: regras do `core`, contratos de persistencia, `GameSession`, serializacao de saves, event chains, automacao, sincronizacao e view-models puros.

- **Build de producao**
  - Ferramenta: `tsc -b` + `vite build`
  - Comando: `npm run build`
  - Escopo: garantir que a aplicacao compila, gera bundle e nao quebrou imports dinamicos ou contratos de runtime.

- **E2E com Playwright**
  - Ferramenta: `@playwright/test`
  - Comando: `npm run test:e2e`
  - Localizacao: `tests/e2e/`
  - Suites atuais relevantes: `smoke.spec.ts`, `worker-sync-smoke.spec.ts`, `resource-persistence.spec.ts`, `save-integrity.spec.ts`.

- **Smoke test manual guiado**
  - Ferramenta: navegador local e console do navegador
  - Escopo: validar o fluxo jogavel principal, UI, saves, worker sync e ausencia de erros de console.

- **Observabilidade para automacao**
  - `window.render_game_to_text()`: retorna um JSON conciso com tick, camada ativa, reino do jogador, recursos, regiao selecionada, eventos recentes e `eventChains` ativas.
  - `window.advanceTime(ms)`: avanca a simulacao manualmente para smoke tests e depuracao sem precisar destravar a sessao.

## 2. Checklist de Smoke Test

Antes de considerar uma entrega como jogavel, valide:

1. **Bootstrap**
   - O jogo abre sem erros no console.
   - `Nova Campanha -> Forjar Destino` conclui com mapa e HUD carregados.
   - O botao `Carregar Jogo Salvo` aparece com estado coerente.

2. **Persistencia**
   - `Salvar Jogo` cria um slot valido.
   - Carregar um slot restaura o estado correto.
   - Recarregar a pagina (`F5`) preserva a sessao atual.

3. **Interacao basica**
   - Selecionar regiao atualiza o painel lateral.
   - Pausa e velocidade alteram o estado da simulacao.
   - Troca de abas nao quebra a renderizacao.

4. **Eventos e simulacao**
   - A aba `Eventos` mostra feed recente.
   - Se houver cadeias narrativas ativas, elas aparecem como `Cadeia ativa`.
   - `window.render_game_to_text()` reflete o estado visivel na tela.

5. **Regressao minima**
   - `npm run test` verde.
   - `npm run build` verde.

## 3. Politica de Validacao

- Nao marque feature como estavel apenas porque compila.
- Se a mudanca tocar `main.ts`, `game-session.ts`, `worker` ou `core/models`, rode build, suite automatizada e smoke test.
- Se a mudanca tocar serializacao, saves ou `eventChains`, valide tambem `F5`, save manual e restauracao.
- Se a mudanca afetar automacao/smoke, confirme explicitamente `render_game_to_text()` e `advanceTime(ms)`.

## 4. Observacoes Atuais

- O bundle principal continua grande; regressao de build precisa continuar obrigatoria.
- O cliente Playwright externo em `C:\\Users\\joti.SIMPLO\\.codex\\...` pode falhar resolucao de dependencia fora do repo. Para smoke local, prefira scripts/flows que resolvam `playwright` a partir do proprio projeto.

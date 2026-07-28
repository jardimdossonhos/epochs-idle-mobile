# Plano de Implementacao Ativo

Este documento substitui o plano antigo por um recorte tatico do que realmente deve acontecer a seguir.

**Atualizado em 2026-05-04**

## Estado de Partida

- Fase 4 esta funcional.
- Fase 4.5 segue em estabilizacao, nao em encerramento real.
- Fase 5 continua bloqueada por debito tecnico e risco de regressao.

## Prioridades Imediatas

1. **Continuar a extracao da UI**
   - Reduzir responsabilidades residuais de `src/main.ts`.
   - Mover mais abas e listeners para `src/ui/controllers/`.
   - Isolar renderizacao textual/DOM em helpers ou views puras quando fizer sentido.

2. **Reduzir o bundle principal**
   - Atacar code splitting de telas e modulos pesados.
   - Rever imports compartilhados que impedem chunking real.
   - Manter `npm run build` como gate obrigatorio a cada iteracao relevante.

3. **Fortalecer smoke automation local**
   - Manter `window.render_game_to_text()` e `window.advanceTime(ms)` como contratos estaveis.
   - Criar um wrapper local para Playwright, evitando dependencia do script externo em `~/.codex`.

4. **Expandir regressao automatizada**
   - Cobrir melhor interacao ECS/UI.
   - Cobrir feed de eventos e `eventChains`.
   - Cobrir fluxos de save/load com estados avancados de campanha.

## Gate Antes da Fase 5

Nao iniciar `Vida Microscopica e Tatica em Tempo Real` antes de:

- reduzir risco de regressao em save/load;
- ter smoke test confiavel para bootstrap + mapa + worker sync;
- diminuir o tamanho do bundle principal;
- retirar mais logica de interface de `src/main.ts`.

## Registro Historico

O plano antigo por "Stage 2/3/4/5" fica implicitamente arquivado: a maior parte dele ja foi absorvida por `roadmap.md`, `developer-logs.md` e pelo estado real do codigo.

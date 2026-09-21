# Invariantes Temporais do ECS (P1)

Este documento formaliza as regras absolutas (invariantes) que o sistema temporal (engine, GameSession, TickPipeline) deve respeitar, independentemente da formata??o escolhida para o calend?rio (360 dias, 365 dias, 12 meses).

Qualquer futura refatora??o das unidades de tempo deve manter essas invariantes v?lidas.

## 1. Monotonicidade, Continuidade e Escala

*   **Invariante:** O avan?o de meta.tick deve corresponder estritamente ? quantidade de tempo (e simula??o) realmente executada. Ticks n?o podem retroceder. O 	ickScale aplicado aos sistemas deve representar o salto temporal exato injetado no rel?gio master.
*   **Classifica??o:** REQUISITO DE DESIGN.

## 2. Rela??o Tick/Dura??o

*   **Invariante:** Cada incremento num?rico na totaliza??o do estado deve ser o produto da dura??o base computada.
*   **Classifica??o:** REQUISITO DE DESIGN.

## 3. Equival?ncia de Batch (Simula??o Coarse)

*   **Invariante:** Executar o pipeline para $ ticks isoladamente deve produzir um delta no estado (economia, 	ecnologia, popula??o) matematicamente equivalente a executar 1 "Batch" que pule o tempo em $ ticks de uma s? vez (via 	ickScale), ressalvadas diferen?as decorrentes de aproxima??es de ponto flutuante ou eventos rand?micos intra-tick.
*   **Classifica??o:** REQUISITO DE DESIGN (Atualmente: QUEST?O EM ABERTO / EVID?NCIA ESTRUTURAL DE DIVERG?NCIA).

## 4. Coer?ncia Online/Offline

*   **Invariante:** Um volume $ de tempo inativo (offline) e um volume $ de tempo ativo (online) devem gerar o mesmo progresso matem?tico final no estado, condicionado ao determinismo da simula??o e ? aus?ncia de intera??es ativas do jogador.
*   **Classifica??o:** REQUISITO DE DESIGN A VALIDAR.

## 5. Limite e Descarte Offline 

*   **Atual Comportamento:** O c?lculo da passagem do tempo retroativo offline descarta integralmente a por??o de tempo decorrida al?m do teto configur?vel (ex: 12_000 ticks). O remanescente n?o se converte em um atraso pendente no rel?gio.
*   **Classifica??o:** COMPORTAMENTO OBSERVADO DA IMPLEMENTA??O ATUAL (N?o ? um invariante de design intr?nseco, requer avalia??o do Game Design).

## 6. Transi??es Anuais e Envelhecimento

*   **Atual Comportamento:** O envelhecimento nos sistemas mapeados (character-system) utiliza a base estrutural de 12 ticks/m?dulos para transi??es anuais.
*   **Classifica??o:** COMPORTAMENTO OBSERVADO PARCIAL (Verificado em character-system; n?o assumido globalmente para sistemas lineares).

## 7. Descarte de Backlog Online (Ac?mulo Excessivo)

*   **Atual Comportamento:** A engine possui um mecanismo limitador de performance SYS-PERF em GameSession.processClockTick(). Se o loop online atrasar massivamente (ccumulatedMs > maxAccumulatedMs), o backlog ? sumariamente truncado (ex: ccumulatedMs = 1000).
*   **Classifica??o:** FATO OBSERVADO: descarte de backlog online sob ac?mulo excessivo (Necessita teste de caracteriza??o real para avaliar impacto sist?mico).

# Invariantes Temporais do ECS (P1)

Este documento formaliza as regras absolutas (invariantes) que o sistema temporal (engine, GameSession, TickPipeline) deve respeitar, independentemente da formata??o escolhida para o calend?rio (360 dias, 365 dias, 12 meses).

Qualquer futura refatora??o das unidades de tempo deve manter essas invariantes v?lidas.

## 1. Monotonicidade e Continuidade

*   **Invariante:** O rel?gio da simula??o (meta.tick) avan?a de forma estritamente monot?nica e cont?nua. Ticks nunca podem retroceder ou pular intervalos sem processar o tempo transcorrido (a menos que limitado propositalmente por um teto configur?vel, como o limite offline).
*   **Classifica??o:** REQUISITO DE DESIGN.

## 2. Rela??o Tick/Dura??o

*   **Invariante:** Cada incremento discreto em meta.tick corresponde a um volume fixo de tempo real base (meta.tickDurationMs). O somat?rio final de avan?o do estado ? puramente o produto de 	ick * tickDurationMs.
*   **Classifica??o:** FATO OBSERVADO / REQUISITO DE DESIGN.

## 3. Equival?ncia de Batch (Simula??o Coarse)

*   **Invariante:** Executar o pipeline para $ ticks isoladamente deve produzir um delta no estado (economia, 	ecnologia, popula??o) matematicamente equivalente a executar 1 "Batch" que pule o tempo em $ ticks de uma s? vez (via 	ickScale).
*   **Classifica??o:** REQUISITO DE DESIGN (Atualmente violado: QUEST?O EM ABERTO / BUG DEMONSTRADO).

## 4. Coer?ncia Online/Offline

*   **Invariante:** 1 hora de inatividade com o aplicativo fechado deve gerar exatamente a mesma quantia de progresso matem?tico de 1 hora com o aplicativo aberto, desde que os fatores externos (eventos n?o determin?sticos) n?o variem, at? o limite do teto offline.
*   **Classifica??o:** REQUISITO DE DESIGN.

## 5. Limite Offline Restrito

*   **Invariante:** O c?lculo da passagem do tempo retroativo descarta integralmente a por??o de tempo decorrida al?m do teto configur?vel (ex: 12_000 ticks). O remanescente n?o deve se converter em um atraso pendente no rel?gio.
*   **Classifica??o:** FATO OBSERVADO / REQUISITO DE DESIGN.

## 6. Transi??es Anuais e Envelhecimento

*   **Invariante:** Monarcas e popula??es envelhecem a uma taxa fixa relacionada ? supera??o de "Anos". O ano ? atualmente definido estruturalmente pelo cruzamento da equa??o loor(tick / BASE_ANUAL).
*   **Classifica??o:** FATO OBSERVADO.

## 7. Produ??o Econ?mica e Pesquisa

*   **Invariante:** As taxas operacionais (ex: incomePerTick, 
esearchDelta) s?o tratadas como unidades completas a cada tick individual. Se o "ano" for esticado computacionalmente, essas taxas produzir?o valores anuais finais proporcionais ao novo tamanho nominal do ano, se n?o fracionadas.
*   **Classifica??o:** FATO OBSERVADO.

## 8. Popula??o e Mortalidade

*   **Invariante:** A mortalidade e a natalidade operam dentro de loops de ciclo, sendo agregadas ?s matrizes ativas por tick processado em batch.
*   **Classifica??o:** HIP?TESE SUPORTADA (Verificar integra??o com population-system.ts).

## 9. Eventos Peri?dicos e Cooldowns

*   **Invariante:** Janelas de a??o, acionamento de cat?strofes, ou tempo limite de conc?lio s?o aferidos pelo delta entre o tick atual e o tick gravado na base de dados (meta.tick - triggerTick > cooldown).
*   **Classifica??o:** FATO OBSERVADO.

## 10. Pausa e Multiplicador de Velocidade

*   **Invariante:** Se meta.paused == true, nenhum processamento de batch ou de 
unInPlace deve ocorrer para as entidades puras da simula??o. O speedMultiplier afeta unicamente a taxa de consumo de deltaMs convertidos em desiredTicks, n?o afetando as f?rmulas matem?ticas internas de cada sistema por tick.
*   **Classifica??o:** FATO OBSERVADO.

# Mapa de Unidades Temporais (P1)

Este documento cataloga o uso de vari?veis e express?es de tempo na engine ECS para guiar o refactor arquitetural, evidenciando as inconsist?ncias sem?nticas atuais.

| Arquivo | Sistema | Express?o | Unidade Presumida | Evid?ncia da Unidade | Online | Batch | Offline | Status Atual |
|---|---|---|---|---|---|---|---|---|
| 	ick-pipeline.ts | Base Pipeline | meta.tick += tickScale | N/A (Linear) | Rel?gio mestre avan?a na propor??o do multiplicador | 1x | 	ickScale | Capped | Ok |
| disaster-system.ts | Desastres | 	ick % 10 | D?cada (10 meses) | Coment?rio doc: "10% de chance por d?cada (loop roda a cada 10 meses...)" | 1x | Ignora | Ignora | Bug de Batch |
| character-system.ts | Envelhecimento | loor(tick / 12) | Ano (12 meses/ticks) | L?gica de transi??o de vida baseada no divisor estrutural 12 | 1x | Usa 	ickScale| Usa | Ok |
| economy-system.ts | Recursos Base | stock + incomePerTick | 1 Tick | Aus?ncia de multiplicadores de escala (Soma fixa a cada loop) | 1x | Ignora | Ignora | Bug de Batch |
| 	echnology-system.ts | Pesquisa | ccumulated + researchDelta | 1 Tick | Idem ? Economia (Soma constante a cada loop sem ler delta/escala) | 1x | Ignora | Ignora | Bug de Batch |
| population-system.ts | Crescimento | delta = calc(..., tickScale) | N/A (Linear) | O sistema passa explicitamente 	ickScale na f?rmula | 1x | Usa 	ickScale| Usa | Ok |
| 
eligion-system.ts | F?/Press?o | delta * tickScale | N/A (Linear) | O sistema multiplica convers?o e tens?o por 	ickScale | 1x | Usa 	ickScale| Usa | Ok |
| 
eligion-system.ts | Frequ?ncia | 	ick % floor(N/tickScale) | N/A | Ajusta o % modular dividindo o divisor pelo salto do batch | 1x | Usa 	ickScale| Usa | Ok (Complexo) |
| game-session.ts | Offline Core | desiredTicks > 12_000 | N/A | Teto condicional fixado pelo fallback da propriedade n?o injetada | 1x | N/A | Descarte | Bug de Descarte |
| game-session.ts | Anchoring | lastUpdatedAt = now | Milissegundos | Atribui??o do timestamp real logo ap?s o la?o offline | 1x | N/A | Usa | Descarte Sonegado |

## Observa??es Epistemol?gicas

1. A presun??o de % 10 ou / 12 significando meses tem confirma??o apenas documental em um sistema (Desastres) e estrutural em outro (Personagens).
2. Sistemas de Economia e Tecnologia n?o expressam inten??o de base mensal em suas equa??es atestadas, atestando puramente uma mec?nica "por loop de execu??o".
3. O sistema Religioso possui c?digo funcional de adequa??o a batch/offline, compensando tanto volumes lineares (delta * tickScale) quanto frequ?ncias de eventos peri?dicos.

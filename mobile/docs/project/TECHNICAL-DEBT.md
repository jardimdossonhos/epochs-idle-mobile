# Dívida Técnica (Technical Debt)

- Testes de `progression-build.test.ts` e economia falhando intencionalmente como referencial futuro (C2).
- Os modificadores culturais do `CharacterCreationScreen.tsx` não são preservados no estado e somem após a morte do monarca original.
- Falta suporte a Unicode/Ícones falhando em algumas builds locais e causando mojibakes (Problemas UTF-8 / Mojibake e ícones ausentes da UI).
- A função de calcular a matemática `applyAggregatedProgression()` para modo offline prolongado está rodando um fallback caro em chunks (MaxOfflineTicks: 200). Para anos inteiros offline (meses simulados), a matemática precisará ser convertida 100% para fórmulas algébricas em O(1) em vez de orquestrar mil ticks em loop batched.
- Inconsistências de `UsedCapacity` no painel de administração em relação ao limite total.
- Colonização ainda pendente de integração canônica completa no pipeline do ECS.

---
name: investigate-regression
description: Pipeline rigoroso para investigar regressões identificadas no projeto.
---

# Skill: investigate-regression

Orientação sobre como agir ao encontrar uma regressão.

## Passos

1. Reproduza o cenário no código atual e registre o comportamento (evidência).
2. Tente identificar o commit ou o conjunto de arquivos modificados recentemente.
3. Compare o comportamento com o esperado/documentado.
4. Execute todos os testes locais `npm test` e `npm run typecheck` para verificar se algo já aponta a falha.
5. Classifique a evidência no artefato de plano (Causa provável).
6. Não adicione "workarounds". Foque no "Root Cause Analysis".

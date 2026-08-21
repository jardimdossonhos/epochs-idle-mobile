---
name: diagnose-anr
description: Instruções precisas para diagnosticar Application Not Responding (ANR) no projeto.
---

# Skill: diagnose-anr

Esta skill orienta o diagnóstico sem achismos quando um ANR ocorre.

## Passos

1. Não altere código durante o diagnóstico.
2. Certifique-se de reproduzir o cenário que causou o ANR.
3. Colete o Logcat focado através de `npm run android:verify` ou manualmente examinando `.verify-logs/logcat-*.log`.
4. Procure por `ANR in`, `Input dispatching timed out`, ou longas pausas de Garbage Collection.
5. Verifique o uso de memória (pode indicar vazamento).
6. Identifique se o ANR ocorreu devido ao limite do Game Loop (`pumpSimulationQueue`).
7. Formule uma hipótese baseada nas linhas críticas do logcat antes de propor a correção.
8. Gere um report sumarizado como evidência.

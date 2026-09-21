# Evolução de Governo e Eras

## Existente no Código
Existem claramente definidos em `government-types.ts`:
- Era: `tribal`
  - `band` (Bando Nômade): Início passivo, cap administrativo 0.
  - `tribal_council` (Conselho Tribal): Exige Pop 200.
  - `chiefdom` (Cacicado): Exige Pop 800 e Tech `hunting_parties`.
- Era: `state`
  - `monarchy` (Monarquia Imperial): Exige Pop 1000, Ano 2+ e Tech `sedentism`.

A transição formal entre as Eras exige a **Cerimônia de Ascensão** na UI (`hasAscended`), que abandona estruturas primitivas e insere bônus fixos robustos de legitimidade, alterando o motor.

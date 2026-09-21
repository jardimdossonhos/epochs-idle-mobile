# Motor Econômico e Recursos

## Existente no Código
A economia de `Epochs Idle` funciona em `O(1)`:
- Ouro, Comida, Madeira, Ferro, Fé, Legitimidade.
- Calculado a cada Tick. (IMPLEMENTATION STATUS: O código atual calcula isso mensalmente, assumindo erroneamente 1 Tick = 1 Mês. DESIGN DECISION: Deverá ser corrigido para 1 Tick = 1 Dia).
- Vassalagem: Os impostos/tributos diplomáticos (Tratado `Tribute` ou `Vassalage`) retiram o `incomePerTick` cru e entregam para o Overlord.
- Integração profunda: O "banco de ouro" flutua no ECS (`factionGoldBalance`) e é transferido via macro-scripts na camada OO por performance.

## Quebrado / Dívida Técnica
- Baseline atualizada exige revisão da progressão cronológica do fluxo de caixa e os preços inflacionados (Testes em C2 farão o fix).

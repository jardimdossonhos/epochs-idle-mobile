# Ameaças e Desastres

## Existente no Código
O `disaster-system.ts` já possui um embrião mecânico:
- Roda 1 vez a cada 10 Ticks (Meses).
- **Fome de Guerra (Famine)**: Dispara com 5% de chance caso o `WarExhaustion` exceda >0.8. Acarreta perda instantânea de 60% do estoque de comida atual do Reino afetado.

## Proposto (Future Design)
Nenhum implementado ainda. Futuramente:
- Peste, Praga, Seca, Enchente, Incêndio.
- Formas de Mitigação: Oração/Fé, Administração/Quarentena, Ouro/Importação. (DD-017).

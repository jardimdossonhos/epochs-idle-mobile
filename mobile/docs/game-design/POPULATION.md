# Demografia e População

## Existente no Código
- A população cresce matematicamente com bônus fixo ("Tribal Base Growth" se pop < 2000) e penalidades percentuais dinâmicas.
- `foodPressure` (fome) reduz agressivamente a vida natural e força instabilidade política (`unrest`).
- Piggybacking de ECS define extratos: `factionPeasants`, `factionNobles`, `factionClergy`, `factionSoldiers`, `factionMerchants`.

## Proposto (Aguardando Alinhamento)
- Migrações impulsionadas por catástrofes.

## Dependência Arquitetural: Reinos Dinâmicos (DD-021)
De acordo com a DD-021, o número de reinos não é fixo. Sistemas populacionais e de migração devem prever fluxos envolvendo novos reinos criados por fragmentação e o reassentamento em territórios rebeldes ou de entidades recém-nascidas/exterminadas.

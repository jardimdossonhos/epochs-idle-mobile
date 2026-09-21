# Guerra e Combate Terrestre

## Existente no Código
- Combat system encapsulado para rodar de 4 em 4 ticks.
- Sistema Massivo no `combat-system.ts` usando alocação estática (`Int32Array(MAX_FACTIONS)`) e cruzamentos na Grade Espacial.
- O `military-system.ts` consome as reservas de tropas e pune o "Supply" se mal suportado.
- Declarações de guerra e exaustão bélica já influenciam rebeliões e fomes de guerra.

## Dependência Arquitetural: Reinos Dinâmicos (DD-021)
Conforme a DD-021, reinos são dinâmicos. A guerra, conquista total, guerras civis, revoltas e subjugação militar devem lidar com entidades políticas que podem nascer, ser totalmente destruídas, divididas ou vassalisadas, não se restringindo aos NPCs inicialmente configurados.

# Geografia e Biomas

## Existente no Código
- Mapa de `800x400` = `320.000` Hexágonos.
- **Biomas**: Ocean, Desert, Tundra, Temperate, Tropical.
- **Lat/Long Geográfica**: O Spawning das nações obedece a Bounding Boxes continentais rigorosas ("América", "Europa", "África", "Ásia").
- O problema de Spawn Geográfico ("Península Ibérica jogando no Saara") está corrigido. A UI semântica corresponde ao grid.

## Proposto (Design Future)
- Navegação costeira vs alto mar. (DD-019).
- Pesca em biomas costeiros (Ocean limit).
- Portos, comércio fluvial de rios.
- Culturas adaptadas a climas e sofrimento/desastres geográficos. (DD-020).

## Dependência Arquitetural: Reinos Dinâmicos (DD-021)
O número de reinos é dinâmico (ver DD-021). A geografia, fronteiras, ocupação territorial e colonização devem suportar o nascimento, crescimento, perda de territórios para a natureza e desaparecimento de entidades políticas, sem depender de uma lista fixa ou limites rígidos de IDs (como k_npc_1..4).

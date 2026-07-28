﻿# Dados de mapa (Milestone 2)

Arquivo principal:
- `public/assets/maps/world-countries-v1.geojson` (Renderização Base)

Arquivo fallback:
- `public/assets/maps/world-countries-v0.geojson`

Status atual:
- `v1` é gerado procedimentalmente em formato Hexagonal (Grid).
- Base de dados topológica: **Natural Earth 1:10m** (`ne_10m_land.geojson`).
- Total de células processadas: **~62.400 hexágonos** fatiados em *Vector Tiles* (MVT).
- Países da campanha inicial são mapeados para `regionId` existentes (`r_iberia_north`, etc.).
- O *Expurgo Oceânico* garante que a GameSession e o Worker ECS enxerguem apenas a Terra Firme, otimizando o uso de RAM, enquanto o MapLibre renderiza todo o oceano.

## Origem e licença
- Fonte Primária: Polígonos baseados no **Natural Earth** (Uso em Domínio Público).
- Uso no projeto: Procedural Hexgrid Generator -> Mapbox Vector Tiles (`vt-pbf`).

## Pipeline de geração
1. Instalar dependências (`@turf/turf`, `geojson-vt`, `vt-pbf`).
2. Rodar:
   - `npm run map:build`
3. O script baixa o modelo 10m (se não estiver em cache) e constrói o mundo em `public/assets/tiles/`.

## Propriedades esperadas por feature
- `regionId`: ID estável usado pelo jogo
- `name`: nome do país
- `isoN3`: código ISO numérico quando disponível
- `campaignMapped`: `true` quando mapeado para região jogável inicial
- `source`: origem do dado (`world-atlas-50m`)

Observação:
- O projeto permanece compatível com hospedagem estática; os assets ficam em `public/assets/maps`.

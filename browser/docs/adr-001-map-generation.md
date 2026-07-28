# ADR 001: Resolução de Anomalias na Geração e Renderização do Mapa Global

**Status:** Resolvido / Padrão Adotado
**Domínio:** Geração Procedural, WebGL e Vector Tiles

## 1. O Problema da Escala Hexagonal e Estreitos Litorâneos
- **Sintoma:** Estreitos críticos (Ex: Gibraltar) eram renderizados fundidos como terra. Istmos finos (Ex: Panamá) apareciam rompidos pelo oceano.
- **Causa Raiz:** O raio do hexágono (`75.000m`) causava um desvio matemático na checagem de centro geográfico nas fronteiras poligonais originais do GeoJSON.
- **Solução Padrão Aplicada:**
  1. Uso da malha de altíssima resolução topográfica: **`ne_10m_land.geojson`** (Natural Earth 1:10m).
  2. Injeção de **Bounding Boxes Manuais** em `generate-world-geojson.mjs` que sobreescrevem o script, forçando `isWater = true` para abrir passagens vitais ou `false` para manter pontes terrestres intactas.

## 2. O Colapso de Renderização do WebGL (Linha de Corte)
- **Sintoma:** O mapa falhava silenciosamente e deixava de renderizar do Equador em direção aos polos, preenchendo a tela de cinza.
- **Causa Raiz:** O MapLibre necessita de um atributo nativo estritamente numérico no nível de raiz do protobuffer (MVT) para gerenciar o estado da Placa de Vídeo (GPU). Nós usávamos IDs baseados em Strings.
- **Solução Padrão Aplicada:** 
  1. O script converte o índice (numérico) no parâmetro primário `id` no objeto GeoJSON `Feature`.
  2. A fonte do MapLibre usa a flag arquitetural `promoteId: "regionId"` para realizar a amarração perfeitamente na VRAM, atingindo 60FPS constantes na leitura das ~20.000 regiões terrestres.
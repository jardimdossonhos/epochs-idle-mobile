﻿import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { topology } from "topojson-server";
import { neighbors } from "topojson-client";
import * as turf from "@turf/turf";
import geojsonvt from "geojson-vt";
import vtpbf from "vt-pbf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geoJsonOutputPath = path.resolve(__dirname, "..", "public", "assets", "maps", "world-countries-v1.geojson");
const definitionsOutputPath = path.resolve(__dirname, "..", "public", "assets", "maps", "world-definitions-v1.json");
const generatedModuleOutputPath = path.resolve(__dirname, "..", "src", "application", "boot", "generated", "world-definitions-v1.ts");

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_");
}

function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(hash, 33) + input.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function visitPositions(value, onPosition) {
  if (!Array.isArray(value) || value.length === 0) {
    return;
  }

  if (typeof value[0] === "number" && typeof value[1] === "number") {
    onPosition(value);
    return;
  }

  for (const item of value) {
    visitPositions(item, onPosition);
  }
}

function computeCenter(geometry) {
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  visitPositions(geometry?.coordinates, (position) => {
    const [lon, lat] = position;
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return { lon: 0, lat: 0 };
  }

  return {
    lon: Number(((minLon + maxLon) / 2).toFixed(4)),
    lat: Number(((minLat + maxLat) / 2).toFixed(4))
  };
}

function classifyZone(lon, lat) {
  if (lat >= 35 && lon >= -25 && lon <= 45) {
    return "europe";
  }

  if (lat >= 12 && lat < 35 && lon >= -20 && lon <= 55) {
    return "north_africa";
  }

  if (lat >= 12 && lat <= 45 && lon > 35 && lon <= 70) {
    return "near_east";
  }

  if (lat >= 15 && lon < -20) {
    return "north_america";
  }

  if (lat < -10 && lon < -20) {
    return "south_america";
  }

  if (lat >= 20 && lon >= 90 && lon <= 155) {
    return "east_asia";
  }

  if (lat >= 5 && lon >= 60 && lon < 110) {
    return "south_asia";
  }

  if (lat >= 5 && lon >= 30 && lon < 90) {
    return "central_asia";
  }

  if (lat < 20 && lon >= 95) {
    return "oceania";
  }

  return "sub_saharan_africa";
}

function computeMoisture(lon, lat) {
  // Converte coordenadas para radianos para atuar como frequência harmônica
  const radX = lon * Math.PI / 180;
  const radY = lat * Math.PI / 180;

  // Sobreposição de 3 Oitavas Trigonométricas para emular Perlin Noise deterministicamente
  const n1 = (Math.sin(radX * 2.0 + radY) + Math.cos(radY * 3.0)) / 2;
  const n2 = (Math.sin(radX * 6.0 - radY * 2.0) + Math.cos(radX * 5.0 + radY * 4.0)) / 2;
  const n3 = (Math.sin(radX * 14.0 + radY * 11.0) + Math.cos(radX * 13.0 - radY * 9.0)) / 2;

  // Normalização ponderada [-1, 1] -> [0, 1]
  let noise = (n1 * 0.6) + (n2 * 0.3) + (n3 * 0.1);
  noise = (noise + 1) / 2; 

  const absLat = Math.abs(lat);
  
  // Bounding Boxes de Geofísica Real (Zonas de Sombra de Chuva e Ventos Alísios)
  if (absLat >= 15 && absLat <= 35) {
     // O Saara e Arábia (-15 a 55 lon leste)
     if (lon >= -15 && lon <= 55 && lat > 0) noise *= 0.35; 
     // Outback Australiano (115 a 155 lon leste)
     else if (lon >= 115 && lon <= 155 && lat < 0) noise *= 0.40;
     // Atacama / Costa Oeste da América do Sul
     else if (lon >= -80 && lon <= -65 && lat < 0) noise *= 0.30;
  }
  
  // Zonas de Convergência Intertropical (Bônus de Precipitação Amazônia/Congo/Indonésia)
  if (absLat < 15) {
      noise = Math.min(1.0, noise + 0.35);
  }

  return noise;
}

function createEconomicValues(regionId, zone) {
  const baseHash = hashString(regionId);
  const strategicValue = 4 + (baseHash % 7);
  const economyValue = 4 + (Math.floor(baseHash / 11) % 7);
  const militaryValue = 4 + (Math.floor(baseHash / 37) % 7);

  if (zone === "near_east" || zone === "europe") {
    return {
      strategicValue: Math.min(10, strategicValue + 1),
      economyValue,
      militaryValue: Math.min(10, militaryValue + 1)
    };
  }

  return {
    strategicValue,
    economyValue,
    militaryValue
  };
}

async function fetchLandMask() {
  const cachePath = path.resolve(__dirname, "ne_10m_land.geojson");
  if (existsSync(cachePath)) {
    console.log("Lendo máscara de terra do cache local...");
    return JSON.parse(await readFile(cachePath, "utf-8"));
  }
  console.log("Baixando polígonos de alta resolução (10m) do Natural Earth (~7MB)...");
  const res = await fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson");
  const data = await res.json();
  await writeFile(cachePath, JSON.stringify(data));
  return data;
}

async function buildWorldArtifacts() {
  const landGeoJson = await fetchLandMask();
  
  // Geometria Mercator (Previne o alongamento e distorção dos hexágonos nos polos)
  const earthR = 6378137;
  function lonLatToMercator(lon, lat) {
    const x = earthR * lon * Math.PI / 180;
    const clampedLat = Math.max(-89.9, Math.min(89.9, lat));
    const y = earthR * Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI / 180) / 2));
    return [x, y];
  }
  function mercatorToLonLat(x, y) {
    const lon = x / earthR * 180 / Math.PI;
    const lat = (2 * Math.atan(Math.exp(y / earthR)) - Math.PI / 2) * 180 / Math.PI;
    return [lon, lat];
  }

  console.log("Gerando Tabuleiro Hexagonal Global (Projeção Mercator)...");
  const bboxMercator = [
    lonLatToMercator(-180, 0)[0],
    lonLatToMercator(0, -65)[1], // Corte inferior
    lonLatToMercator(180, 0)[0],
    lonLatToMercator(0, 75)[1]   // Corte superior
  ];
  
  const hexRadiusMeters = 75000; // Raio de 75km (Gera cerca de 48.000 hexágonos para fidelidade extrema em ilhas)
  const width = Math.sqrt(3) * hexRadiusMeters;
  const yStep = 1.5 * hexRadiusMeters;
  
  const minX = bboxMercator[0];
  const minY = bboxMercator[1];
  const maxX = bboxMercator[2];
  const maxY = bboxMercator[3];

  const cols = Math.ceil((maxX - minX) / width);
  const rows = Math.ceil((maxY - minY) / yStep);

  const features = [];
  let index = 0;

  for (let row = 0; row <= rows; row++) {
    const cy = minY + row * yStep;
    if (cy > maxY + hexRadiusMeters) continue;

    for (let col = 0; col <= cols; col++) {
      let cx = minX + col * width;
      if (row % 2 !== 0) cx += width / 2;
      if (cx > maxX + width / 2) continue;

      const coords = [];
      for (let i = 0; i <= 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * (i % 6) - 30);
        const vx = cx + hexRadiusMeters * Math.cos(angle_rad);
        const vy = cy + hexRadiusMeters * Math.sin(angle_rad);
        const vLonLat = mercatorToLonLat(vx, vy);
        coords.push([ Number(vLonLat[0].toFixed(4)), Number(vLonLat[1].toFixed(4)) ]);
      }

      const hex = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {}
      };

      if (index % 5000 === 0 && index > 0) {
        console.log(`Forjando o mundo... ${index} hexágonos processados...`);
      }

      const centerLonLat = mercatorToLonLat(cx, cy);
      let lon = centerLonLat[0];
      const lat = centerLonLat[1];

      // Garante o fechamento radial do eixo 180° / -180° 
      let safeLon = lon;
      while (safeLon > 180) safeLon -= 360;
      while (safeLon < -180) safeLon += 360;

      const centerPt = turf.point([safeLon, lat]);
      let isWater = true;
      for (const land of landGeoJson.features) {
        if (turf.booleanPointInPolygon(centerPt, land)) {
          isWater = false;
          break;
        }
      }

      // PATCHES MANUAIS: Abertura forçada de estreitos críticos.
      // Como os hexágonos têm ~150km de largura, o centro matemático deles
      // frequentemente cai na costa, fundindo os continentes. 
      // Estas caixas forçam os hexágonos daquela área a serem mares navegáveis.
      
      // Estreito de Gibraltar (Península Ibérica / África)
      if (lat >= 35.0 && lat <= 36.8 && safeLon >= -6.5 && safeLon <= -4.5) {
        isWater = true;
      }
      // Estreito de Bab-el-Mandeb (Mar Vermelho / Golfo de Áden)
      if (lat >= 11.5 && lat <= 13.5 && safeLon >= 42.5 && safeLon <= 44.5) {
        isWater = true;
      }
      // Estreito de Ormuz (Golfo Pérsico)
      if (lat >= 25.5 && lat <= 27.5 && safeLon >= 55.5 && safeLon <= 57.5) {
        isWater = true;
      }
      // Bósforo / Dardanelos (Mar Negro / Mediterrâneo)
      if (lat >= 40.0 && lat <= 41.5 && safeLon >= 26.0 && safeLon <= 29.5) {
        isWater = true;
      }
      
      // Istmo do Panamá (Conexão forçada entre Américas)
      if (lat >= 7.5 && lat <= 9.5 && safeLon >= -82.5 && safeLon <= -77.0) {
        isWater = false;
      }

      let biome = "ocean";
      if (!isWater) {
        const absLat = Math.abs(lat);
        const moisture = computeMoisture(safeLon, lat);
        
        // Modelo Climático Bidimensional Simplificado (Whittaker adaptado)
        if (absLat >= 55) {
          biome = "tundra";
        } else if (absLat >= 35) {
          if (moisture < 0.25) biome = "desert"; // Estepes Frias / Gobi
          else biome = "temperate";
        } else if (absLat >= 15) {
          if (moisture < 0.45) biome = "desert";
          else if (moisture < 0.70) biome = "temperate"; // Savanas / Oásis
          else biome = "tropical";
        } else {
          if (moisture < 0.20) biome = "desert"; // Muito raro no equador
          else if (moisture < 0.40) biome = "temperate"; // Planaltos
          else biome = "tropical";
        }
      }

      const zone = classifyZone(safeLon, lat);
      const regionId = `r_hex_${index}`;
      const name = isWater ? `Mar (${zone})` : `Setor ${index} (${zone})`;

      // Mapbox Vector Tiles EXIGEM que o ID do feature seja inteiramente numérico para injetar estados!
      hex.id = index; 
      hex.properties = { regionId, name, zone, isWater, biome };
      features.push(hex);
      index++;
    }
  }

  console.log(`Malha gerada com ${features.length} zonas. Processando Geologia e Clima...`);

  console.log("Calculando matemática de grafos (Fronteiras Navais e Terrestres)...");
  const geojson = { type: "FeatureCollection", name: "world_countries_v1", features };
  const topoData = topology({ grid: geojson });
  const neighborIndexes = neighbors(topoData.objects.grid.geometries);

  const regions = features.map((feature, i) => {
    const center = turf.center(feature).geometry.coordinates;
    const neighborIds = (neighborIndexes[i] ?? [])
      .map(idx => features[idx].properties.regionId)
      .sort();

    const values = createEconomicValues(feature.properties.regionId, feature.properties.zone);
    
    // Zonas de Água recebem atributos econômicos puramente simbólicos no momento
    if (feature.properties.isWater) {
      values.economyValue = 1;
      values.militaryValue = 1;
      values.strategicValue = 1;
    }

      return {
        id: feature.properties.regionId,
        name: feature.properties.name,
        zone: feature.properties.zone,
        strategicValue: values.strategicValue,
        economyValue: values.economyValue,
        militaryValue: values.militaryValue,
        isCoastal: false, // pós-processado abaixo
        isWater: feature.properties.isWater,
        biome: feature.properties.biome,
        neighbors: neighborIds,
        center: {
          x: Number(center[0].toFixed(4)),
          y: Number(center[1].toFixed(4))
        }
      };
  });

  // Processo rigoroso: Um hexágono de terra é "costeiro" se toca em ao menos um hexágono de água
  for (const region of regions) {
    if (!region.isWater) {
      region.isCoastal = region.neighbors.some(nId => {
        const neighbor = regions.find(r => r.id === nId);
        return neighbor ? neighbor.isWater : false;
      });
    }
  }

  // O "Expurgo Oceânico": O ECS (Motor) vai ignorar o oceano profundo, 
  // mantendo-o apenas no GeoJSON (Vector Tiles) para a GPU desenhar o mar visual.
  const landRegions = regions.filter(r => !r.isWater);

  return {
    geojson,
    definitions: {
      mapId: "world_countries_v1",
      source: "procedural-hexgrid",
      regions: landRegions
    }
  };
}

function buildGeneratedModule(definitions) {
  const rows = [
    "import type { RegionDefinition } from \"../../../core/models/world\";",
    "",
    "export const WORLD_DEFINITIONS_MAP_ID = \"world_countries_v1\";",
    "",
    `export const WORLD_DEFINITIONS_V1: RegionDefinition[] = ${JSON.stringify(definitions.regions, null, 2)};`,
    ""
  ];

  return rows.join("\n");
}

async function main() {
  const artifacts = await buildWorldArtifacts();
  mkdir(path.dirname(geoJsonOutputPath), { recursive: true }).then(() => {});
  mkdir(path.dirname(generatedModuleOutputPath), { recursive: true }).then(() => {});

  writeFile(geoJsonOutputPath, JSON.stringify(artifacts.geojson));
  writeFile(definitionsOutputPath, JSON.stringify(artifacts.definitions));
  writeFile(generatedModuleOutputPath, buildGeneratedModule(artifacts.definitions));

  console.log("Gerando Vector Tiles (MVT) para performance AAA...");
  const tileIndex = geojsonvt(artifacts.geojson, {
    maxZoom: 5,
    indexMaxZoom: 5,
    indexMaxPoints: 100000
  });

  const tilesDir = path.resolve(__dirname, "..", "public", "assets", "tiles");
  await rm(tilesDir, { recursive: true, force: true });
  await mkdir(tilesDir, { recursive: true });

  let tileCount = 0;
  for (let z = 0; z <= 5; z++) {
    const numTiles = Math.pow(2, z);
    for (let x = 0; x < numTiles; x++) {
      for (let y = 0; y < numTiles; y++) {
        const tile = tileIndex.getTile(z, x, y);
        
        // Preenche o vazio: Gera um tile válido e vazio para áreas de oceano profundo.
        // Isso impede que o servidor Vite retorne um erro HTML 404 que causa crash no WebGL.
        const safeTile = tile || { features: [] };
        const pbf = vtpbf.fromGeojsonVt({ hexgrid: safeTile }, { version: 2 });
        const xDir = path.join(tilesDir, String(z), String(x));
        await mkdir(xDir, { recursive: true });
        await writeFile(path.join(xDir, `${y}.pbf`), pbf);
        tileCount++;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`GeoJSON gerado em: ${geoJsonOutputPath}`);
  // eslint-disable-next-line no-console
  console.log(`Definicoes geradas em: ${definitionsOutputPath}`);
  // eslint-disable-next-line no-console
  console.log(`Modulo TS gerado em: ${generatedModuleOutputPath}`);
  // eslint-disable-next-line no-console
  console.log(`Forja concluída: ${artifacts.geojson.features.length} hexágonos convertidos em ${tileCount} Vector Tiles.`);
}

main();

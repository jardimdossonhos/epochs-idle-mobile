#!/usr/bin/env node
/**
 * generate-highres-map.js
 * Geração de Mapa Realista (Earth Image-to-Hex) via Sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ─── Configurações ───────────────────────────────────────────────────────────
const MAP_COLS = 800;
const MAP_ROWS = 400;
const RADIUS = 4;

const DEST_PATHS = [
  path.resolve(__dirname, '../src/ui/assets/data/world_map_data.json'),
  path.resolve(__dirname, '../src/assets/data/world_map_data.json'),
  path.resolve(__dirname, '../src/core/data/world_map_data.json'),
];

const maskPath = path.resolve(__dirname, 'assets/earth_mask.jpg'); // Specular (Água=Branco, Terra=Preto)
const colorPath = path.resolve(__dirname, 'assets/earth_color.jpg'); // Diffuse (Cores)

// ─── Geometria ───────────────────────────────────────────────────────────────
const hexWidth = Math.sqrt(3) * RADIUS;
const yOffset = 1.5 * RADIUS;
const MAP_WIDTH = MAP_COLS * hexWidth;
const MAP_HEIGHT = MAP_ROWS * yOffset + RADIUS * 0.5;

function getCentroid(col, row) {
  const cx = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0);
  const cy = row * yOffset;
  return { cx, cy };
}

function getHexSvgPath(cx, cy, r) {
  let path = '';
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i - 30; // Pointy topped
    const angle_rad = (Math.PI / 180) * angle_deg;
    const x = cx + r * Math.cos(angle_rad);
    const y = cy + r * Math.sin(angle_rad);
    if (i === 0) path += `M${x.toFixed(1)},${y.toFixed(1)} `;
    else path += `L${x.toFixed(1)},${y.toFixed(1)} `;
  }
  path += 'Z ';
  return path;
}

// ─── Estreitos Dinâmicos (Lat/Lon) ───────────────────────────────────────────
// A Auditoria exigiu que os canais sejam cavados via GPS Real para resistir a mudanças de escala.
const STRAITS = [
  { name: 'Gibraltar', lat: 35.9, lon: -5.5, radiusHex: 1 },
  { name: 'Bering', lat: 65.9, lon: -169.0, radiusHex: 2 },
  { name: 'Bosforo', lat: 41.0, lon: 29.0, radiusHex: 1 },
  { name: 'Malacca', lat: 2.7, lon: 101.3, radiusHex: 1 },
  { name: 'English Channel', lat: 50.5, lon: 0.0, radiusHex: 1 }
];

function digStraits(biomes) {
  console.log(`[3/4] Escavando Estreitos Estratégicos (Hardcoded Pass)...`);
  for (const strait of STRAITS) {
    // Equirectangular Math
    const u = (strait.lon + 180) / 360;
    const v = (90 - strait.lat) / 180;
    
    const cx = u * MAP_WIDTH;
    const cy = v * MAP_HEIGHT;
    
    const targetCol = Math.round(cx / hexWidth);
    const targetRow = Math.round(cy / yOffset);
    
    let dug = 0;
    for (let r = targetRow - strait.radiusHex; r <= targetRow + strait.radiusHex; r++) {
      for (let c = targetCol - strait.radiusHex; c <= targetCol + strait.radiusHex; c++) {
        if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
          biomes[r * MAP_COLS + c] = 0; // Força ÁGUA (0)
          dug++;
        }
      }
    }
    console.log(`  -> ${strait.name}: Cavados ${dug} hexágonos em (col:${targetCol}, row:${targetRow})`);
  }
}

// ─── Execução Principal ──────────────────────────────────────────────────────
async function generateMap() {
  console.log(`[1/4] Carregando imagens satelitais em memória via Sharp...`);
  
  if (!fs.existsSync(maskPath) || !fs.existsSync(colorPath)) {
    console.error("ERRO: Imagens base não encontradas. Execute 'download-earth.js' primeiro.");
    process.exit(1);
  }

  // Carrega os buffers originais
  const maskImg = sharp(maskPath);
  const colorImg = sharp(colorPath);
  
  const maskMetadata = await maskImg.metadata();
  const colorMetadata = await colorImg.metadata();
  
  const width = maskMetadata.width;
  const height = maskMetadata.height;

  const maskBuffer = await maskImg.raw().toBuffer();
  const colorBuffer = await colorImg.raw().toBuffer(); // Assumindo canais RGB(A)
  const maskChannels = maskMetadata.channels;
  const colorChannels = colorMetadata.channels;

  console.log(`[2/4] Sampling Image-to-Hex (Linear 1:1) - ${MAP_COLS}x${MAP_ROWS}...`);
  
  const biomes = new Array(MAP_COLS * MAP_ROWS).fill(0);
  let landPaths = { 1: '', 2: '', 3: '' }; // 1=Land, 2=Desert, 3=Tundra
  
  let landCount = 0;
  
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const { cx, cy } = getCentroid(col, row);
      
      // Amostragem Linear Equiretangular (Cilíndrica) - Conforme ordenado pela Auditoria
      const u = cx / MAP_WIDTH;
      const v = cy / MAP_HEIGHT;
      
      let px = Math.floor(u * width);
      let py = Math.floor(v * height);
      
      // Wraparound protection
      if (px < 0) px = 0;
      if (px >= width) px = width - 1;
      if (py < 0) py = 0;
      if (py >= height) py = height - 1;
      
      // Specular Map (Água é brilhante, Terra é escuro)
      const maskIdx = (py * width + px) * maskChannels;
      const luma = maskBuffer[maskIdx]; // Pega o canal Red (como é tons de cinza, R=G=B)
      
      const idx = row * MAP_COLS + col;
      
      // Se for escuro (Luma < 100), é Terra. Caso contrário, Água.
      if (luma < 100) {
        // É Terra! Agora vamos classificar o Bioma lendo o Color Map
        const colorIdx = (py * width + px) * colorChannels;
        const r = colorBuffer[colorIdx];
        const g = colorBuffer[colorIdx + 1];
        const b = colorBuffer[colorIdx + 2];
        
        let biomeId = 1; // Default: Land/Forest
        
        // Regras simples de Bioma baseadas na cor satelital
        if (r > 200 && g > 200 && b > 200) {
          biomeId = 3; // Tundra / Gelo
        } else if (r > 130 && r > g + 20 && g > b) {
          biomeId = 2; // Desert (Amarelado/Marrons)
        }
        
        biomes[idx] = biomeId;
        landPaths[biomeId] += getHexSvgPath(cx, cy, RADIUS);
        landCount++;
      } else {
        biomes[idx] = 0; // Água
      }
    }
  }
  
  console.log(`  -> Terra Firme Encontrada: ${landCount} hexágonos.`);
  
  digStraits(biomes);

  console.log(`[4/4] Serializando Array e Macro Paths de LOD...`);
  const outputData = {
    cols: MAP_COLS,
    rows: MAP_ROWS,
    radius: RADIUS,
    biomes: biomes,
    macroPathLand: landPaths[1],
    macroPathDesert: landPaths[2],
    macroPathTundra: landPaths[3],
  };

  const jsonStr = JSON.stringify(outputData);
  const fileSizeMb = (jsonStr.length / (1024 * 1024)).toFixed(2);
  console.log(`  -> Tamanho Final do Output: ${fileSizeMb} MB`);

  for (const dest of DEST_PATHS) {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, jsonStr, 'utf8');
    console.log(`   ✓ Arquivo gravado em: ${dest}`);
  }

  console.log('\n✅ Mapa-Múndi Realista (V3) Gerado com Sucesso!');
}

generateMap().catch(console.error);

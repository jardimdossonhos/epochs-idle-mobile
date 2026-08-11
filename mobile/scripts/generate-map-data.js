#!/usr/bin/env node
/**
 * generate-map-data.js
 * Converte world-definitions-v1.json (lat/lng) → world_map_data.json (cx/cy pixel)
 * para ser consumido pelo SimulationCanvas (Skia).
 *
 * Projeção: Mercator simples
 *   cx = (lng + 180) * (W / 360)
 *   cy = (90 - lat)  * (H / 180)
 *
 * Canvas: W=3000, H=2000, hexRadius=20
 */

const fs   = require('fs');
const path = require('path');

const SRC  = path.resolve(__dirname, '../src/application/boot/generated/world-definitions-v1.json');
const DEST_PATHS = [
  path.resolve(__dirname, '../src/ui/assets/data/world_map_data.json'),
  path.resolve(__dirname, '../src/assets/data/world_map_data.json'),
  path.resolve(__dirname, '../src/core/data/world_map_data.json'),
  path.resolve(__dirname, '../src/ui/core/data/world_map_data.json'),
];

const W = 3000;
const H = 2000;
const HEX_RADIUS = 20;

// Biome normalisation: map from world-definitions biome names → SimulationCanvas biome keys
const BIOME_MAP = {
  tundra:       'LAND',
  plains:       'LAND',
  grassland:    'LAND',
  forest:       'LAND',
  jungle:       'LAND',
  hills:        'LAND',
  mountains:    'LAND',
  steppe:       'LAND',
  savanna:      'LAND',
  highland:     'LAND',
  taiga:        'LAND',
  desert:       'DESERT',
  arid:         'DESERT',
  semi_arid:    'DESERT',
  shrubland:    'DESERT',
  water:        'WATER',
  ocean:        'WATER',
  sea:          'WATER',
  coastal:      'WATER',
  lake:         'WATER',
  river:        'WATER',
};

console.log('Reading world-definitions-v1.json ...');
const raw     = fs.readFileSync(SRC, 'utf8');
const defs    = JSON.parse(raw);
const regions = defs.regions || [];
console.log(`  → ${regions.length} regions found.`);

const output = regions.map((region) => {
  const lng = region.center?.x ?? 0;
  const lat = region.center?.y ?? 0;

  const cx = (lng + 180) * (W / 360);
  const cy = (90 - lat)  * (H / 180);

  // Parse numeric id from 'r_hex_101' → 101
  const idNum = parseInt((region.id || '').replace(/\D/g, ''), 10) || 0;

  // Axial hex coords (approximate, derived from pixel pos)
  const q = Math.round(cx / (HEX_RADIUS * 1.5));
  const r = Math.round(cy / (HEX_RADIUS * Math.sqrt(3)));

  const rawBiome  = (region.biome || 'plains').toLowerCase();
  const biome     = region.isWater ? 'WATER' : (BIOME_MAP[rawBiome] || 'LAND');

  return {
    id:     idNum,
    cx:     Math.round(cx * 100) / 100,
    cy:     Math.round(cy * 100) / 100,
    q,
    r,
    biome,
    isWater: region.isWater || false,
    name:   region.name || `Region ${idNum}`,
  };
});

console.log(`  → ${output.length} regions converted.`);
console.log(`  → ${output.filter(r => r.isWater).length} water, ${output.filter(r => !r.isWater).length} land.`);

const json = JSON.stringify({ hexRadius: HEX_RADIUS, regions: output }, null, 0);
console.log(`  → JSON size: ${(json.length / 1024).toFixed(0)} KB`);

for (const dest of DEST_PATHS) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  → Created dir: ${dir}`);
  }
  fs.writeFileSync(dest, json, 'utf8');
  console.log(`  ✓ Written: ${dest}`);
}

console.log('\n✅ world_map_data.json generated successfully!');

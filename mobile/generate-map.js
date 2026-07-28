const fs = require('fs');
const path = require('path');

const RADIUS = 15;
const WIDTH_COUNT = 50;
const HEIGHT_COUNT = 40;
const MAX_REGIONS = 2000;

const sqrt3 = Math.sqrt(3);

let regions = [];

// Pointy-topped Odd-Q layout
for (let id = 0; id < MAX_REGIONS; id++) {
  const col = id % WIDTH_COUNT;
  const row = Math.floor(id / WIDTH_COUNT);
  
  // Convert odd-q (col, row) to axial (q, r)
  const q = col;
  const r = row - (col - (col & 1)) / 2;

  // Centroide (cx, cy)
  const cx = RADIUS * sqrt3 * (col + 0.5 * (row & 1)); 
  // Wait, odd-q is: cx = size * sqrt(3) * (col + 0.5 * (row&1))? 
  // No, odd-q formula for cx, cy is:
  // x = size * sqrt(3) * (col + 0.5 * (row&1)) for flat-topped? No!
  // Pointy-Topped odd-q: 
  // x = size * sqrt(3) * (col + 0.5 * (row&1)) is incorrect! 
  // Pointy-topped Odd-Q: shifts odd columns down.
  const cx_pt = RADIUS * sqrt3 * (col + 0.5);
  const cy_pt = RADIUS * 3/2 * row; // No, pointy-topped row spacing is 3/2 * radius? Wait.
  
  // Standard Pointy-topped offset to pixel formula:
  const x = RADIUS * sqrt3 * (col + 0.5 * (row & 1)); // Wait, if rows shift? No, columns shift.
  
  // Let's use pure Axial to Pixel to avoid offset confusion.
  // Pointy-topped Axial to Pixel:
  // x = size * sqrt(3) * (q + r/2)
  // y = size * 3/2 * r
  
  const pt_cx = RADIUS * (sqrt3 * q + sqrt3/2 * r);
  const pt_cy = RADIUS * (3/2 * r);

  regions.push({
    id: id,
    name: `Provincia ${id}`,
    biome: id % 3 === 0 ? "WATER" : "LAND",
    q: q,
    r: r,
    cx: pt_cx,
    cy: pt_cy
  });
}

const mapData = {
  hexRadius: RADIUS,
  regions: regions
};

const dir = path.join(__dirname, 'src', 'assets', 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'world_map_data.json'), JSON.stringify(mapData));
console.log("world_map_data.json generated successfully.");

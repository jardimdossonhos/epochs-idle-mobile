const fs = require('fs');
const path = require('path');
// Register ts-node to run typescript directly
require('ts-node').register({
  compilerOptions: { module: 'commonjs', esModuleInterop: true }
});

const { createStaticWorldData } = require('./src/application/boot/static-world-data');
const { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } = require('./src/application/boot/generated/world-definitions-v1');
const { createInitialState } = require('./src/application/boot/create-initial-state');

console.log("Building static world data...");
const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);

console.log("Generating initial game state...");
const state = createInitialState(staticData, 'r_hex_38160', WORLD_DEFINITIONS_V1);

console.log("Running Benchmark...");
// 1. Measure stringify time and size for full state
const startFull = performance.now();
const fullString = JSON.stringify(state);
const endFull = performance.now();
const fullSizeMb = (Buffer.byteLength(fullString, 'utf8') / (1024 * 1024)).toFixed(2);
const fullTimeMs = (endFull - startFull).toFixed(2);

// 2. Measure stringify time and size for just ECS
const startEcs = performance.now();
const ecsString = JSON.stringify(state.ecs);
const endEcs = performance.now();
const ecsSizeMb = (Buffer.byteLength(ecsString, 'utf8') / (1024 * 1024)).toFixed(2);
const ecsTimeMs = (endEcs - startEcs).toFixed(2);

// 3. Count TypedArrays
let arrayCount = 0;
let arrayLengths = 0;
for (const key in state.ecs) {
    if (state.ecs[key] && state.ecs[key].length !== undefined && typeof state.ecs[key] !== 'string') {
        arrayCount++;
        arrayLengths += state.ecs[key].length;
    }
}

// 4. Calculate frequencies
const ticksPerFrameMax = 5;
const tickDurationMs = 1200; // default tick duration? Wait, we'll check game-config.
// But we know at 1x, it's 1 frame per tick maybe?
// At 30x, it's 30 ticks per second, meaning 6 frames of 5 ticks each.

console.log("--- RESULTADOS DO BENCHMARK ---");
console.log(`- Arrays no ECS: ${arrayCount}`);
console.log(`- Elementos totais de Array no ECS: ${arrayLengths}`);
console.log(`- Tamanho JSON(state.ecs): ${ecsSizeMb} MB`);
console.log(`- Tempo JSON.stringify(ecs): ${ecsTimeMs} ms`);
console.log(`- Tamanho JSON(state total): ${fullSizeMb} MB`);
console.log(`- Tempo JSON.stringify(state total): ${fullTimeMs} ms`);

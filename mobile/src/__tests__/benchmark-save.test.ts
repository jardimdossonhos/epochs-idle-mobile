import { createStaticWorldData } from '../application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from '../application/boot/generated/world-definitions-v1';
import { createInitialState } from '../application/boot/create-initial-state';
import { buildEcsSnapshot, restoreEcsFromSnapshot } from '../infrastructure/persistence/ecs-snapshot';
import { createVirginEcs } from '../infrastructure/persistence/ecs-factory';

describe('Benchmark Save', () => {
  it('measures json stringify time and size', () => {
    console.log("Building static world data...");
    const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);

    console.log("Generating initial game state...");
    const state = createInitialState(staticData, 'r_hex_38160', WORLD_DEFINITIONS_V1);

    console.log("Running Benchmark...");
    
    // 1. Measure stringify time and size for full state
    const startFull = performance.now();
    const fullJson = JSON.stringify(state);
    const fullTimeMs = (performance.now() - startFull).toFixed(2);
    const fullSizeMb = (fullJson.length / 1024 / 1024).toFixed(2);

    // 2. Measure stringify time and size for just ECS
    const startEcs = performance.now();
    const ecsJson = JSON.stringify(state.ecs);
    const ecsTimeMs = (performance.now() - startEcs).toFixed(2);
    const ecsSizeMb = (ecsJson.length / 1024 / 1024).toFixed(2);

    // 3. Count Array Lengths
    let arrayCount = 0;
    let arrayLengths = 0;
    for (const key of Object.keys(state.ecs)) {
        const val = (state.ecs as any)[key];
        if (ArrayBuffer.isView(val) || Array.isArray(val)) {
            arrayCount++;
            arrayLengths += (val as any).length;
        }
    }

    console.log(`\n--- RESULTADOS DO BENCHMARK ---`);
    console.log(`- Arrays no ECS: ${arrayCount}`);
    console.log(`- Elementos totais de Array no ECS: ${arrayLengths}`);
    console.log(`- Tamanho JSON(state.ecs): ${ecsSizeMb} MB`);
    console.log(`- Tempo JSON.stringify(ecs): ${ecsTimeMs} ms`);
    console.log(`- Tamanho JSON(state total): ${fullSizeMb} MB`);
    console.log(`- Tempo JSON.stringify(state total): ${fullTimeMs} ms\n`);
    
    // Measure Snapshot construction
    const snapshotStart = performance.now();
    const snapshot = buildEcsSnapshot(state.ecs as any);
    const snapshotTime = (performance.now() - snapshotStart).toFixed(2);
    
    // Measure stringify snapshot
    const stringifySnapStart = performance.now();
    const snapJson = JSON.stringify(snapshot);
    const stringifySnapTime = (performance.now() - stringifySnapStart).toFixed(2);
    
    // Measure restore time
    const restoreStart = performance.now();
    const parsedSnapshot = JSON.parse(snapJson);
    const restoredEcs = createVirginEcs(state.ecs.regionOwner.length);
    restoreEcsFromSnapshot(restoredEcs, parsedSnapshot);
    const restoreTime = (performance.now() - restoreStart).toFixed(2);
    
    console.log(`- Tempo construir EcsSnapshot: ${snapshotTime} ms`);
    console.log(`- Tempo JSON.stringify(EcsSnapshot): ${stringifySnapTime} ms`);
    console.log(`- Tamanho JSON(EcsSnapshot): ${(snapJson.length / 1024 / 1024).toFixed(4)} MB`);
    console.log(`- Tempo de Restore (Parse + restoreEcsFromSnapshot): ${restoreTime} ms`);
    console.log(`- K Hexes persistidos: ${Object.keys(snapshot.h).length}`);
  });
});
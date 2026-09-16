import { createStaticWorldData } from './src/application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from './src/application/boot/generated/world-definitions-v1';
import { createInitialState } from './src/application/boot/create-initial-state';
import { buildEcsSnapshot, restoreEcsFromSnapshot } from './src/infrastructure/persistence/ecs-snapshot';
import { createVirginEcs } from './src/infrastructure/persistence/ecs-factory';
import { EcsState } from './src/core/models/game-state';

const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);
const state = createInitialState(staticData, 'r_hex_38160', WORLD_DEFINITIONS_V1);
const originalEcs = state.ecs as EcsState;

// Save
const snapshot = buildEcsSnapshot(originalEcs);
const jsonString = JSON.stringify(snapshot);

// Load
const parsedSnapshot = JSON.parse(jsonString);
const restoredEcs = createVirginEcs(originalEcs.regionOwner.length);
restoreEcsFromSnapshot(restoredEcs, parsedSnapshot);

// Fields to compare
const fields = [
    'regionOwner', 'populationTotal', 'populationGrowthRate', 'gold', 'food', 'wood', 'iron',
    'faith', 'legitimacy', 'manpower', 'regionDominantFaith', 'regionDominantShare',
    'regionMinorityFaith', 'regionMinorityShare', 'regionFaithUnrest', 'regionCaptureProgress',
    'regionCurrentSupply', 'hexStructures', 'visibilityMask'
];

let allMatch = true;
let consoleOut = "campo | antes | depois | igual?\n-------------------------------------------------\n";

for (const field of fields) {
    const origArr = (originalEcs as any)[field];
    const restArr = (restoredEcs as any)[field];
    
    let isMatch = true;
    for (let i = 0; i < origArr.length; i++) {
        if (origArr[i] !== restArr[i]) {
            isMatch = false;
            break;
        }
    }
    
    consoleOut += `${field} | ARRAY[${origArr.length}] | ARRAY[${restArr.length}] | ${isMatch ? 'SIM' : 'NÃO'}\n`;
    if (!isMatch) allMatch = false;
}

console.log(consoleOut);
console.log(`Todos os campos são iguais? ${allMatch ? 'SIM' : 'NÃO'}`);
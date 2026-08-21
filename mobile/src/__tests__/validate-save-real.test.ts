import { createStaticWorldData } from '../application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from '../application/boot/generated/world-definitions-v1';
import { createInitialState } from '../application/boot/create-initial-state';
import { buildEcsSnapshot, restoreEcsFromSnapshot } from '../infrastructure/persistence/ecs-snapshot';
import { createVirginEcs } from '../infrastructure/persistence/ecs-factory';
import { EcsState } from '../core/models/game-state';

describe('Final Save Validation C1', () => {
    it('compares all [A] fields between original and restored', () => {
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
        let consoleOut = "\n========================================================\ncampo | antes | depois | igual?\n--------------------------------------------------------\n";

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

        consoleOut += "========================================================\n";
        console.log(consoleOut);
        
        expect(allMatch).toBe(true);
    });
});
import { GameState } from "../core/models/game-state";

export function logAuditBoot(stepName: string, state?: GameState, sessionId?: string) {
    if (!state) {
        console.log(`[AUDIT-BOOT] ${stepName}`);
        return;
    }
    
    const pId = Object.keys(state.kingdoms).find(id => state.kingdoms[id].isPlayer) || "k_player";
    const pk = state.kingdoms[pId];
    
    const capId = pk?.capitalRegionId;
    
    // Aggregates
    const pop = state.ecs?.factionPopulation?.[1] ?? 0;
    const territories = state.ecs?.factionRegions?.[1] ?? 0;
    const gold = state.ecs?.factionGoldBalance?.[1] ?? 0;
    const usedCap = pk?.administration?.usedCapacity ?? 0;
    
    // Find owner from ECS
    let ownerFaction = -1;
    if (capId && state.ecs) {
        const hexMatch = capId.match(/r_hex_(\d+)/);
        if (hexMatch) {
            const idx = parseInt(hexMatch[1], 10);
            ownerFaction = state.ecs.regionOwner[idx];
        }
    }
    
    console.log(`[AUDIT-BOOT] ${stepName} | Session: ${sessionId ?? state.meta.sessionId} | Player: ${pId} | Cap: ${capId} | ECS.Owner: ${ownerFaction} | Pop: ${pop} | Reg: ${territories} | Gold: ${gold.toFixed(2)} | UsedCap: ${usedCap}`);
}
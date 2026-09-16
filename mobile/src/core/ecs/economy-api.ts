import { GameState } from "../models/game-state";

/**
 * Economy API for executing immediate Gold transactions directly on the ECS.
 * This is the SINGLE SOURCE OF TRUTH for modifying a faction's gold balance.
 * NEVER mutate `ecs.factionGoldBalance` manually.
 */

function getFactionId(kingdomId: string): number {
  if (kingdomId === "k_nature") return -1;
  if (kingdomId === "k_player") return 1;
  if (kingdomId.startsWith("k_npc_")) return parseInt(kingdomId.replace("k_npc_", ""), 10) + 1;
  return -1;
}

export function getFactionGold(state: GameState, kingdomId: string): number {
  const factionId = getFactionId(kingdomId);
  if (factionId === -1 || !state.ecs) return 0;
  return state.ecs.factionGoldBalance[factionId] ?? 0;
}

export function creditGold(state: GameState, kingdomId: string, amount: number, source: string): void {
  if (amount <= 0 || !isFinite(amount)) return;
  const factionId = getFactionId(kingdomId);
  if (factionId === -1 || !state.ecs) return;
  
  if (process.env.NODE_ENV === "development") {
    // console.log(`[ECONOMY API] CREDIT | Faction: ${factionId} | Amount: +${amount} | Source: ${source}`);
  }

  state.ecs.factionGoldBalance[factionId] += amount;
}

export function debitGold(state: GameState, kingdomId: string, amount: number, source: string): void {
  if (amount <= 0 || !isFinite(amount)) return;
  const factionId = getFactionId(kingdomId);
  if (factionId === -1 || !state.ecs) return;

  if (process.env.NODE_ENV === "development") {
    // console.log(`[ECONOMY API] DEBIT | Faction: ${factionId} | Amount: -${amount} | Source: ${source}`);
  }

  state.ecs.factionGoldBalance[factionId] = Math.max(0, state.ecs.factionGoldBalance[factionId] - amount);
}

export function tryDebitGold(state: GameState, kingdomId: string, amount: number, source: string): boolean {
  if (amount <= 0 || !isFinite(amount)) return true; // Custo zero sempre tem sucesso
  const factionId = getFactionId(kingdomId);
  if (factionId === -1 || !state.ecs) return false;

  if (state.ecs.factionGoldBalance[factionId] >= amount) {
    if (process.env.NODE_ENV === "development") {
      // console.log(`[ECONOMY API] TRY_DEBIT SUCCESS | Faction: ${factionId} | Amount: -${amount} | Source: ${source}`);
    }
    state.ecs.factionGoldBalance[factionId] -= amount;
    return true;
  }
  
  if (process.env.NODE_ENV === "development") {
    // console.log(`[ECONOMY API] TRY_DEBIT FAILED | Faction: ${factionId} | Amount: -${amount} | Source: ${source}`);
  }
  return false;
}
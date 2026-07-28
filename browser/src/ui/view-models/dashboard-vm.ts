import { ResourceType } from "../../core/models/enums";
import type { GameState, KingdomState } from "../../core/models/game-state";

export interface DashboardViewModel {
  kingdomName: string;
  tick: number;
  resources: Record<ResourceType, number>;
  stability: number;
  legitimacy: number;
  activeWars: number;
  eventCount: number;
}

export function toDashboardViewModel(state: GameState, playerKingdom: KingdomState): DashboardViewModel {
  return {
    kingdomName: playerKingdom.name,
    tick: state.meta.tick,
    resources: playerKingdom.economy.stock,
    stability: playerKingdom.stability,
    legitimacy: playerKingdom.legitimacy,
    activeWars: Object.keys(state.wars).length,
    eventCount: state.events.length
  };
}

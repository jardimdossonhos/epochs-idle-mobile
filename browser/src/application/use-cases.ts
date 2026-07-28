import type { SaveSlotId } from "../core/contracts/game-ports";
import type { GameState, KingdomState } from "../core/models/game-state";
import type { KingdomId } from "../core/models/types";

export interface NewCampaignRequest {
  campaignId: string;
  playerKingdomId: KingdomId;
  difficulty: "normal" | "hard" | "very_hard";
}

export interface PlayerCommand {
  commandType: string;
  actorKingdomId: KingdomId;
  payload: Record<string, unknown>;
}

export interface ApplicationUseCases {
  startCampaign(request: NewCampaignRequest): Promise<GameState>;
  processTick(deltaMs: number): Promise<GameState>;
  applyPlayerCommand(command: PlayerCommand): Promise<GameState>;
  saveManual(): Promise<void>;
  saveSafety(reason: string): Promise<void>;
  loadSlot(slotId: SaveSlotId): Promise<GameState>;
  getPlayerKingdom(state: GameState): KingdomState;
}

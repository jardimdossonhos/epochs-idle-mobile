import type { SaveSlotId, SaveSummary } from "../../core/contracts/game-ports";
import { ResourceType } from "../../core/models/enums";
import type { GameState } from "../../core/models/game-state";

export function buildSaveSummary(slotId: SaveSlotId, state: GameState, savedAt = Date.now()): SaveSummary {
  const player = Object.values(state.kingdoms).find((kingdom) => kingdom.isPlayer);

  if (!player) {
    throw new Error("Player kingdom not found while building save summary.");
  }

  const territoryCount = Object.values(state.world.regions).filter((region) => region.ownerId === player.id).length;

  const militaryPower = player.military.armies.reduce((sum, army) => sum + army.manpower * army.quality, 0);
  const economyPower =
    player.economy.stock[ResourceType.Gold] +
    player.economy.stock[ResourceType.Food] * 0.2 +
    player.economy.stock[ResourceType.Iron] * 0.8 +
    player.economy.stock[ResourceType.Wood] * 0.4;

  return {
    slotId,
    savedAt,
    campaignName: state.campaign.name,
    playerKingdomName: player.name,
    tick: state.meta.tick,
    territoryCount,
    militaryPower: Math.round(militaryPower),
    economyPower: Math.round(economyPower),
    victoryAchieved: state.victory.achievedPath !== null
  };
}

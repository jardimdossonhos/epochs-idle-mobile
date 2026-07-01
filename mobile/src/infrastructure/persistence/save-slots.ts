export type SaveSlotId = `auto-${number}` | "manual-1" | "manual-2" | "manual-3" | "safety-1";

export const MANUAL_SLOT_ID: SaveSlotId = "manual-1";
export const MANUAL_SLOT_2: SaveSlotId = "manual-2";
export const MANUAL_SLOT_3: SaveSlotId = "manual-3";
export const AUTOSAVE_SLOT_ID: SaveSlotId = "auto-1";

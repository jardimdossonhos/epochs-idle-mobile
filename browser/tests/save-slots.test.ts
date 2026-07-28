import { describe, expect, it } from "vitest";
import { AUTOSAVE_SLOT_ID, MANUAL_SLOT_ID } from "../src/infrastructure/persistence/save-slots";

describe("save slots", () => {
  it("defines constant slot ids", () => {
    expect(AUTOSAVE_SLOT_ID).toBe("auto-1");
    expect(MANUAL_SLOT_ID).toBe("manual-1");
  });
});
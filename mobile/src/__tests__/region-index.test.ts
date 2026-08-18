import { getRegionIndex, TOTAL_HEXES } from "../core/simulation/systems/utils";

describe("getRegionIndex", () => {
  it("should return correct canonical index for valid region IDs", () => {
    expect(getRegionIndex("r_hex_0")).toBe(0);
    expect(getRegionIndex("r_hex_1")).toBe(1);
    expect(getRegionIndex("r_hex_10")).toBe(10);
    expect(getRegionIndex("r_hex_69429")).toBe(69429);
    expect(getRegionIndex(`r_hex_${TOTAL_HEXES - 1}`)).toBe(TOTAL_HEXES - 1);
  });

  it("should return -1 for malformed, invalid, or out-of-bounds IDs", () => {
    // Malformed prefix/suffix
    expect(getRegionIndex("r_hex_x")).toBe(-1);
    expect(getRegionIndex("abc")).toBe(-1);
    expect(getRegionIndex("r_hex_")).toBe(-1);
    expect(getRegionIndex("r_hex_69429_extra")).toBe(-1);

    // Out of bounds / negative
    expect(getRegionIndex("r_hex_-1")).toBe(-1);
    expect(getRegionIndex(`r_hex_${TOTAL_HEXES}`)).toBe(-1);
    expect(getRegionIndex(`r_hex_${TOTAL_HEXES + 100}`)).toBe(-1);

    // Empty / nullish
    expect(getRegionIndex("")).toBe(-1);
    expect(getRegionIndex(undefined as any)).toBe(-1);
    expect(getRegionIndex(null as any)).toBe(-1);
  });
});

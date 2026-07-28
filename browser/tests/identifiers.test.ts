import { describe, expect, it } from "vitest";
import { TreatyType } from "../src/core/models/enums";
import { buildTreatyId, buildWarId, canonicalPairId } from "../src/core/models/identifiers";

describe("identifiers", () => {
  it("canonicalizes bilateral pair ids", () => {
    expect(canonicalPairId("k_zeta", "k_alpha")).toBe("k_alpha__k_zeta");
    expect(canonicalPairId("k_alpha", "k_zeta")).toBe("k_alpha__k_zeta");
  });

  it("creates stable war and treaty ids for mirrored inputs", () => {
    expect(buildWarId("k_rival_east", "k_player", 12)).toBe(buildWarId("k_player", "k_rival_east", 12));

    const leftToRight = buildTreatyId(TreatyType.Peace, ["k_rival_east", "k_player"], 1000);
    const rightToLeft = buildTreatyId(TreatyType.Peace, ["k_player", "k_rival_east"], 1000);
    expect(leftToRight).toBe(rightToLeft);
  });
});

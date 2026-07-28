import { describe, expect, it } from "vitest";
import { hashDeterministic, stableStringify } from "../src/core/utils/stable-hash";

describe("stable hash", () => {
  it("serializes object keys deterministically", () => {
    const left = {
      b: 2,
      a: {
        y: [3, 2, 1],
        x: "v"
      }
    };

    const right = {
      a: {
        x: "v",
        y: [3, 2, 1]
      },
      b: 2
    };

    expect(stableStringify(left)).toBe(stableStringify(right));
    expect(hashDeterministic(left)).toBe(hashDeterministic(right));
  });
});
